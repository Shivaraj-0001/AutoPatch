import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewAgentImpl, type ReviewAgentInput } from './review-agent';
import * as aiProvider from '../services/ai-provider';
import type { ReviewReport } from '../schemas/agent-outputs';

describe('ReviewAgentImpl', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sampleInput: ReviewAgentInput = {
    issueSpecification: {
      summary: 'Fix race condition in session revocation',
      problemStatement: 'Concurrent logout and token refresh causes race condition',
      expectedBehavior: 'Session revocation must be atomic and invalidate active refresh tokens',
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Revoke session atomically in Redis', inferred: false },
        { id: 'AC-2', description: 'Reject subsequent token refresh calls', inferred: true },
      ],
      constraints: ['Redis transactions must be used'],
      ambiguities: [],
      verificationRequirements: ['Verify concurrency test with Promise.all'],
    },
    implementationPlan: {
      implementationStrategy: 'Use Redis MULTI/EXEC block to revoke session and blacklist refresh token.',
      plannedChanges: [
        {
          file: 'src/auth/session.ts',
          action: 'modify',
          description: 'Wrap session deletion and token blacklisting in redis transaction',
          relatedCriteria: ['AC-1'],
        },
      ],
      testPlan: [
        { file: 'tests/session.test.ts', description: 'Concurrent logout test', type: 'integration' },
      ],
      risks: [
        {
          description: 'Potential Redis connection timeout under heavy load',
          severity: 'medium',
          mitigation: 'Implement retry policy with exponential backoff',
        },
      ],
      assumptions: [],
      acceptanceCriterionMapping: [
        { criterionId: 'AC-1', plannedChanges: ['Wrap in redis transaction'] },
      ],
    },
    codingProposal: {
      changeSummary: 'Use redis.multi() for atomic session deletion and token blacklisting',
      filesChanged: [{ path: 'src/auth/session.ts', action: 'modify' }],
      patch: `--- a/src/auth/session.ts\n+++ b/src/auth/session.ts\n@@ -10,3 +10,5 @@\n-await redis.del(sessionId);\n+const multi = redis.multi();\n+multi.del(sessionId);\n+multi.sadd('revoked_tokens', tokenId);\n+await multi.exec();`,
      testsAdded: [
        {
          path: 'tests/session.test.ts',
          description: 'Verifies concurrent revoke and refresh handling',
          content: 'it("revokes atomically", async () => { ... });',
        },
      ],
      assumptions: ['Redis version supports MULTI/EXEC'],
      limitations: [],
    },
    sourceFiles: {
      'src/other-helper.ts': 'export const helper = () => true;',
      'src/auth/session.ts': 'export async function revokeSession(sessionId: string, tokenId: string) {\n  await redis.del(sessionId);\n}',
    },
    revisionAttempt: 0,
    maxRevisions: 3,
  };

  it('has correct agent metadata and completion options', () => {
    const agent = new ReviewAgentImpl();
    expect(agent.name).toBe('review-agent');
    expect(agent.displayName).toBe('Review Agent');
    expect(agent.description).toContain('reviews proposed patches');

    const options = (agent as any).getCompletionOptions();
    expect(options.temperature).toBe(0.15);
    expect(options.maxTokens).toBe(4096);
    expect(options.timeoutMs).toBe(120_000);
  });

  it('assembles user prompt for initial review without revision notes and prioritizes changed files', () => {
    const agent = new ReviewAgentImpl();
    const prompt = (agent as any).getUserPrompt(sampleInput);

    expect(prompt).toContain('Review this proposed patch:');
    expect(prompt).not.toContain('This is revision attempt');
    expect(prompt).toContain('**Issue Summary:** Fix race condition in session revocation');
    expect(prompt).toContain('**Problem:** Concurrent logout and token refresh causes race condition');
    expect(prompt).toContain('**Expected Behavior:** Session revocation must be atomic');
    expect(prompt).toContain('- [AC-1] Revoke session atomically in Redis');
    expect(prompt).toContain('- [AC-2] Reject subsequent token refresh calls (inferred)');
    expect(prompt).toContain('**Implementation Plan:**\nUse Redis MULTI/EXEC block');
    expect(prompt).toContain('Planned Changes:\n- [modify] src/auth/session.ts: Wrap session deletion');
    expect(prompt).toContain('Identified Risks:\n- [MEDIUM] Potential Redis connection timeout');
    expect(prompt).toContain('**Change Summary:** Use redis.multi() for atomic session deletion');
    expect(prompt).toContain('**Files Changed:**\n- [modify] src/auth/session.ts');
    expect(prompt).toContain('**Proposed Patch:**\n```diff\n--- a/src/auth/session.ts');
    expect(prompt).toContain('**Tests Added:**');
    expect(prompt).toContain('- tests/session.test.ts: Verifies concurrent revoke and refresh handling');

    // Prioritization check: changed file 'src/auth/session.ts' must precede 'src/other-helper.ts'
    const sessionIndex = prompt.indexOf('--- src/auth/session.ts ---');
    const otherIndex = prompt.indexOf('--- src/other-helper.ts ---');
    expect(sessionIndex).toBeGreaterThan(-1);
    expect(otherIndex).toBeGreaterThan(-1);
    expect(sessionIndex).toBeLessThan(otherIndex);
  });

  it('assembles user prompt for revision attempt including revision progress', () => {
    const agent = new ReviewAgentImpl();
    const revisionInput: ReviewAgentInput = {
      ...sampleInput,
      revisionAttempt: 1,
      maxRevisions: 3,
    };

    const prompt = (agent as any).getUserPrompt(revisionInput);

    expect(prompt).toContain('**Note:** This is revision attempt 2 of 3.');
    expect(prompt).toContain('The patch has been revised based on previous review findings and suggestions.');
    expect(prompt).toContain('Verify whether previously noted suggestions or issues have been resolved');
  });

  it('includes all changed files without starvation even when preceding changed files are large', () => {
    const agent = new ReviewAgentImpl();
    const largeContentA = 'A'.repeat(8000);
    const largeContentB = 'B'.repeat(8000);

    const inputWithMultipleLargeChangedFiles: ReviewAgentInput = {
      ...sampleInput,
      codingProposal: {
        ...sampleInput.codingProposal,
        filesChanged: [
          { path: 'src/file-a.ts', action: 'modify' },
          { path: 'src/file-b.ts', action: 'modify' },
        ],
      },
      sourceFiles: {
        'src/file-a.ts': largeContentA,
        'src/file-b.ts': largeContentB,
      },
    };

    const prompt = (agent as any).getUserPrompt(inputWithMultipleLargeChangedFiles);

    expect(prompt).toContain('--- src/file-a.ts ---');
    expect(prompt).toContain('--- src/file-b.ts ---');
    // Ensure both files received up to 6000 chars rather than file-b being starved
    expect(prompt).toContain('A'.repeat(6000));
    expect(prompt).toContain('B'.repeat(6000));
  });

  it('bounds non-changed context files by extra context budget while preserving changed files', () => {
    const agent = new ReviewAgentImpl();
    const largeHelper = 'C'.repeat(5000);

    const inputWithExcessiveContext: ReviewAgentInput = {
      ...sampleInput,
      codingProposal: {
        ...sampleInput.codingProposal,
        filesChanged: [{ path: 'src/auth/session.ts', action: 'modify' }],
      },
      sourceFiles: {
        'src/auth/session.ts': 'export const session = 1;',
        'src/ctx-1.ts': largeHelper,
        'src/ctx-2.ts': largeHelper,
        'src/ctx-3.ts': largeHelper,
        'src/ctx-4.ts': largeHelper,
      },
    };

    const prompt = (agent as any).getUserPrompt(inputWithExcessiveContext);

    // Changed file must be preserved
    expect(prompt).toContain('--- src/auth/session.ts ---');

    // Context files up to 12000 chars extra are included (4000 + 4000 + 4000)
    expect(prompt).toContain('--- src/ctx-1.ts ---');
    expect(prompt).toContain('--- src/ctx-2.ts ---');
    expect(prompt).toContain('--- src/ctx-3.ts ---');

    // 4th context file exceeds 12000 chars budget and must be omitted
    expect(prompt).not.toContain('--- src/ctx-4.ts ---');
  });

  it('executes review analysis and returns validated ReviewReport', async () => {
    const agent = new ReviewAgentImpl();

    const mockReport: ReviewReport = {
      overallAssessment: 'The patch correctly ensures atomic revocation with Redis MULTI/EXEC block.',
      findings: [
        {
          severity: 'minor',
          category: 'edge-case',
          description: 'Consider adding error handling if redis.multi() fails',
          filePath: 'src/auth/session.ts',
          suggestedFix: 'Wrap in try/catch block to log execution errors',
          confidence: 'high',
        },
      ],
      acceptanceCriterionResults: [
        {
          criterionId: 'AC-1',
          status: 'satisfied',
          explanation: 'Revocation is wrapped in a multi/exec atomic block',
        },
        {
          criterionId: 'AC-2',
          status: 'satisfied',
          explanation: 'Token added to revoked_tokens set',
        },
      ],
      testAssessment: 'Integration test added with concurrent verification',
      requiredChanges: [],
      optionalSuggestions: ['Add try/catch around multi.exec()'],
      revisionRequired: false,
    };

    const completionSpy = vi
      .spyOn(aiProvider, 'chatCompletionWithSchema')
      .mockResolvedValue({
        result: mockReport,
        model: 'llama-3.3-70b-versatile',
        provider: 'groq',
        usage: {
          promptTokens: 520,
          completionTokens: 280,
          totalTokens: 800,
        },
      });

    const result = await agent.execute(sampleInput);

    expect(completionSpy).toHaveBeenCalledTimes(1);
    expect(result.output).toEqual(mockReport);
    expect(result.output.revisionRequired).toBe(false);
    expect(result.model).toBe('llama-3.3-70b-versatile');
    expect(result.provider).toBe('groq');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
