import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ImplementationPlanView } from './ImplementationPlanView';
import type { ImplementationPlan } from '../../lib/types';

describe('ImplementationPlanView Component', () => {
  const samplePlan: ImplementationPlan = {
    implementationStrategy: 'Refactor URL parser to sanitize dot-dot sequences before path resolution.',
    plannedChanges: [
      {
        file: 'src/server/router.ts',
        action: 'modify',
        description: 'Add canonical path sanitizer in request dispatcher',
        relatedCriteria: ['AC-1', 'AC-2'],
      },
      {
        file: 'src/server/security.ts',
        action: 'create',
        description: 'New path traversal guard utilities',
        relatedCriteria: ['AC-1'],
      },
      {
        file: 'src/server/legacy-resolver.ts',
        action: 'delete',
        description: 'Remove deprecated unsafe path resolver',
        relatedCriteria: [],
      },
    ],
    testPlan: [
      {
        file: 'src/server/router.test.ts',
        description: 'Verify URL sanitizer blocks directory traversal attacks',
        type: 'unit',
      },
      {
        file: 'tests/e2e/security.spec.ts',
        description: 'End-to-end traversal probe tests',
        type: 'integration',
      },
    ],
    risks: [
      {
        description: 'High latency on deep recursive paths',
        severity: 'medium',
        mitigation: 'Memoize resolved canonical paths in LRU cache',
      },
    ],
    risksAndMitigations: [
      {
        risk: 'Potential regression in URL encoded filenames',
        mitigation: 'Add test suite covering percent-encoded dots and slashes',
      },
    ],
    assumptions: [
      'Node.js 18+ runtime with URL standard compliance',
      'All paths are UTF-8 encoded strings',
    ],
    acceptanceCriterionMapping: [
      {
        criterionId: 'AC-1',
        plannedChanges: ['src/server/router.ts', 'src/server/security.ts'],
      },
    ],
    rollbackConsiderations: [
      'Feature flag `ENABLE_STRICT_RESOLVER` can be toggled off immediately if regressions occur',
    ],
  };

  it('renders strategy, planned file changes, and action badges', () => {
    const html = renderToString(<ImplementationPlanView plan={samplePlan} />);

    expect(html).toContain('Implementation Strategy &amp; Plan');
    expect(html).toContain('3 Planned Changes');
    expect(html).toContain('Strategy');
    expect(html).toContain('Refactor URL parser to sanitize dot-dot sequences before path resolution.');

    expect(html).toContain('Planned File Changes (3)');
    expect(html).toContain('title="3 total file operations planned"');
    expect(html).toContain('src/server/router.ts');
    expect(html).toContain('Modify');
    expect(html).toContain('title="Modify existing file"');
    expect(html).toContain('Add canonical path sanitizer in request dispatcher');
    expect(html).toContain('AC-1');
    expect(html).toContain('title="Linked acceptance criterion AC-1"');
    expect(html).toContain('AC-2');

    expect(html).toContain('src/server/security.ts');
    expect(html).toContain('Create');
    expect(html).toContain('title="Create new file"');

    expect(html).toContain('src/server/legacy-resolver.ts');
    expect(html).toContain('Delete');
    expect(html).toContain('title="Delete obsolete file"');
  });

  it('renders structured test plan items', () => {
    const html = renderToString(<ImplementationPlanView plan={samplePlan} />);

    expect(html).toContain('Test Plan &amp; Verification Strategy');
    expect(html).toContain('src/server/router.test.ts');
    expect(html).toContain('Verify URL sanitizer blocks directory traversal attacks');
    expect(html).toContain('unit');
    expect(html).toContain('tests/e2e/security.spec.ts');
    expect(html).toContain('integration');
  });

  it('renders string test plan fallback', () => {
    const stringPlan: ImplementationPlan = {
      ...samplePlan,
      testPlan: 'Run `npm test` and verify zero regression in router tests.',
    };

    const html = renderToString(<ImplementationPlanView plan={stringPlan} />);

    expect(html).toContain('Test Plan &amp; Verification Strategy');
    expect(html).toContain('Run `npm test` and verify zero regression in router tests.');
  });

  it('renders risks and mitigations from both formats with severity badges', () => {
    const html = renderToString(<ImplementationPlanView plan={samplePlan} />);

    expect(html).toContain('Risks &amp; Mitigations');
    expect(html).toContain('Risk: High latency on deep recursive paths');
    expect(html).toContain('medium');
    expect(html).toContain('title="Risk severity level: medium"');
    expect(html).toContain('Mitigation: Memoize resolved canonical paths in LRU cache');
    expect(html).toContain('Risk: Potential regression in URL encoded filenames');
    expect(html).toContain('Mitigation: Add test suite covering percent-encoded dots and slashes');
  });

  it('renders assumptions and rollback considerations', () => {
    const html = renderToString(<ImplementationPlanView plan={samplePlan} />);

    expect(html).toContain('Assumptions');
    expect(html).toContain('Node.js 18+ runtime with URL standard compliance');
    expect(html).toContain('All paths are UTF-8 encoded strings');

    expect(html).toContain('Rollback Considerations');
    expect(html).toContain('Feature flag `ENABLE_STRICT_RESOLVER` can be toggled off immediately if regressions occur');
  });

  it('renders acceptance criteria coverage mapping', () => {
    const html = renderToString(<ImplementationPlanView plan={samplePlan} />);

    expect(html).toContain('Acceptance Criteria Coverage');
    expect(html).toContain('AC-1');
    expect(html).toContain('2 linked changes');
  });

  it('collapses content when collapsible is true and defaultOpen is false', () => {
    const html = renderToString(
      <ImplementationPlanView plan={samplePlan} collapsible defaultOpen={false} />
    );

    expect(html).toContain('Implementation Strategy &amp; Plan');
    expect(html).toContain('role="button"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Expand Implementation Strategy &amp; Plan"');
    // Main strategy section should not be rendered
    expect(html).not.toContain('Refactor URL parser to sanitize dot-dot sequences before path resolution.');
  });

  it('expands content when collapsible is true and defaultOpen is true', () => {
    const html = renderToString(
      <ImplementationPlanView plan={samplePlan} collapsible defaultOpen={true} />
    );

    expect(html).toContain('Implementation Strategy &amp; Plan');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-label="Collapse Implementation Strategy &amp; Plan"');
    expect(html).toContain('Refactor URL parser to sanitize dot-dot sequences before path resolution.');
  });

  it('applies custom className, id, and style props to container', () => {
    const html = renderToString(
      <ImplementationPlanView
        plan={samplePlan}
        id="custom-plan-view"
        className="test-plan-container"
        style={{ opacity: 0.95 }}
      />
    );

    expect(html).toContain('id="custom-plan-view"');
    expect(html).toContain('glass-panel test-plan-container');
    expect(html).toContain('opacity:0.95');
  });
});
