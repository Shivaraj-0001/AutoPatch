import { describe, it, expect } from 'vitest';
import { extractJson, ApiKeyPool, maskKey, parseCooldownMs } from './ai-provider';

describe('extractJson', () => {
  it('correctly handles unified diffs with curly braces inside strings without premature truncation', () => {
    // This is the exact scenario that caused Step 4 Coding Agent to fail:
    // Curly braces inside a patch/diff string caused naive bracket-counting extractors
    // to decrement depth to 0 prematurely and slice the text mid-string.
    const payload = {
      changeSummary: 'Fix authentication check and cleanup handlers',
      filesChanged: [{ path: 'src/auth.ts', action: 'modify' }],
      patch: `--- a/src/auth.ts\n+++ b/src/auth.ts\n@@ -10,12 +10,6 @@\n export function verify(token: string) {\n-  if (!token) {\n-    return false;\n-  }\n-  return true;\n+  return Boolean(token);\n }`,
      testsAdded: [
        {
          path: 'tests/auth.test.ts',
          description: 'Tests token verification',
          content: 'describe("auth", () => {\n  it("verifies", () => {\n    expect(verify("abc")).toBe(true);\n  });\n});',
        },
      ],
      assumptions: ['Token is a JWT string'],
      limitations: [],
    };

    const serialized = JSON.stringify(payload, null, 2);
    const extracted = extractJson(serialized);
    const parsed = JSON.parse(extracted);

    expect(parsed.changeSummary).toBe(payload.changeSummary);
    expect(parsed.patch).toBe(payload.patch);
    expect(parsed.testsAdded[0].content).toBe(payload.testsAdded[0].content);
  });

  it('extracts JSON from markdown code fences even when diffs contain fences or comments', () => {
    const raw = `Here is the requested unified diff patch:\n\`\`\`json\n{\n  "changeSummary": "Add markdown support",\n  "patch": "--- a/readme.md\\n+++ b/readme.md\\n@@ -1,3 +1,3 @@\\n-\`\`\`\\n+\`\`\`ts\\n"\n}\n\`\`\`\nHope this helps!`;
    const extracted = extractJson(raw);
    const parsed = JSON.parse(extracted);

    expect(parsed.changeSummary).toBe('Add markdown support');
    expect(parsed.patch).toContain('```ts');
  });

  it('sanitizes unescaped control characters in string literals', () => {
    const rawWithLiteralNewlines = '{\n  "patch": "line1\nline2 with } closing brace"\n}';
    const extracted = extractJson(rawWithLiteralNewlines);
    const parsed = JSON.parse(extracted);

    expect(parsed.patch).toBe('line1\nline2 with } closing brace');
  });

  it('repairs truncated JSON where the string and brackets are left open', () => {
    const truncated = '{"changeSummary": "Fix bug", "patch": "diff --git a/index.ts b/index.ts\\n@@ -1,3 +1,3 @@\\n+console.log({ a: 1 })';
    const extracted = extractJson(truncated);
    const parsed = JSON.parse(extracted);

    expect(parsed.changeSummary).toBe('Fix bug');
    expect(parsed.patch).toContain('console.log');
  });

  it('strips trailing commas in objects and arrays', () => {
    const withTrailingCommas = '{\n  "items": [1, 2, ],\n  "summary": "done",\n}';
    const extracted = extractJson(withTrailingCommas);
    const parsed = JSON.parse(extracted);

    expect(parsed.items).toEqual([1, 2]);
    expect(parsed.summary).toBe('done');
  });
});

describe('ApiKeyPool & Multi-Key Rate Limiting', () => {
  const keys = ['test_key_alpha_111111111', 'test_key_beta_222222222', 'test_key_gamma_333333333'];

  it('initializes slots for N keys correctly', () => {
    const pool = new ApiKeyPool(() => keys, () => 'https://api.groq.com/openai/v1', 8000);
    const slots = pool.getSlots();

    expect(slots.length).toBe(3);
    expect(slots[0].key).toBe(keys[0]);
    expect(slots[1].key).toBe(keys[1]);
    expect(slots[2].key).toBe(keys[2]);
  });

  it('distributes requests across keys to avoid hitting the 8k TPM limit', () => {
    const pool = new ApiKeyPool(() => keys, () => 'https://api.groq.com/openai/v1', 8000);

    // Initial call: all keys have 0 tokens used, selects key alpha
    const sel1 = pool.selectBestKey(2500);
    expect(sel1.slot.key).toBe(keys[0]);
    expect(sel1.waitMs).toBe(0);
    pool.recordUsage(keys[0], 2500);

    // Next call: key beta has 0 tokens used vs key alpha with 2500, selects key beta
    const sel2 = pool.selectBestKey(3000);
    expect(sel2.slot.key).toBe(keys[1]);
    expect(sel2.waitMs).toBe(0);
    pool.recordUsage(keys[1], 3000);

    // Third call: key gamma has 0 tokens used, selects key gamma
    const sel3 = pool.selectBestKey(3000);
    expect(sel3.slot.key).toBe(keys[2]);
    expect(sel3.waitMs).toBe(0);
    pool.recordUsage(keys[2], 3000);

    // Fourth call: key alpha has 2500 used (headroom 5500), key beta & gamma have 3000 used.
    // Selects key alpha
    const sel4 = pool.selectBestKey(2000);
    expect(sel4.slot.key).toBe(keys[0]);
    expect(sel4.waitMs).toBe(0);
  });

  it('rotates immediately to another key when one key is in cooldown or excluded', () => {
    const pool = new ApiKeyPool(() => keys, () => 'https://api.groq.com/openai/v1', 8000);

    // Mark key alpha in cooldown (simulating a 429 rate limit from Groq)
    pool.markCooldown(keys[0], 45_000);

    // Next selection must NOT pick key alpha; it should select key beta immediately with 0 wait
    const sel = pool.selectBestKey(2000);
    expect(sel.slot.key).toBe(keys[1]);
    expect(sel.waitMs).toBe(0);

    // When excluding key beta during an active request retry, it picks key gamma
    const selRetry = pool.selectBestKey(2000, new Set([keys[1]]));
    expect(selRetry.slot.key).toBe(keys[2]);
    expect(selRetry.waitMs).toBe(0);
  });

  it('enforces the 8,000 TPM limit and calculates wait time when capacity is exhausted', () => {
    const singleKey = ['test_only_one_key'];
    const pool = new ApiKeyPool(() => singleKey, () => 'https://api.groq.com/openai/v1', 8000);

    // Use 7000 out of 8000 tokens
    pool.recordUsage(singleKey[0], 7000);

    // Requesting 2000 tokens requires 7000 + 2000 = 9000 > 8000 TPM limit
    const sel = pool.selectBestKey(2000);
    expect(sel.slot.key).toBe(singleKey[0]);
    // Must wait for token window to roll out
    expect(sel.waitMs).toBeGreaterThan(0);
    expect(sel.waitMs).toBeLessThanOrEqual(60_000);
  });

  it('prunes history older than 60 seconds', () => {
    const pool = new ApiKeyPool(() => [keys[0]], () => 'https://api.groq.com/openai/v1', 8000);
    const slot = pool.getSlots()[0];

    const pastTimestamp = Date.now() - 65_000; // 65 seconds ago
    slot.usageHistory.push({ timestamp: pastTimestamp, tokens: 5000 });

    const used = pool.pruneSlot(slot, Date.now());
    expect(used).toBe(0);
    expect(slot.usageHistory.length).toBe(0);
  });

  it('masks sensitive API keys in logs', () => {
    expect(maskKey('test_secret_api_key_sample_1234567890')).toBe('test...7890');
    expect(maskKey('short')).toBe('***');
  });

  it('parses retry durations from rate limit error messages accurately', () => {
    expect(parseCooldownMs(new Error('Rate limit reached on TPM: Limit 8000. Please try again in 14.5s.'))).toBe(15500);
    expect(parseCooldownMs(new Error('Please try again in 800ms.'))).toBe(1300);
    expect(parseCooldownMs(new Error('Please try again in 2m.'))).toBe(121000);
    expect(parseCooldownMs(new Error('Generic 429'))).toBe(15000);
  });
});

