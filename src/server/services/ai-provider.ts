import OpenAI from 'openai';
import { config } from '../config';
import type { ZodType } from 'zod';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface CompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
  model: string;
  provider: string;
}

// ─── AI Provider ────────────────────────────────────────────────────────────

export class AiProviderError extends Error {
  constructor(
    message: string,
    public code: 'configuration' | 'rate-limit' | 'timeout' | 'model-error' | 'parse-error' | 'unknown',
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}

export interface KeyUsageRecord {
  timestamp: number;
  tokens: number;
}

export interface KeySlot {
  key: string;
  client: OpenAI;
  usageHistory: KeyUsageRecord[];
  cooldownUntil: number;
  lastUsedAt: number;
}

export function maskKey(key: string): string {
  const trimmed = (key || '').trim();
  if (trimmed.length <= 8) return '***';
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

export function parseCooldownMs(error: unknown): number {
  if (error instanceof OpenAI.APIError || error instanceof Error) {
    const msg = error.message;
    const match = msg.match(/try again in (\d+(?:\.\d+)?)\s*(s|ms|m)?/i);
    if (match) {
      const val = parseFloat(match[1]);
      const unit = (match[2] || 's').toLowerCase();
      if (unit === 's') return Math.ceil(val * 1000) + 1000;
      if (unit === 'ms') return Math.ceil(val) + 500;
      if (unit === 'm') return Math.ceil(val * 60 * 1000) + 1000;
    }
  }
  return 15_000;
}

export function isRateLimitError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429) return true;
    if (
      error.status === 413 &&
      /tpm|tokens per minute|rate limit|please reduce|limit 8000/i.test(error.message)
    ) {
      return true;
    }
  }
  if (error instanceof Error && /429|rate limit|tpm limit|tokens per minute/i.test(error.message)) {
    return true;
  }
  return false;
}

export class ApiKeyPool {
  private slots: KeySlot[] = [];
  private cachedBaseUrl: string = '';
  // Groq free tier limit is 8,000 tokens per minute (TPM)
  public readonly tpmLimit: number;
  public readonly windowMs: number = 60_000;

  constructor(
    private getKeys: () => string[] = () => config.ai.apiKeys,
    private getBaseUrl: () => string = () => config.ai.baseUrl,
    tpmLimit: number = 8000,
  ) {
    this.tpmLimit = tpmLimit;
  }

  public getSlots(): KeySlot[] {
    const keys = this.getKeys();
    const baseUrl = this.getBaseUrl();

    const currentKeys = this.slots.map((s) => s.key);
    const keysMatch =
      keys.length === currentKeys.length &&
      keys.every((k, i) => k === currentKeys[i]);

    if (!keysMatch || this.cachedBaseUrl !== baseUrl) {
      this.cachedBaseUrl = baseUrl;
      const oldSlotMap = new Map<string, KeySlot>();
      for (const slot of this.slots) {
        oldSlotMap.set(slot.key, slot);
      }

      this.slots = keys.map((key) => {
        const existing = oldSlotMap.get(key);
        return {
          key,
          client: new OpenAI({
            baseURL: baseUrl,
            apiKey: key,
          }),
          usageHistory: existing ? existing.usageHistory : [],
          cooldownUntil: existing ? existing.cooldownUntil : 0,
          lastUsedAt: existing ? existing.lastUsedAt : 0,
        };
      });
    }

    return this.slots;
  }

  public pruneSlot(slot: KeySlot, now: number = Date.now()): number {
    const cutoff = now - this.windowMs;
    slot.usageHistory = slot.usageHistory.filter((h) => h.timestamp > cutoff);
    return slot.usageHistory.reduce((sum, h) => sum + h.tokens, 0);
  }

  public recordUsage(key: string, tokens: number): void {
    const slots = this.getSlots();
    const slot = slots.find((s) => s.key === key);
    if (!slot) return;
    const now = Date.now();
    slot.usageHistory.push({ timestamp: now, tokens });
    slot.lastUsedAt = now;
  }

  public markCooldown(key: string, durationMs: number): void {
    const slots = this.getSlots();
    const slot = slots.find((s) => s.key === key);
    if (!slot) return;
    const now = Date.now();
    slot.cooldownUntil = Math.max(slot.cooldownUntil, now + durationMs);
    // Mark capacity as consumed in the sliding window
    slot.usageHistory.push({ timestamp: now, tokens: this.tpmLimit });
  }

  public calculateWaitUntilAvailable(slot: KeySlot, neededTokens: number, now: number = Date.now()): number {
    this.pruneSlot(slot, now);
    let waitMs = 0;
    if (slot.cooldownUntil > now) {
      waitMs = Math.max(waitMs, slot.cooldownUntil - now);
    }

    let currentTokens = slot.usageHistory.reduce((acc, h) => acc + h.tokens, 0);
    if (currentTokens + neededTokens <= this.tpmLimit) {
      return waitMs;
    }

    // Determine when enough tokens roll out of the 60s sliding window
    const sorted = [...slot.usageHistory].sort((a, b) => a.timestamp - b.timestamp);
    if (sorted.length > 0) {
      for (const record of sorted) {
        currentTokens -= record.tokens;
        const recordExpiryWait = Math.max(1, record.timestamp + this.windowMs - now);
        waitMs = Math.max(waitMs, recordExpiryWait);
        if (currentTokens + neededTokens <= this.tpmLimit) {
          break;
        }
      }
    } else {
      waitMs = Math.max(waitMs, 1000);
    }

    return waitMs;
  }

  public selectBestKey(
    estimatedTokens: number,
    excludeKeys: Set<string> = new Set(),
  ): { slot: KeySlot; waitMs: number } {
    const slots = this.getSlots();
    if (slots.length === 0) {
      throw new AiProviderError(
        'AI provider not configured. Set AI_BASE_URL and AI_API_KEYS in .env',
        'configuration',
      );
    }

    const now = Date.now();
    let candidateSlots = slots.filter((s) => !excludeKeys.has(s.key));
    if (candidateSlots.length === 0) {
      candidateSlots = slots;
    }

    // Filter candidate slots not in cooldown
    const nonCooldownSlots = candidateSlots.filter((slot) => {
      this.pruneSlot(slot, now);
      return slot.cooldownUntil <= now;
    });

    // Check which slots have enough TPM headroom for estimatedTokens
    const slotsWithHeadroom = nonCooldownSlots.filter((slot) => {
      const used = slot.usageHistory.reduce((sum, h) => sum + h.tokens, 0);
      return used + estimatedTokens <= this.tpmLimit;
    });

    if (slotsWithHeadroom.length > 0) {
      // Pick the key with the least tokens used in the current 60s window
      // Tie-breaker: least recently used
      slotsWithHeadroom.sort((a, b) => {
        const usageA = a.usageHistory.reduce((sum, h) => sum + h.tokens, 0);
        const usageB = b.usageHistory.reduce((sum, h) => sum + h.tokens, 0);
        if (usageA !== usageB) return usageA - usageB;
        return a.lastUsedAt - b.lastUsedAt;
      });

      return { slot: slotsWithHeadroom[0], waitMs: 0 };
    }

    // If no slot has immediate headroom, calculate wait time for each candidate slot
    let bestSlot = candidateSlots[0];
    let minWaitMs = Infinity;

    for (const slot of candidateSlots) {
      const wait = this.calculateWaitUntilAvailable(slot, estimatedTokens, now);
      if (wait < minWaitMs) {
        minWaitMs = wait;
        bestSlot = slot;
      }
    }

    return { slot: bestSlot, waitMs: minWaitMs };
  }

  public getPoolStatus(): { totalKeys: number; activeKeys: number; inCooldown: number } {
    const slots = this.getSlots();
    const now = Date.now();
    let inCooldown = 0;
    for (const slot of slots) {
      if (slot.cooldownUntil > now) inCooldown++;
    }
    return {
      totalKeys: slots.length,
      activeKeys: slots.length - inCooldown,
      inCooldown,
    };
  }

  public resetCooldowns(): void {
    for (const slot of this.slots) {
      slot.cooldownUntil = 0;
    }
  }
}

export const apiKeyPool = new ApiKeyPool();

/**
 * Call the AI model with chat completion across the pool of N API keys,
 * enforcing Groq's 8,000 TPM limit and rotating immediately on rate limits.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: CompletionOptions = {},
): Promise<CompletionResult> {
  const { temperature = 0.2, maxTokens = 4096, timeoutMs = 120_000, signal } = options;

  if (signal?.aborted) {
    throw new AiProviderError('AI request was aborted', 'timeout');
  }

  // Estimate prompt tokens (~3.8 characters per token)
  const totalChars = messages.reduce((acc, m) => acc + (m.content ? m.content.length : 0), 0);
  const estimatedPromptTokens = Math.ceil(totalChars / 3.8);

  // Groq's free tier has an 8,000 TPM limit.
  // Ensure promptTokens + activeMaxTokens does not exceed 7,800 to avoid pre-flight 413 rejection.
  const maxSafeTokens = Math.max(1024, 7800 - estimatedPromptTokens);
  let activeMaxTokens = Math.min(maxTokens, maxSafeTokens);
  const estimatedTotalTokens = estimatedPromptTokens + activeMaxTokens;

  const totalKeys = apiKeyPool.getSlots().length;
  // Allow enough attempts to cycle through all N keys plus retries
  const maxAttempts = Math.max(5, totalKeys * 2);
  const triedKeysInRequest = new Set<string>();
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new AiProviderError('AI request was aborted', 'timeout');
    }

    const { slot, waitMs } = apiKeyPool.selectBestKey(estimatedTotalTokens, triedKeysInRequest);

    if (waitMs > 0) {
      // If we must wait, clamp waitMs to reasonable pacing (max 20s per step)
      const clampedWait = Math.min(waitMs, 20_000);
      console.warn(
        `[AI Provider] Pacing request for token replenishment (${Math.round(clampedWait / 1000)}s)...`,
      );
      await new Promise((r) => setTimeout(r, clampedWait));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const onSignalAbort = () => controller.abort();
    if (signal) {
      signal.addEventListener('abort', onSignalAbort, { once: true });
    }

    try {
      const response = await slot.client.chat.completions.create(
        {
          model: config.ai.model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          temperature,
          max_tokens: activeMaxTokens,
        },
        { signal: controller.signal as never },
      );

      const choice = response.choices?.[0];
      if (!choice?.message?.content) {
        throw new AiProviderError('Empty response from model', 'model-error');
      }

      if (choice.finish_reason === 'length') {
        console.warn(
          `[AI Provider] Warning: Model response reached max_tokens limit (${activeMaxTokens}). Output was likely truncated.`,
        );
      }

      // Record successful usage
      const totalTokens = response.usage?.total_tokens || estimatedTotalTokens;
      apiKeyPool.recordUsage(slot.key, totalTokens);

      return {
        content: choice.message.content,
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens || 0,
              completionTokens: response.usage.completion_tokens || 0,
              totalTokens: response.usage.total_tokens || 0,
            }
          : null,
        model: response.model || config.ai.model,
        provider: config.ai.provider,
      };
    } catch (error) {
      lastError = error;

      if (isRateLimitError(error)) {
        const cooldownMs = parseCooldownMs(error);
        apiKeyPool.markCooldown(slot.key, cooldownMs);
        triedKeysInRequest.add(slot.key);

        console.warn(
          `[AI Provider] Key ${maskKey(slot.key)} hit rate limit. Cooling down for ${Math.round(cooldownMs / 1000)}s. Attempt ${attempt + 1}/${maxAttempts}. Rotating key...`,
        );

        // Reduce activeMaxTokens slightly if request was large
        activeMaxTokens = Math.min(activeMaxTokens, 2500);

        // If we haven't tried all keys yet, rotate immediately without sleeping!
        if (triedKeysInRequest.size < totalKeys) {
          continue;
        }

        // If all keys have been tried, reset tried keys set so any refreshed key can be used
        triedKeysInRequest.clear();
        continue;
      }

      // Non-rate-limit errors break out of retry loop
      break;
    } finally {
      clearTimeout(timeout);
      if (signal) {
        signal.removeEventListener('abort', onSignalAbort);
      }
    }
  }

  if (lastError instanceof AiProviderError) throw lastError;

  if (signal?.aborted || (lastError as Error)?.name === 'AbortError') {
    throw new AiProviderError(
      signal?.aborted
        ? 'AI request was aborted'
        : `AI request timed out after ${timeoutMs / 1000}s`,
      'timeout',
    );
  }

  if (lastError instanceof OpenAI.APIError) {
    if (lastError.status === 429) {
      throw new AiProviderError(
        `Rate limited by AI provider. ${lastError.message}`,
        'rate-limit',
      );
    }
    if (lastError.status === 401 || lastError.status === 403) {
      throw new AiProviderError(
        `Authentication failed with AI provider. Check your AI_API_KEYS.`,
        'configuration',
      );
    }
    throw new AiProviderError(
      `AI provider error: ${lastError.message}`,
      'model-error',
    );
  }

  throw new AiProviderError(
    `AI provider error: ${(lastError as Error)?.message || 'Unknown error'}`,
    'unknown',
  );
}

/**
 * Sanitize raw/unescaped control characters inside JSON string literals
 * (e.g. literal newlines/tabs inside diff or code properties).
 */
function sanitizeJsonString(str: string): string {
  let result = '';
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        result += char;
      } else if (char === '\\') {
        isEscaped = true;
        result += char;
      } else if (char === '"') {
        inString = false;
        result += char;
      } else if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      if (char === '"') {
        inString = true;
      }
      result += char;
    }
  }
  return result;
}

/**
 * Extract the outermost balanced JSON object ({...}) or array ([...])
 * while properly ignoring curly braces and brackets that appear inside string literals.
 */
function extractBalancedJson(text: string): string {
  const objStart = text.indexOf('{');
  const arrStart = text.indexOf('[');

  let start = -1;
  if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
    start = objStart;
  } else if (arrStart >= 0) {
    start = arrStart;
  }

  if (start < 0) return text.trim();

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
      // Critical: Ignore all { } [ ] inside string literals
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{' || char === '[') {
      depth++;
    } else if (char === '}' || char === ']') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return text.slice(start);
}

/**
 * Attempt to repair common JSON defects from LLMs:
 * 1. Unescaped control characters in strings
 * 2. Trailing commas before } or ]
 * 3. Truncated output (unclosed quotes or open bracket stack)
 */
function repairJson(jsonStr: string): string {
  // 1. Direct parse test
  try {
    JSON.parse(jsonStr);
    return jsonStr;
  } catch {}

  // 2. Sanitize unescaped newlines/tabs inside strings
  const sanitized = sanitizeJsonString(jsonStr);
  try {
    JSON.parse(sanitized);
    return sanitized;
  } catch {}

  // 3. Strip trailing commas before } or ] outside strings
  let inString = false;
  let isEscaped = false;
  let cleaned = '';
  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    if (inString) {
      if (isEscaped) isEscaped = false;
      else if (char === '\\') isEscaped = true;
      else if (char === '"') inString = false;
      cleaned += char;
    } else {
      if (char === '"') inString = true;
      cleaned += char;
    }
  }
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {}

  // 4. Truncation repair: balance unclosed strings and bracket stack
  inString = false;
  isEscaped = false;
  const stack: string[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (inString) {
      if (isEscaped) isEscaped = false;
      else if (char === '\\') isEscaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') stack.push('}');
    else if (char === '[') stack.push(']');
    else if (char === '}' || char === ']') stack.pop();
  }

  let repaired = cleaned;
  if (inString) repaired += '"';
  repaired = repaired.trimEnd().replace(/;+$/, '').replace(/,\s*$/, '');
  while (stack.length > 0) {
    repaired += stack.pop();
  }
  repaired = repaired.trimEnd().replace(/;+$/, '');

  try {
    JSON.parse(repaired);
    return repaired;
  } catch {}

  return jsonStr;
}

/**
 * Extract JSON from a model response that may contain markdown fences or extra text.
 */
export function extractJson(text: string): string {
  const trimmed = text.trim();

  // Fast path: if the text is already valid JSON
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {}

  // Check for markdown code fences (outermost fence)
  const firstFence = trimmed.indexOf('```');
  const lastFence = trimmed.lastIndexOf('```');
  if (firstFence !== -1 && lastFence > firstFence) {
    const afterFirst = trimmed.indexOf('\n', firstFence);
    if (afterFirst !== -1 && afterFirst < lastFence) {
      const insideFence = trimmed.slice(afterFirst + 1, lastFence).trim();
      try {
        JSON.parse(insideFence);
        return insideFence;
      } catch {
        const balancedInside = extractBalancedJson(insideFence);
        const repaired = repairJson(balancedInside);
        try {
          JSON.parse(repaired);
          return repaired;
        } catch {}
      }
    }
  }

  // Extract string-aware balanced JSON and repair if needed
  const balanced = extractBalancedJson(trimmed);
  return repairJson(balanced);
}

/**
 * Call the AI model, extract and validate JSON output.
 * Retries on parse failure with detailed error context.
 */
export async function chatCompletionWithSchema<T>(
  messages: ChatMessage[],
  schema: ZodType<T, any, any>,
  options: CompletionOptions = {},
): Promise<{ result: T; usage: CompletionResult['usage']; model: string; provider: string }> {
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await chatCompletion(messages, {
      ...options,
      maxTokens: options.maxTokens || 4096,
    });

    try {
      const jsonStr = extractJson(response.content);
      const parsed = JSON.parse(jsonStr);
      const validated = schema.parse(parsed);

      return {
        result: validated,
        usage: response.usage,
        model: response.model,
        provider: response.provider,
      };
    } catch (parseError) {
      lastError = parseError as Error;
      console.warn(
        `[AI Provider] Schema validation or JSON parse attempt ${attempt + 1}/${maxAttempts} failed:`,
        (parseError as Error).message,
      );

      if (attempt < maxAttempts - 1) {
        messages = [
          ...messages,
          { role: 'assistant', content: response.content },
          {
            role: 'user',
            content: `Your previous response could not be parsed as valid JSON or did not match the schema. Error: ${(parseError as Error).message}. Please respond with ONLY valid JSON matching the requested schema. Ensure all strings with quotes or newlines are properly escaped and that all braces and quotes are properly closed. Do not include any text before or after the JSON.`,
          },
        ];
      }
    }
  }

  throw new AiProviderError(
    `Failed to get valid JSON from model after ${maxAttempts} attempts: ${lastError?.message}`,
    'parse-error',
  );
}

