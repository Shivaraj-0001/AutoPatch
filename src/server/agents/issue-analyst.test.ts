import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IssueAnalystAgent, type IssueAnalystInput } from './issue-analyst';
import * as aiProvider from '../services/ai-provider';
import type { IssueAnalysis } from '../schemas/agent-outputs';

describe('IssueAnalystAgent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct agent metadata', () => {
    const agent = new IssueAnalystAgent();
    expect(agent.name).toBe('issue-analyst');
    expect(agent.displayName).toBe('Issue Analyst');
    expect(agent.description).toContain('Analyzes GitHub issues');
  });

  it('assembles user prompt with all issue details', () => {
    const agent = new IssueAnalystAgent();
    const input: IssueAnalystInput = {
      title: 'Fix memory leak in websocket server',
      body: 'Connections are not closed properly on disconnect.',
      labels: ['bug', 'performance'],
      repoLanguage: 'TypeScript',
      comments: [
        { author: 'alice', body: 'I noticed this on v1.2 as well.' },
      ],
    };

    // Access protected method for prompt validation
    const userPrompt = (agent as any).getUserPrompt(input);

    expect(userPrompt).toContain('**Title:** Fix memory leak in websocket server');
    expect(userPrompt).toContain('**Description:**\nConnections are not closed properly on disconnect.');
    expect(userPrompt).toContain('**Labels:** bug, performance');
    expect(userPrompt).toContain('**Repository language:** TypeScript');
    expect(userPrompt).toContain('**Comments:**');
    expect(userPrompt).toContain('- @alice: I noticed this on v1.2 as well.');
  });

  it('handles empty descriptions and absence of labels or comments gracefully', () => {
    const agent = new IssueAnalystAgent();
    const input: IssueAnalystInput = {
      title: 'Quick fix',
      body: '',
      labels: [],
      repoLanguage: null,
      comments: [],
    };

    const userPrompt = (agent as any).getUserPrompt(input);

    expect(userPrompt).toContain('**Title:** Quick fix');
    expect(userPrompt).toContain('**Description:**\n(No description provided)');
    expect(userPrompt).not.toContain('**Labels:**');
    expect(userPrompt).not.toContain('**Repository language:**');
    expect(userPrompt).not.toContain('**Comments:**');
  });

  it('truncates lengthy comments to 500 characters in the user prompt', () => {
    const agent = new IssueAnalystAgent();
    const longComment = 'a'.repeat(700);
    const input: IssueAnalystInput = {
      title: 'Title',
      body: 'Body',
      labels: [],
      repoLanguage: 'Go',
      comments: [{ author: 'bob', body: longComment }],
    };

    const userPrompt = (agent as any).getUserPrompt(input);
    expect(userPrompt).toContain(`- @bob: ${'a'.repeat(500)}`);
    expect(userPrompt).not.toContain('a'.repeat(501));
  });

  it('executes analysis and parses output matching IssueAnalysisSchema', async () => {
    const agent = new IssueAnalystAgent();

    const mockAnalysis: IssueAnalysis = {
      summary: 'Memory leak in websocket connections',
      problemStatement: 'Websocket client sockets remain open after disconnect',
      expectedBehavior: 'Sockets must be cleaned up and destroyed on disconnect',
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Socket close handler is registered', inferred: false },
        { id: 'AC-2', description: 'Test verifies socket pool size reaches zero', inferred: true },
      ],
      constraints: ['Must support Node 18+'],
      ambiguities: ['Whether reconnect attempts are automatic'],
      verificationRequirements: ['Run vitest websocket suite'],
    };

    const completionSpy = vi
      .spyOn(aiProvider, 'chatCompletionWithSchema')
      .mockResolvedValue({
        result: mockAnalysis,
        model: 'qwen-2.5-coder',
        provider: 'groq',
        usage: {
          promptTokens: 100,
          completionTokens: 80,
          totalTokens: 180,
        },
      });

    const result = await agent.execute({
      title: 'Websocket leak',
      body: 'Socket stays open',
      labels: ['bug'],
      repoLanguage: 'TypeScript',
      comments: [],
    });

    expect(completionSpy).toHaveBeenCalledTimes(1);
    expect(result.output).toEqual(mockAnalysis);
    expect(result.model).toBe('qwen-2.5-coder');
    expect(result.provider).toBe('groq');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
