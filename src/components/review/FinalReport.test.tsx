import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { FinalReport } from './FinalReport';
import type { WorkflowRun } from '../../lib/types';

describe('FinalReport Component', () => {
  const baseRun: WorkflowRun = {
    id: 'run-12345',
    status: 'completed',
    repository: {
      owner: 'octocat',
      repo: 'hello-world',
      fullName: 'octocat/hello-world',
      defaultBranch: 'main',
    },
    issueNumber: 42,
    issue: null,
    revisionCount: 2,
    maxRevisions: 3,
    issueSpecification: {
      summary: 'Sanitize URL input in router',
      problemStatement: 'Path traversal vulnerabilities in router',
      expectedBehavior: 'Canonical paths checked against base boundary',
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Reject directory traversal', inferred: false },
        { id: 'AC-2', description: 'Allow legitimate static paths', inferred: false },
      ],
      constraints: [],
      ambiguities: [],
      verificationRequirements: ['Strip dot-dot traversal sequences'],
    },
    repositoryContext: null,
    implementationPlan: null,
    codingProposal: {
      patch: '--- a/src/server/router.ts\n+++ b/src/server/router.ts\n@@ -1 +1 @@\n+sanitized',
      changeSummary: 'Added path normalizer and bounds check in router request dispatcher.',
      filesModified: ['src/server/router.ts', 'src/server/security.ts'],
    },
    reviewReport: {
      revisionRequired: false,
      overallAssessment: 'Code changes pass all security and functional audits.',
      acceptanceCriterionResults: [
        { criterionId: 'AC-1', status: 'satisfied', explanation: 'Dot-dot traversal rejected.' },
        { criterionId: 'AC-2', status: 'satisfied', explanation: 'Legitimate paths allowed.' },
      ],
      findings: [],
      requiredChanges: [],
      optionalSuggestions: [],
      testAssessment: 'Comprehensive unit tests pass with 100% boundary coverage.',
    },
    currentAgent: null,
    error: null,
    agentExecutions: [],
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-18T10:15:00Z',
  };

  it('renders package title, repository name, and issue number', () => {
    const html = renderToString(<FinalReport run={baseRun} />);

    expect(html).toContain('Open-Source Contribution Package');
    expect(html).toContain('Autonomous multi-agent run complete for octocat/hello-world #42');
  });

  it('renders summary metrics for satisfied criteria, files modified, revision cycles, and approved status', () => {
    const html = renderToString(<FinalReport run={baseRun} />);

    expect(html).toContain('Criteria Satisfied');
    expect(html).toContain('2 / 2');

    expect(html).toContain('Files Modified');
    expect(html).toContain('2');

    expect(html).toContain('Revision Cycles');
    expect(html).toContain('2 / 3');

    expect(html).toContain('Review Status');
    expect(html).toContain('Ready to Apply');
  });

  it('renders Needs Polish status when revision is required', () => {
    const runNeedingRevision: WorkflowRun = {
      ...baseRun,
      reviewReport: {
        ...baseRun.reviewReport!,
        revisionRequired: true,
      },
    };

    const html = renderToString(<FinalReport run={runNeedingRevision} />);

    expect(html).toContain('Needs Polish');
  });

  it('renders download button with patch accessibility attributes', () => {
    const html = renderToString(<FinalReport run={baseRun} />);

    expect(html).toContain('Download Ready Patch');
    expect(html).toContain('title="Download generated patch file"');
    expect(html).toContain('aria-label="Download patch for octocat/hello-world issue #42"');
  });

  it('renders refine button when onRefine is provided and suggestions or findings exist', () => {
    const runWithFindings: WorkflowRun = {
      ...baseRun,
      reviewReport: {
        ...baseRun.reviewReport!,
        optionalSuggestions: ['Consider caching regex matchers'],
      },
    };

    const onRefineMock = vi.fn();
    const html = renderToString(<FinalReport run={runWithFindings} onRefine={onRefineMock} />);

    expect(html).toContain('Refine with Feedback');
    expect(html).toContain('aria-label="Refine patch with feedback from reviewer"');
  });

  it('renders change summary and review test assessment callouts', () => {
    const html = renderToString(<FinalReport run={baseRun} />);

    expect(html).toContain('Summary of Changes');
    expect(html).toContain('Added path normalizer and bounds check in router request dispatcher.');

    expect(html).toContain('Review Agent Verification &amp; Test Assessment');
    expect(html).toContain('Comprehensive unit tests pass with 100% boundary coverage.');
  });

  it('applies custom className, id, and style props to container', () => {
    const html = renderToString(
      <FinalReport
        run={baseRun}
        id="custom-final-report"
        className="test-report-panel"
        style={{ opacity: 0.9 }}
      />
    );

    expect(html).toContain('id="custom-final-report"');
    expect(html).toContain('glass-panel test-report-panel');
    expect(html).toContain('opacity:0.9');
  });
});
