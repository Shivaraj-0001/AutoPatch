import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RepositoryScoutAgent, type RepositoryScoutInput } from './repository-scout';
import * as aiProvider from '../services/ai-provider';
import type { RepositoryContext } from '../schemas/agent-outputs';

describe('RepositoryScoutAgent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sampleInput: RepositoryScoutInput = {
    issueSpecification: {
      summary: 'Fix rate limiter sliding window bug',
      problemStatement: 'Timestamps are not pruned properly after window expires',
      expectedBehavior: 'Expired timestamps should be evicted on acquire',
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Prune timestamps before checking limit', inferred: false },
        { id: 'AC-2', description: 'Concurrent calls respect capacity', inferred: true },
      ],
      constraints: ['No external Redis dependency'],
      ambiguities: [],
      verificationRequirements: ['Unit test with mock timers'],
    },
    repoOverview: {
      fullName: 'owner/rate-limiter',
      description: 'A TypeScript sliding window rate limiter',
      language: 'TypeScript',
      defaultBranch: 'main',
    },
    fileTree: 'src/\n  index.ts\n  limiter.ts\ntests/\n  limiter.test.ts',
    inspectedFiles: {
      'src/limiter.ts': 'export class RateLimiter { check() { return true; } }',
    },
  };

  it('has correct agent metadata and completion options', () => {
    const agent = new RepositoryScoutAgent();
    expect(agent.name).toBe('repository-scout');
    expect(agent.displayName).toBe('Repository Scout');
    expect(agent.description).toContain('Identifies relevant source files');

    const options = (agent as any).getCompletionOptions();
    expect(options.temperature).toBe(0.1);
    expect(options.maxTokens).toBe(4096);
    expect(options.timeoutMs).toBe(120_000);
  });

  it('assembles user prompt with repository overview, criteria, file tree, and inspected files', () => {
    const agent = new RepositoryScoutAgent();
    const prompt = (agent as any).getUserPrompt(sampleInput);

    expect(prompt).toContain('**Repository:** owner/rate-limiter');
    expect(prompt).toContain('**Language:** TypeScript');
    expect(prompt).toContain('**Description:** A TypeScript sliding window rate limiter');
    expect(prompt).toContain('**Issue Summary:** Fix rate limiter sliding window bug');
    expect(prompt).toContain('- [AC-1] Prune timestamps before checking limit');
    expect(prompt).toContain('- [AC-2] Concurrent calls respect capacity (inferred)');
    expect(prompt).toContain('src/\n  index.ts\n  limiter.ts');
    expect(prompt).toContain('--- src/limiter.ts ---');
    expect(prompt).toContain('export class RateLimiter');
  });

  it('handles empty inspected files and empty file tree safely', () => {
    const agent = new RepositoryScoutAgent();
    const minimalInput: RepositoryScoutInput = {
      ...sampleInput,
      fileTree: '',
      inspectedFiles: {},
    };

    const prompt = (agent as any).getUserPrompt(minimalInput);

    expect(prompt).toContain('(No file tree available)');
    expect(prompt).not.toContain('**Inspected Files:**');
  });

  it('truncates inspected file content to 5000 characters', () => {
    const agent = new RepositoryScoutAgent();
    const longContent = 'x'.repeat(6000);
    const input: RepositoryScoutInput = {
      ...sampleInput,
      inspectedFiles: {
        'src/big.ts': longContent,
      },
    };

    const prompt = (agent as any).getUserPrompt(input);
    expect(prompt).toContain('--- src/big.ts ---');
    expect(prompt).toContain('x'.repeat(5000));
    expect(prompt).not.toContain('x'.repeat(5001));
  });

  it('executes scouting and returns validated RepositoryContext', async () => {
    const agent = new RepositoryScoutAgent();

    const mockOutput: RepositoryContext = {
      repositoryOverview: 'TypeScript sliding window rate limiter library',
      relevantFiles: [
        {
          path: 'src/limiter.ts',
          reason: 'Contains the RateLimiter implementation and timestamp tracking',
          inspected: true,
          symbols: ['RateLimiter', 'check'],
        },
        {
          path: 'tests/limiter.test.ts',
          reason: 'Unit tests covering rate limiting behavior',
          inspected: false,
          symbols: [],
        },
      ],
      symbolReferences: [
        {
          symbol: 'RateLimiter',
          file: 'src/limiter.ts',
          description: 'Class managing sliding window rate limiting',
        },
      ],
      dependencyNotes: ['Pure TypeScript, zero runtime dependencies'],
      existingTests: [
        {
          path: 'tests/limiter.test.ts',
          description: 'Tests for sliding window algorithm',
        },
      ],
      missingContext: [],
      suggestedInspections: ['tests/limiter.test.ts'],
    };

    const completionSpy = vi
      .spyOn(aiProvider, 'chatCompletionWithSchema')
      .mockResolvedValue({
        result: mockOutput,
        model: 'qwen-2.5-coder',
        provider: 'groq',
        usage: {
          promptTokens: 250,
          completionTokens: 120,
          totalTokens: 370,
        },
      });

    const result = await agent.execute(sampleInput);

    expect(completionSpy).toHaveBeenCalledTimes(1);
    expect(result.output).toEqual(mockOutput);
    expect(result.model).toBe('qwen-2.5-coder');
    expect(result.provider).toBe('groq');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
