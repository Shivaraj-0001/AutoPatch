import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CodingAgentImpl, type CodingAgentInput } from './coding-agent';
import * as aiProvider from '../services/ai-provider';
import type { CodingProposal, ReviewReport } from '../schemas/agent-outputs';

describe('CodingAgentImpl', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sampleInput: CodingAgentInput = {
    issueSpecification: {
      summary: 'Fix off-by-one error in pagination',
      problemStatement: 'Page index 0 causes empty results',
      expectedBehavior: 'Page 0 and 1 should both return the first page',
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Clamp page to minimum 1', inferred: false },
      ],
      constraints: [],
      ambiguities: [],
      verificationRequirements: ['Add test for page=0'],
    },
    implementationPlan: {
      implementationStrategy: 'Clamp page parameter to Math.max(1, page).',
      plannedChanges: [
        {
          file: 'src/paginate.ts',
          action: 'modify',
          description: 'Clamp page parameter to at least 1',
          relatedCriteria: ['AC-1'],
        },
      ],
      testPlan: [
        { file: 'tests/paginate.test.ts', description: 'Test page 0 clamp', type: 'unit' },
      ],
      risks: [],
      assumptions: [],
      acceptanceCriterionMapping: [
        { criterionId: 'AC-1', plannedChanges: ['Clamp page in paginate.ts'] },
      ],
    },
    sourceFiles: {
      'src/other.ts': 'export const helper = () => {};',
      'src/paginate.ts': 'export function paginate(page: number) { return page * 10; }',
    },
    repoLanguage: 'TypeScript',
  };

  it('has correct agent metadata and completion options', () => {
    const agent = new CodingAgentImpl();
    expect(agent.name).toBe('coding-agent');
    expect(agent.displayName).toBe('Coding Agent');
    expect(agent.description).toContain('Generates proposed code changes');

    const options = (agent as any).getCompletionOptions();
    expect(options.temperature).toBe(0.15);
    expect(options.maxTokens).toBe(4096);
    expect(options.timeoutMs).toBe(180_000);
  });

  it('assembles user prompt prioritizing planned files first', () => {
    const agent = new CodingAgentImpl();
    const prompt = (agent as any).getUserPrompt(sampleInput);

    expect(prompt).toContain('**Issue:** Fix off-by-one error in pagination');
    expect(prompt).toContain('**Problem:** Page index 0 causes empty results');
    expect(prompt).toContain('**Expected Behavior:** Page 0 and 1 should both return');
    expect(prompt).toContain('Strategy: Clamp page parameter to Math.max(1, page).');
    expect(prompt).toContain('- [modify] src/paginate.ts: Clamp page parameter');

    // Planned file 'src/paginate.ts' must be sorted before 'src/other.ts'
    const paginateIndex = prompt.indexOf('--- src/paginate.ts ---');
    const otherIndex = prompt.indexOf('--- src/other.ts ---');
    expect(paginateIndex).toBeGreaterThan(-1);
    expect(otherIndex).toBeGreaterThan(-1);
    expect(paginateIndex).toBeLessThan(otherIndex);
  });

  it('assembles revision prompt including review findings, required changes, and previous patch', () => {
    const agent = new CodingAgentImpl();
    const reviewFindings: ReviewReport = {
      overallAssessment: 'Requires correction of clamp logic',
      revisionRequired: true,
      findings: [
        {
          severity: 'critical',
          category: 'correctness',
          description: 'Negative page numbers produce unexpected offsets',
          suggestedFix: 'Use Math.max(1, page || 1)',
          filePath: 'src/paginate.ts',
          confidence: 'high',
        },
        {
          severity: 'suggestion',
          category: 'convention',
          description: 'Add inline JSDoc comment',
          suggestedFix: 'Document page parameter behavior',
          filePath: 'src/paginate.ts',
          confidence: 'medium',
        },
      ],
      acceptanceCriterionResults: [
        { criterionId: 'AC-1', status: 'not-satisfied', explanation: 'Negative pages not handled' },
      ],
      testAssessment: 'Tests need updating for negative numbers',
      requiredChanges: ['Support negative page inputs safely'],
      optionalSuggestions: ['Add JSDoc'],
    };

    const revisionInput: CodingAgentInput = {
      ...sampleInput,
      previousPatch: '--- a/src/paginate.ts\n+++ b/src/paginate.ts\n@@ -1 +1 @@\n-old\n+new',
      reviewFindings,
      userInstructions: 'Also ensure pageSize default is 20.',
    };

    const prompt = (agent as any).getUserPrompt(revisionInput);

    expect(prompt).toContain('**FEEDBACK & REVISION REQUEST**');
    expect(prompt).toContain('**Critical & Major Issues (Must Fix):**');
    expect(prompt).toContain('[CRITICAL] Negative page numbers produce unexpected offsets');
    expect(prompt).toContain('Suggested Fix: Use Math.max(1, page || 1)');
    expect(prompt).toContain('**Required Changes:**\n- Support negative page inputs safely');
    expect(prompt).toContain('**Code Quality, Convention & Minor Findings:**');
    expect(prompt).toContain('[SUGGESTION] Add inline JSDoc comment');
    expect(prompt).toContain('**Reviewer Recommendations & Suggestions:**\n- Add JSDoc');
    expect(prompt).toContain('**User Refinement Instructions:**\nAlso ensure pageSize default is 20.');
    expect(prompt).toContain('**Previous Patch:**');
    expect(prompt).toContain('--- a/src/paginate.ts');
  });

  it('executes coding proposal generation and returns validated CodingProposal', async () => {
    const agent = new CodingAgentImpl();

    const mockProposal: CodingProposal = {
      changeSummary: 'Clamp page parameter to minimum 1 in paginate function',
      filesChanged: [{ path: 'src/paginate.ts', action: 'modify' }],
      patch: `--- a/src/paginate.ts\n+++ b/src/paginate.ts\n@@ -1 +1 @@\n-export function paginate(page: number) { return page * 10; }\n+export function paginate(page: number) { const safePage = Math.max(1, page || 1); return safePage * 10; }`,
      testsAdded: [
        {
          path: 'tests/paginate.test.ts',
          description: 'Tests clamping 0 and negative pages',
          content: 'it("clamps", () => expect(paginate(0)).toBe(10));',
        },
      ],
      assumptions: ['Default page size remains 10'],
      limitations: [],
    };

    const completionSpy = vi
      .spyOn(aiProvider, 'chatCompletionWithSchema')
      .mockResolvedValue({
        result: mockProposal,
        model: 'qwen-2.5-coder',
        provider: 'groq',
        usage: {
          promptTokens: 400,
          completionTokens: 220,
          totalTokens: 620,
        },
      });

    const result = await agent.execute(sampleInput);

    expect(completionSpy).toHaveBeenCalledTimes(1);
    expect(result.output).toEqual(mockProposal);
    expect(result.model).toBe('qwen-2.5-coder');
    expect(result.provider).toBe('groq');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
