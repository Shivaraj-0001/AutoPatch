import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImplementationPlannerAgent, type ImplementationPlannerInput } from './implementation-planner';
import * as aiProvider from '../services/ai-provider';
import type { ImplementationPlan } from '../schemas/agent-outputs';

describe('ImplementationPlannerAgent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sampleInput: ImplementationPlannerInput = {
    issueSpecification: {
      summary: 'Add timeout option to fetch client',
      problemStatement: 'Fetch requests hang indefinitely if the server does not respond',
      expectedBehavior: 'Requests should abort and reject with a TimeoutError after timeoutMs',
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Support timeoutMs option in client config', inferred: false },
        { id: 'AC-2', description: 'Throw TimeoutError when exceeded', inferred: false },
      ],
      constraints: ['Use native AbortController', 'Backwards-compatible options'],
      ambiguities: [],
      verificationRequirements: ['Unit test with timer delays'],
    },
    repositoryContext: {
      repositoryOverview: 'HTTP client utility library',
      relevantFiles: [
        {
          path: 'src/client.ts',
          reason: 'Main HTTP client implementation with fetch wrapper',
          inspected: true,
          symbols: ['request', 'HttpClient'],
        },
      ],
      symbolReferences: [],
      dependencyNotes: [],
      existingTests: [{ path: 'tests/client.test.ts', description: 'Tests client requests' }],
      missingContext: [],
      suggestedInspections: [],
    },
    sourceFiles: {
      'src/client.ts': 'export function request(url: string, opts: any) { return fetch(url, opts); }',
    },
    repoLanguage: 'TypeScript',
  };

  it('has correct agent metadata and completion options', () => {
    const agent = new ImplementationPlannerAgent();
    expect(agent.name).toBe('implementation-planner');
    expect(agent.displayName).toBe('Implementation Planner');
    expect(agent.description).toContain('Creates a concrete implementation plan');

    const options = (agent as any).getCompletionOptions();
    expect(options.temperature).toBe(0.1);
    expect(options.maxTokens).toBe(4096);
    expect(options.timeoutMs).toBe(120_000);
  });

  it('assembles user prompt with issue specs, criteria, constraints, repo context, and source files', () => {
    const agent = new ImplementationPlannerAgent();
    const prompt = (agent as any).getUserPrompt(sampleInput);

    expect(prompt).toContain('**Issue Summary:** Add timeout option to fetch client');
    expect(prompt).toContain('**Problem:** Fetch requests hang indefinitely');
    expect(prompt).toContain('**Expected Behavior:** Requests should abort and reject');
    expect(prompt).toContain('- [AC-1] Support timeoutMs option in client config');
    expect(prompt).toContain('**Constraints:** Use native AbortController; Backwards-compatible options');
    expect(prompt).toContain('**Repository Overview:** HTTP client utility library');
    expect(prompt).toContain('**Language:** TypeScript');
    expect(prompt).toContain('- src/client.ts: Main HTTP client implementation');
    expect(prompt).toContain('--- src/client.ts ---');
    expect(prompt).toContain('export function request');
  });

  it('handles empty sourceFiles or empty relevantFiles gracefully', () => {
    const agent = new ImplementationPlannerAgent();
    const minimalInput: ImplementationPlannerInput = {
      ...sampleInput,
      repositoryContext: {
        ...sampleInput.repositoryContext,
        relevantFiles: [],
      },
      sourceFiles: {},
    };

    const prompt = (agent as any).getUserPrompt(minimalInput);

    expect(prompt).toContain('**Issue Summary:** Add timeout option to fetch client');
    expect(prompt).not.toContain('**Relevant Files Identified:**');
    expect(prompt).not.toContain('--- src/client.ts ---');
  });

  it('truncates source file content to 8000 characters', () => {
    const agent = new ImplementationPlannerAgent();
    const longCode = 'c'.repeat(10000);
    const input: ImplementationPlannerInput = {
      ...sampleInput,
      sourceFiles: {
        'src/long.ts': longCode,
      },
    };

    const prompt = (agent as any).getUserPrompt(input);
    expect(prompt).toContain('--- src/long.ts ---');
    expect(prompt).toContain('c'.repeat(8000));
    expect(prompt).not.toContain('c'.repeat(8001));
  });

  it('executes planning and returns validated ImplementationPlan', async () => {
    const agent = new ImplementationPlannerAgent();

    const mockPlan: ImplementationPlan = {
      implementationStrategy: 'Wire AbortController with setTimeout into request options.',
      plannedChanges: [
        {
          file: 'src/client.ts',
          action: 'modify',
          description: 'Add timeoutMs to client options and setup AbortController timer',
          relatedCriteria: ['AC-1', 'AC-2'],
        },
      ],
      testPlan: [
        {
          file: 'tests/client.test.ts',
          description: 'Assert TimeoutError is thrown when request exceeds timeoutMs',
          type: 'unit',
        },
      ],
      risks: [
        {
          description: 'Caller might supply an already aborted signal',
          severity: 'low',
          mitigation: 'Check signal.aborted before configuring timer',
        },
      ],
      assumptions: ['Node environment provides global AbortController'],
      acceptanceCriterionMapping: [
        {
          criterionId: 'AC-1',
          plannedChanges: ['Add timeoutMs option in request options'],
        },
        {
          criterionId: 'AC-2',
          plannedChanges: ['Trigger abort and throw TimeoutError on timeout'],
        },
      ],
    };

    const completionSpy = vi
      .spyOn(aiProvider, 'chatCompletionWithSchema')
      .mockResolvedValue({
        result: mockPlan,
        model: 'qwen-2.5-coder',
        provider: 'groq',
        usage: {
          promptTokens: 300,
          completionTokens: 180,
          totalTokens: 480,
        },
      });

    const result = await agent.execute(sampleInput);

    expect(completionSpy).toHaveBeenCalledTimes(1);
    expect(result.output).toEqual(mockPlan);
    expect(result.model).toBe('qwen-2.5-coder');
    expect(result.provider).toBe('groq');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
