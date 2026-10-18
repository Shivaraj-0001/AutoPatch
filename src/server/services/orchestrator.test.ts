import { describe, it, expect } from 'vitest';
import * as orchestrator from './orchestrator';

describe('orchestrator', () => {
  it('manages run store retrieval', () => {
    const all = orchestrator.getAllRuns();
    expect(Array.isArray(all)).toBe(true);
  });

  it('handles non-existent run query cleanly', () => {
    const run = orchestrator.getRun('non-existent-id');
    expect(run).toBeUndefined();
  });

  it('rejects cancellation of non-existent run', () => {
    const success = orchestrator.cancelRun('non-existent-id');
    expect(success).toBe(false);
  });

  it('subscribes and unsubscribes to events without error', () => {
    const unsubscribe = orchestrator.subscribeToEvents('sample-run-id', () => {});
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('rejects refinement of non-existent run', async () => {
    await expect(orchestrator.refineRun('non-existent-id')).rejects.toThrow('Run not found');
  });

  it('does not review again after coding agent completes on revision cycle == max revision', async () => {
    const { IssueAnalystAgent } = await import('../agents/issue-analyst');
    const { RepositoryScoutAgent } = await import('../agents/repository-scout');
    const { ImplementationPlannerAgent } = await import('../agents/implementation-planner');
    const { CodingAgentImpl } = await import('../agents/coding-agent');
    const { ReviewAgentImpl } = await import('../agents/review-agent');
    const github = await import('./github');
    const { vi } = await import('vitest');

    vi.spyOn(github, 'getRepository').mockResolvedValue({
      owner: 'test-owner',
      repo: 'test-repo',
      fullName: 'test-owner/test-repo',
      defaultBranch: 'main',
      description: 'test repo',
      language: 'typescript',
      stars: 1,
      forks: 0,
      openIssues: 1,
    } as any);

    vi.spyOn(github, 'getIssue').mockResolvedValue({
      number: 10,
      title: 'Fix issue',
      body: 'Bug description',
      state: 'open',
      htmlUrl: 'https://github.com/test-owner/test-repo/issues/10',
      author: 'tester',
      labels: [],
      createdAt: new Date().toISOString(),
      comments: [],
    } as any);

    vi.spyOn(github, 'getIssueComments').mockResolvedValue([]);
    vi.spyOn(github, 'buildFileTree').mockResolvedValue('index.ts');
    vi.spyOn(github, 'getDirectoryContents').mockResolvedValue([]);
    vi.spyOn(github, 'fetchMultipleFiles').mockResolvedValue({
      'index.ts': 'console.log("hello");',
    });

    vi.spyOn(IssueAnalystAgent.prototype, 'execute').mockResolvedValue({
      output: {
        summary: 'Issue analysis',
        issueType: 'bug',
        scope: 'single-file',
        complexity: 'low',
        acceptanceCriteria: [{ id: 'AC-1', description: 'Fix bug', type: 'functional' }],
        edgeCases: [],
        relevantComponents: [],
        confidenceScore: 0.9,
      },
      model: 'test-model',
      provider: 'groq',
      usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
    } as any);

    vi.spyOn(RepositoryScoutAgent.prototype, 'execute').mockResolvedValue({
      output: {
        relevantFiles: [{ path: 'index.ts', reason: 'main entry', confidence: 0.9 }],
        suggestedInspections: [],
        existingTests: [],
        symbolDefinitions: [],
      },
      model: 'test-model',
      provider: 'groq',
      usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
    } as any);

    vi.spyOn(ImplementationPlannerAgent.prototype, 'execute').mockResolvedValue({
      output: {
        architectureSummary: 'Plan summary',
        plannedChanges: [{ file: 'index.ts', action: 'modify', description: 'Fix', relatedCriteria: [] }],
        potentialRisks: [],
        rollbackStrategy: 'Revert',
        estimatedComplexity: 'low',
      },
      model: 'test-model',
      provider: 'groq',
      usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
    } as any);

    let codingCalls = 0;
    vi.spyOn(CodingAgentImpl.prototype, 'execute').mockImplementation(async () => {
      codingCalls++;
      return {
        output: {
          patch: `--- a/index.ts\n+++ b/index.ts\n@@ -1,1 +1,1 @@\n-console.log("hello");\n+console.log("hello v${codingCalls}");\n`,
          filesChanged: [{ path: 'index.ts', status: 'modified', additions: 1, deletions: 1 }],
          changeSummary: `Updated index.ts attempt ${codingCalls}`,
          filesModified: ['index.ts'],
        },
        model: 'test-model',
        provider: 'groq',
        usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
      } as any;
    });

    let reviewCalls = 0;
    vi.spyOn(ReviewAgentImpl.prototype, 'execute').mockImplementation(async () => {
      reviewCalls++;
      return {
        output: {
          overallAssessment: 'Needs improvement',
          revisionRequired: true,
          findings: [
            {
              id: 'F-1',
              description: 'Fix naming',
              severity: 'critical',
              category: 'correctness',
              filePath: 'index.ts',
            },
          ],
          acceptanceCriterionResults: [],
          optionalSuggestions: [],
          testAssessment: 'Tests pass',
        },
        model: 'test-model',
        provider: 'groq',
        usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
      } as any;
    });

    const run = await orchestrator.startRun({
      owner: 'test-owner',
      repo: 'test-repo',
      issueNumber: 10,
    });

    // Wait for the workflow to complete
    let completedRun = orchestrator.getRun(run.id);
    for (let i = 0; i < 50; i++) {
      if (completedRun?.status === 'completed' || completedRun?.status === 'failed') break;
      await new Promise((r) => setTimeout(r, 50));
      completedRun = orchestrator.getRun(run.id);
    }

    expect(completedRun?.status).toBe('completed');
    expect(codingCalls).toBe(2);
    // Review agent should only have run once on cycle 1, and NOT again on cycle 2 (max revision)
    expect(reviewCalls).toBe(1);
    expect(completedRun?.revisionCount).toBe(2);
    expect(completedRun?.maxRevisions).toBe(2);
    expect(completedRun?.revisionHistory?.length).toBe(2);

    const reviewExecutions = completedRun?.agentExecutions.filter((e) => e.agentName === 'review-agent');
    expect(reviewExecutions?.length).toBe(1);

    vi.restoreAllMocks();
  });
});
