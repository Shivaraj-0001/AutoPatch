import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ReviewFindingsList } from './ReviewFindingsList';
import type { ReviewReport, RevisionRecord } from '../../lib/types';

describe('ReviewFindingsList Component', () => {
  const sampleReportWithFindings: ReviewReport = {
    revisionRequired: true,
    overallAssessment: 'Path resolution lacks boundary checks against directory traversal.',
    acceptanceCriterionResults: [
      {
        criterionId: 'AC-1',
        status: 'not-satisfied',
        explanation: 'Path resolution does not strip dot-dot sequences.',
      },
    ],
    findings: [
      {
        severity: 'critical',
        category: 'security',
        filePath: 'src/server/router.ts',
        lineRange: '45-52',
        confidence: 'high',
        description: 'Unsanitized input passed directly to path resolver',
        evidence: 'const abs = path.resolve(root, req.path);',
        suggestedFix: 'Use normalizePath() and verify root directory boundary prefix.',
      },
      {
        severity: 'minor',
        category: 'convention',
        filePath: 'src/server/utils.ts',
        lineRange: { start: 12, end: 14 },
        confidence: 'medium',
        description: 'Missing JSDoc comment for exported helper function',
        suggestedFix: 'Add description and parameter documentation.',
      },
    ],
    requiredChanges: [
      'Disallow relative traversal sequences before resolving file path',
      'Add negative tests checking traversal exploit strings',
    ],
    testAssessment: 'Existing test suite misses boundary tests for malicious dot-dot payloads.',
    optionalSuggestions: [
      'Consider memoizing sanitized path lookups',
    ],
  };

  const sampleApprovedReport: ReviewReport = {
    revisionRequired: false,
    overallAssessment: 'All acceptance criteria met with robust boundary checks and tests.',
    acceptanceCriterionResults: [
      {
        criterionId: 'AC-1',
        status: 'satisfied',
        explanation: 'Valid boundary checks prevent traversal attacks.',
      },
    ],
    findings: [],
    requiredChanges: [],
    optionalSuggestions: [],
    testAssessment: 'Comprehensive unit tests pass cleanly.',
  };

  it('renders review header, verdict, findings, and badges for revision required report', () => {
    const html = renderToString(
      <ReviewFindingsList report={sampleReportWithFindings} revisionCount={1} maxRevisions={3} />
    );

    expect(html).toContain('Independent Review Audit');
    expect(html).toContain('Revision Required');
    expect(html).toContain('2 findings');
    expect(html).toContain('Revisions: 1/3');
    expect(html).toContain('Verdict: Revision Needed Before Shipping');
    expect(html).toContain('Path resolution lacks boundary checks against directory traversal.');

    // Critical finding
    expect(html).toContain('Critical');
    expect(html).toContain('SECURITY');
    expect(html).toContain('src/server/router.ts:45-52');
    expect(html).toContain('Confidence: high');
    expect(html).toContain('Unsanitized input passed directly to path resolver');
    expect(html).toContain('Evidence:');
    expect(html).toContain('const abs = path.resolve(root, req.path);');
    expect(html).toContain('Suggested Fix:');
    expect(html).toContain('Use normalizePath() and verify root directory boundary prefix.');
    expect(html).toContain('Actionable via Feedback Loop');

    // Minor finding with object lineRange
    expect(html).toContain('Minor');
    expect(html).toContain('CONVENTION');
    expect(html).toContain('src/server/utils.ts:12-14');
    expect(html).toContain('Missing JSDoc comment for exported helper function');
  });

  it('renders approved verdict and fallback empty findings message when patch is approved', () => {
    const html = renderToString(<ReviewFindingsList report={sampleApprovedReport} />);

    expect(html).toContain('Patch Approved');
    expect(html).toContain('Verdict: Code Quality Passed');
    expect(html).toContain('All acceptance criteria met with robust boundary checks and tests.');
    expect(html).toContain('No critical or major issues identified in this revision.');
  });

  it('renders required changes, test assessment, and optional suggestions', () => {
    const html = renderToString(<ReviewFindingsList report={sampleReportWithFindings} />);

    expect(html).toContain('Required Changes Before Approval (2)');
    expect(html).toContain('Disallow relative traversal sequences before resolving file path');
    expect(html).toContain('Add negative tests checking traversal exploit strings');

    expect(html).toContain('Test Assessment');
    expect(html).toContain('Existing test suite misses boundary tests for malicious dot-dot payloads.');

    expect(html).toContain('Optional Suggestions (1)');
    expect(html).toContain('Consider memoizing sanitized path lookups');
  });

  it('renders feedback loop action bar when onRefine callback is provided', () => {
    const handleRefine = async () => {};

    const html = renderToString(
      <ReviewFindingsList report={sampleReportWithFindings} onRefine={handleRefine} />
    );

    expect(html).toContain('Review-to-Code Feedback Loop');
    expect(html).toContain('Transmit reviewer findings and suggestions back to the Coding Agent');
    expect(html).toContain('Apply Feedback &amp; Synthesize New Revision');
    expect(html).toContain('+ Custom Notes');
  });

  it('renders revision audit switcher when revisionHistory is provided', () => {
    const history: RevisionRecord[] = [
      {
        attempt: 1,
        revision: 1,
        timestamp: '2026-10-18T10:00:00Z',
        summary: 'Initial implementation',
        codingProposal: {
          patch: '--- a/router.ts\n+++ b/router.ts\n',
          changeSummary: 'Initial path resolver update',
        },
        reviewReport: sampleReportWithFindings,
      },
      {
        attempt: 2,
        revision: 2,
        timestamp: '2026-10-18T10:15:00Z',
        summary: 'Refined boundary sanitization',
        codingProposal: {
          patch: '--- a/router.ts\n+++ b/router.ts\n@@ -1 +1 @@\n+sanitized',
          changeSummary: 'Added path normalizer and bounds check',
        },
        reviewReport: sampleApprovedReport,
      },
    ];

    const html = renderToString(
      <ReviewFindingsList
        report={sampleApprovedReport}
        revisionHistory={history}
        revisionCount={2}
      />
    );

    expect(html).toContain('Audits:');
    expect(html).toContain('Review #1');
    expect(html).toContain('(Initial Audit)');
    expect(html).toContain('Review #2');
    expect(html).toContain('(Feedback Loop Audit #1)');
    expect(html).toContain('Latest');
  });

  it('collapses content when collapsible is true and defaultOpen is false', () => {
    const html = renderToString(
      <ReviewFindingsList report={sampleReportWithFindings} collapsible defaultOpen={false} />
    );

    expect(html).toContain('Independent Review Audit');
    expect(html).toContain('role="button"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Expand Independent Review Audit"');
    expect(html).not.toContain('Detailed Findings (2)');
  });

  it('expands content when collapsible is true and defaultOpen is true', () => {
    const html = renderToString(
      <ReviewFindingsList report={sampleReportWithFindings} collapsible defaultOpen={true} />
    );

    expect(html).toContain('Independent Review Audit');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-label="Collapse Independent Review Audit"');
    expect(html).toContain('Detailed Findings (2)');
  });

  it('applies custom className, id, and style props to container', () => {
    const html = renderToString(
      <ReviewFindingsList
        report={sampleReportWithFindings}
        id="custom-review-findings"
        className="test-review-class"
        style={{ marginTop: '10px' }}
      />
    );

    expect(html).toContain('id="custom-review-findings"');
    expect(html).toContain('glass-panel test-review-class');
    expect(html).toContain('margin-top:10px');
  });
});
