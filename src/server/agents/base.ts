import type { ZodType } from 'zod';
import type { ChatMessage, CompletionOptions } from '../services/ai-provider';
import { chatCompletionWithSchema } from '../services/ai-provider';
import type { AgentName } from '../schemas/workflow';

export type AgentInput = Record<string, unknown> | object;

export interface AgentResult<T> {
  output: T;
  model: string;
  provider: string;
  durationMs?: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
}

export abstract class BaseAgent<TInput extends object, TOutput> {
  abstract readonly name: AgentName;
  abstract readonly displayName: string;
  abstract readonly description: string;
  protected abstract readonly outputSchema: ZodType<TOutput, any, any>;

  protected abstract getSystemPrompt(): string;
  protected abstract getUserPrompt(input: TInput): string;

  /**
   * Hook called before prompt execution. Can be overridden for custom logging or metrics.
   */
  protected onBeforeExecute?(input: TInput): void;

  /**
   * Hook called after successful execution.
   */
  protected onAfterExecute?(result: AgentResult<TOutput>): void;

  /**
   * Build the chat messages array for completion.
   * Can be overridden by subclasses requiring multi-turn or dynamic message history.
   */
  protected buildMessages(input: TInput): ChatMessage[] {
    return [
      { role: 'system', content: this.getSystemPrompt() },
      { role: 'user', content: this.getUserPrompt(input) },
    ];
  }

  protected getCompletionOptions(): CompletionOptions {
    return {
      temperature: 0.2,
      maxTokens: 4096,
      timeoutMs: 120_000,
    };
  }

  async execute(input: TInput, options?: { signal?: AbortSignal }): Promise<AgentResult<TOutput>> {
    this.onBeforeExecute?.(input);
    const startTime = Date.now();

    const messages = this.buildMessages(input);

    const completionOptions: CompletionOptions = {
      ...this.getCompletionOptions(),
      ...(options?.signal ? { signal: options.signal } : {}),
    };

    const response = await chatCompletionWithSchema(
      messages,
      this.outputSchema,
      completionOptions,
    );

    const result: AgentResult<TOutput> = {
      output: response.result,
      model: response.model,
      provider: response.provider,
      usage: response.usage,
      durationMs: Date.now() - startTime,
    };

    this.onAfterExecute?.(result);

    return result;
  }
}
