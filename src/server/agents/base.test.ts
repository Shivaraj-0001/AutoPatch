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
      usage: {
        promptTokens: 15,
        completionTokens: 8,
        totalTokens: 23,
      },
    });
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

  it('propagates errors thrown during completion or schema parsing', async () => {
    const agent = new ConcreteTestAgent();

    vi.spyOn(aiProvider, 'chatCompletionWithSchema').mockRejectedValue(
      new Error('Model execution failed'),
    );

    await expect(agent.execute({ name: 'Fail' })).rejects.toThrow('Model execution failed');
  });
});
