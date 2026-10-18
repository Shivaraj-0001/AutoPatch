import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { WorkspacePage } from './WorkspacePage';
import type { WorkflowRun } from '@/lib/types';

describe('WorkspacePage Component', () => {
  const mockOnStartRun = vi.fn();
  const mockOnCancelRun = vi.fn();
  const mockOnNewRun = vi.fn();

  const sampleCompletedRun: WorkflowRun = {
    id: 'run-workspace-1',
    status: 'completed',
    repository: {
      owner: 'facebook',
      repo: 'react',
      fullName: 'facebook/react',
      defaultBranch: 'main',
    },
    issueNumber: 101,
    issue: {
      number: 101,
      title: 'Fix edge case in hooks dispatcher',
      body: 'Hooks dispatcher throws when component unmounts early.',
      state: 'open',
      htmlUrl: 'https://github.com/facebook/react/issues/101',
      author: { login: 'alice', avatarUrl: 'https://github.com/alice.png' },
      labels: [{ name: 'bug', color: 'd73a4a' }],
      createdAt: '2026-10-18T08:00:00Z',
      updatedAt: '2026-10-18T09:00:00Z',
    },
    currentAgent: null,
    error: null,
    agentExecutions: [],
    issueSpecification: {
      summary: 'Fix hooks unmount dispatcher bug',
      problemStatement: 'Component unmounting prematurely causes undefined dispatcher read',
      expectedBehavior: 'Null-safe guard in dispatcher',
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Gracefully handle null dispatcher on unmount', inferred: false },
      ],
      constraints: [],
      ambiguities: [],
      verificationRequirements: ['Unit test unmount during pending hook'],
    },
    repositoryContext: null,
    implementationPlan: {
      implementationStrategy: 'Guard hooks dispatcher against null reference.',
      plannedChanges: [
        {
          file: 'packages/react/src/ReactHooks.js',
          action: 'modify',
          description: 'Add dispatcher guard check',
          relatedCriteria: ['AC-1'],
        },
      ],
      testPlan: 'Run hook unit tests',
    },
    codingProposal: {
      patch: '--- a/packages/react/src/ReactHooks.js\n+++ b/packages/react/src/ReactHooks.js\n@@ -1 +1 @@\n+guard',
      changeSummary: 'Added null check for dispatcher before calling hook hooks.',
      filesModified: ['packages/react/src/ReactHooks.js'],
    },
    reviewReport: {
      revisionRequired: false,
      overallAssessment: 'Guard clean and well tested.',
      acceptanceCriterionResults: [
        { criterionId: 'AC-1', status: 'satisfied', explanation: 'Null check tested.' },
      ],
      findings: [],
      requiredChanges: [],
      optionalSuggestions: [],
      testAssessment: 'Tests pass.',
    },
    revisionCount: 1,
    maxRevisions: 3,
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-18T10:20:00Z',
  };

  const sampleRunningRun: WorkflowRun = {
    ...sampleCompletedRun,
    status: 'running',
    currentAgent: 'coding-agent',
    reviewReport: null,
  };

  it('renders initial form and contribution pipeline pills when no active run exists', () => {
    const html = renderToString(
      <WorkspacePage
        run={null}
        isLoading={false}
        error={null}
        onStartRun={mockOnStartRun}
        onCancelRun={mockOnCancelRun}
        onNewRun={mockOnNewRun}
      />
    );

    expect(html).toContain('Target Open-Source Issue');
    expect(html).toContain('Autonomous Contribution Pipeline');
    expect(html).toContain('Analyst');
    expect(html).toContain('Scout');
    expect(html).toContain('Planner');
    expect(html).toContain('Coder');
    expect(html).toContain('Reviewer');
  });

  it('renders ErrorBanner when an error is passed', () => {
    const html = renderToString(
      <WorkspacePage
        run={null}
        isLoading={false}
        error="Failed to connect to GitHub API."
        onStartRun={mockOnStartRun}
        onCancelRun={mockOnCancelRun}
        onNewRun={mockOnNewRun}
      />
    );

    expect(html).toContain('Failed to connect to GitHub API.');
  });

  it('renders active running state with status badge and Cancel Run button', () => {
    const html = renderToString(
      <WorkspacePage
        run={sampleRunningRun}
        isLoading={false}
        error={null}
        onStartRun={mockOnStartRun}
        onCancelRun={mockOnCancelRun}
        onNewRun={mockOnNewRun}
      />
    );

    expect(html).toContain('Autonomous Agents Working');
    expect(html).toContain('facebook/react #101');
    expect(html).toContain('Cancel Run');
    expect(html).toContain('aria-label="Cancel active workflow run"');
    expect(html).toContain('New Contribution');
  });

  it('renders completed state with result tabs, final report, and diff viewer', () => {
    const html = renderToString(
      <WorkspacePage
        run={sampleCompletedRun}
        isLoading={false}
        error={null}
        onStartRun={mockOnStartRun}
        onCancelRun={mockOnCancelRun}
        onNewRun={mockOnNewRun}
      />
    );

    expect(html).toContain('Workflow Completed');
    expect(html).not.toContain('Cancel Run');

    // Tab bar accessibility
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('Generated Patch');
    expect(html).toContain('Review &amp; Quality');
    expect(html).toContain('Architecture Plan');

    // Default active patch panel content
    expect(html).toContain('Open-Source Contribution Package');
    expect(html).toContain('Proposed Code Changes');
  });

  it('renders failed status badge when run failed', () => {
    const failedRun: WorkflowRun = {
      ...sampleCompletedRun,
      status: 'failed',
      error: 'Patch application failed with merge conflict.',
    };

    const html = renderToString(
      <WorkspacePage
        run={failedRun}
        isLoading={false}
        error={null}
        onStartRun={mockOnStartRun}
        onCancelRun={mockOnCancelRun}
        onNewRun={mockOnNewRun}
      />
    );

    expect(html).toContain('Workflow Failed');
    expect(html).toContain('Patch application failed with merge conflict.');
  });

  it('applies custom className, id, and style props to container', () => {
    const html = renderToString(
      <WorkspacePage
        run={null}
        isLoading={false}
        error={null}
        onStartRun={mockOnStartRun}
        onCancelRun={mockOnCancelRun}
        onNewRun={mockOnNewRun}
        id="custom-workspace"
        className="test-workspace-class"
        style={{ minHeight: '800px' }}
      />
    );

    expect(html).toContain('id="custom-workspace"');
    expect(html).toContain('class="test-workspace-class"');
    expect(html).toContain('min-height:800px');
  });
});
