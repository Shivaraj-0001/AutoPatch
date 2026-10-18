import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { BaseAgent } from './base';
import * as aiProvider from '../services/ai-provider';
import type { AgentName } from '../schemas/workflow';

interface TestInput {
  name: string;
}

interface TestOutput {
  greeting: string;
}

const testSchema = z.object({
  greeting: z.string(),
});

class ConcreteTestAgent extends BaseAgent<TestInput, TestOutput> {
  readonly name: AgentName = 'issue-analyst';
  readonly displayName = 'Test Agent';
  readonly description = 'An agent used for base unit testing';
  protected readonly outputSchema = testSchema;

  protected getSystemPrompt(): string {
    return 'You are a test assistant.';
  }

  protected getUserPrompt(input: TestInput): string {
    return `Hello, ${input.name}!`;
  }
}

describe('BaseAgent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs prompts and executes completion with schema validation', async () => {
    const agent = new ConcreteTestAgent();

    const mockResponse = {
      result: { greeting: 'Hello, World!' },
      model: 'qwen-2.5-coder',
      provider: 'groq',
      usage: {
        promptTokens: 15,
        completionTokens: 8,
        totalTokens: 23,
      },
    };

    const completionSpy = vi
      .spyOn(aiProvider, 'chatCompletionWithSchema')
      .mockResolvedValue(mockResponse);

    const result = await agent.execute({ name: 'World' });

    expect(completionSpy).toHaveBeenCalledTimes(1);
    expect(completionSpy).toHaveBeenCalledWith(
      [
        { role: 'system', content: 'You are a test assistant.' },
        { role: 'user', content: 'Hello, World!' },
      ],
      testSchema,
      expect.objectContaining({
        temperature: 0.2,
        maxTokens: 4096,
        timeoutMs: 120_000,
      }),
    );

    expect(result).toEqual({
      output: { greeting: 'Hello, World!' },
      model: 'qwen-2.5-coder',
      provider: 'groq',
      durationMs: expect.any(Number),
      usage: {
        promptTokens: 15,
        completionTokens: 8,
        totalTokens: 23,
      },
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('passes cancellation signal when provided in options', async () => {
    const agent = new ConcreteTestAgent();
    const controller = new AbortController();

    const completionSpy = vi
      .spyOn(aiProvider, 'chatCompletionWithSchema')
      .mockResolvedValue({
        result: { greeting: 'Hi' },
        model: 'model',
        provider: 'groq',
        usage: null,
      });

    await agent.execute({ name: 'CancelTest' }, { signal: controller.signal });

    expect(completionSpy).toHaveBeenCalledWith(
      expect.any(Array),
      testSchema,
      expect.objectContaining({
        signal: controller.signal,
      }),
    );
  });

  it('invokes lifecycle hooks and respects custom buildMessages override', async () => {
    const beforeHook = vi.fn();
    const afterHook = vi.fn();

    class CustomAgent extends ConcreteTestAgent {
      protected onBeforeExecute(input: TestInput): void {
        beforeHook(input);
      }

      protected onAfterExecute(result: any): void {
        afterHook(result);
      }

      protected buildMessages(input: TestInput) {
        return [
          { role: 'system' as const, content: 'Custom system prompt' },
          { role: 'user' as const, content: `Custom user: ${input.name}` },
        ];
      }
    }

    vi.spyOn(aiProvider, 'chatCompletionWithSchema').mockResolvedValue({
      result: { greeting: 'Custom greeting' },
      model: 'custom-model',
      provider: 'custom-provider',
      usage: null,
    });

    const agent = new CustomAgent();
    const res = await agent.execute({ name: 'AgentHook' });

    expect(beforeHook).toHaveBeenCalledWith({ name: 'AgentHook' });
    expect(afterHook).toHaveBeenCalledWith(res);
    expect(res.output.greeting).toBe('Custom greeting');
  });

  it('propagates errors thrown during completion or schema parsing', async () => {
    const agent = new ConcreteTestAgent();

    vi.spyOn(aiProvider, 'chatCompletionWithSchema').mockRejectedValue(
      new Error('Model execution failed'),
    );

    await expect(agent.execute({ name: 'Fail' })).rejects.toThrow('Model execution failed');
  });
});
