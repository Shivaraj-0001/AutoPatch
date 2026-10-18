import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { WorkflowTimeline, STEPS } from './WorkflowTimeline';
import type { WorkflowRun } from '../../lib/types';

describe('WorkflowTimeline Component', () => {
  const mockBaseRun: WorkflowRun = {
    id: 'run-timeline-123',
    repository: {
      owner: 'owner',
      repo: 'repo',
      fullName: 'owner/repo',
      defaultBranch: 'main',
    },
    issueNumber: 42,
    issue: null,
    status: 'queued',
    currentAgent: 'issue-analyst',
    agentExecutions: [],
    issueSpecification: null,
    repositoryContext: null,
    implementationPlan: null,
    codingProposal: null,
    reviewReport: null,
    revisionCount: 0,
    maxRevisions: 2,
    error: null,
    createdAt: '2026-10-18T10:00:00.000Z',
    updatedAt: '2026-10-18T10:00:00.000Z',
  };

  it('exports STEPS with all 5 specialist agents in sequence', () => {
    expect(STEPS).toHaveLength(5);
    expect(STEPS.map((s) => s.name)).toEqual([
      'issue-analyst',
      'repository-scout',
      'implementation-planner',
      'coding-agent',
      'review-agent',
    ]);
  });

  it('renders pipeline progress title and all 5 step names with sequential indices', () => {
    const html = renderToString(
      <WorkflowTimeline run={mockBaseRun} onSelectAgent={vi.fn()} />
    );

    expect(html).toContain('Pipeline Progress');
    expect(html).toContain('Sequential specialist agents passing validated structured context');
    expect(html).toContain('Issue Analyst');
    expect(html).toContain('Step 1 of 5');
    expect(html).toContain('Repository Scout');
    expect(html).toContain('Step 2 of 5');
    expect(html).toContain('Implementation Planner');
    expect(html).toContain('Step 3 of 5');
    expect(html).toContain('Coding Agent');
    expect(html).toContain('Step 4 of 5');
    expect(html).toContain('Review Agent');
    expect(html).toContain('Step 5 of 5');
  });

  it('renders revision cycle badge when revisionCount > 0', () => {
    const runWithRevisions: WorkflowRun = {
      ...mockBaseRun,
      revisionCount: 1,
      maxRevisions: 3,
    };

    const html = renderToString(
      <WorkflowTimeline run={runWithRevisions} onSelectAgent={vi.fn()} />
    );

    expect(html).toContain('Revision Cycle 1/3');
  });

  it('renders View Details button with aria-label when step has outputArtifact', () => {
    const runWithOutput: WorkflowRun = {
      ...mockBaseRun,
      agentExecutions: [
        {
          id: 'exec-1',
          runId: 'run-timeline-123',
          agentName: 'issue-analyst',
          status: 'completed',
          inputArtifactReferences: [],
          durationMs: 3400,
          error: null,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          outputArtifact: {
            problemSummary: 'Fix race condition in request handler',
            rootCauseAnalysis: 'Unsynchronized state update',
            acceptanceCriteria: ['Must be atomic'],
          },
        },
      ],
    };

    const html = renderToString(
      <WorkflowTimeline run={runWithOutput} onSelectAgent={vi.fn()} />
    );

    expect(html).toContain('View Details');
    expect(html).toContain('aria-label="View details for Issue Analyst"');
    expect(html).toContain('• 3.4s');
    expect(html).toContain('(150 tokens)');
  });

  it('renders active analyzing indicator for running agent', () => {
    const runningRun: WorkflowRun = {
      ...mockBaseRun,
      status: 'running',
      currentAgent: 'repository-scout',
    };

    const html = renderToString(
      <WorkflowTimeline run={runningRun} onSelectAgent={vi.fn()} />
    );

    expect(html).toContain('Analyzing...');
    expect(html).toContain('animate-pulse-glow');
  });

  it('renders error message and failed badge when agent execution fails', () => {
    const failedRun: WorkflowRun = {
      ...mockBaseRun,
      agentExecutions: [
        {
          id: 'exec-failed',
          runId: 'run-timeline-123',
          agentName: 'coding-agent',
          status: 'failed',
          inputArtifactReferences: [],
          outputArtifact: null,
          error: 'Rate limit exceeded on LLM endpoint',
        },
      ],
    };

    const html = renderToString(
      <WorkflowTimeline run={failedRun} onSelectAgent={vi.fn()} />
    );

    expect(html).toContain('Rate limit exceeded on LLM endpoint');
    expect(html).toContain('Failed');
  });

  it('applies custom className, id, and style props', () => {
    const html = renderToString(
      <WorkflowTimeline
        run={mockBaseRun}
        onSelectAgent={vi.fn()}
        id="custom-timeline"
        className="timeline-custom-class"
        style={{ padding: '30px' }}
      />
    );

    expect(html).toContain('id="custom-timeline"');
    expect(html).toContain('workflow-timeline timeline-custom-class');
    expect(html).toContain('padding:30px');
  });
});
