import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AcceptanceCriteriaChecklist } from './AcceptanceCriteriaChecklist';
import type { AcceptanceCriterion, AcceptanceCriterionResult } from '../../lib/types';

describe('AcceptanceCriteriaChecklist Component', () => {
  const sampleCriteria: AcceptanceCriterion[] = [
    {
      id: 'AC-1',
      description: 'Disallow dot-dot sequence traversal in static file resolver',
      inferred: false,
    },
    {
      id: 'AC-2',
      description: 'Preserve existing behavior for valid relative static assets',
      inferred: true,
    },
  ];

  it('renders title, description, and criteria items with IDs', () => {
    const html = renderToString(
      <AcceptanceCriteriaChecklist criteria={sampleCriteria} />
    );

    expect(html).toContain('Acceptance Criteria Verification');
    expect(html).toContain('Requirements extracted by Issue Analyst and audited by Review Agent');
    expect(html).toContain('[AC-1]');
    expect(html).toContain('Disallow dot-dot sequence traversal in static file resolver');
    expect(html).toContain('[AC-2]');
    expect(html).toContain('Preserve existing behavior for valid relative static assets');
    expect(html).toContain('(Inferred from issue context)');
  });

  it('renders satisfaction summary badge when results are provided', () => {
    const results: AcceptanceCriterionResult[] = [
      {
        criterionId: 'AC-1',
        status: 'satisfied',
        explanation: 'Path normalization correctly strips dot-dot segments.',
      },
      {
        criterionId: 'AC-2',
        status: 'satisfied',
        explanation: 'Regression test passes for standard paths.',
      },
    ];

    const html = renderToString(
      <AcceptanceCriteriaChecklist criteria={sampleCriteria} results={results} />
    );

    expect(html).toContain('2/2 Satisfied');
    expect(html).toContain('Reviewer note:');
    expect(html).toContain('Path normalization correctly strips dot-dot segments.');
  });

  it('renders varied evaluation status badges', () => {
    const partialResults: AcceptanceCriterionResult[] = [
      {
        criterionId: 'AC-1',
        status: 'partially-satisfied',
        explanation: 'Missing Windows path separator validation.',
      },
      {
        criterionId: 'AC-2',
        status: 'not-satisfied',
        explanation: 'Breaking change introduced on relative paths.',
      },
    ];

    const html = renderToString(
      <AcceptanceCriteriaChecklist criteria={sampleCriteria} results={partialResults} />
    );

    expect(html).toContain('Partially Satisfied');
    expect(html).toContain('Not Satisfied');
    expect(html).toContain('0/2 Satisfied');
  });

  it('renders unverified status when test runner is unavailable', () => {
    const unverifiedResults: AcceptanceCriterionResult[] = [
      {
        criterionId: 'AC-1',
        status: 'unable-to-verify',
        explanation: 'No automated tests available for manual verification.',
      },
    ];

    const html = renderToString(
      <AcceptanceCriteriaChecklist criteria={sampleCriteria} results={unverifiedResults} />
    );

    expect(html).toContain('Unverified (No Test Runner)');
  });

  it('renders default badge when criterion has not been evaluated', () => {
    const html = renderToString(
      <AcceptanceCriteriaChecklist criteria={sampleCriteria} />
    );

    expect(html).toContain('Not yet evaluated');
  });

  it('renders empty fallback when criteria list is empty', () => {
    const html = renderToString(
      <AcceptanceCriteriaChecklist criteria={[]} />
    );

    expect(html).toContain('No acceptance criteria recorded yet.');
  });

  it('supports collapsible mode with aria attributes', () => {
    const openHtml = renderToString(
      <AcceptanceCriteriaChecklist
        criteria={sampleCriteria}
        collapsible={true}
        defaultOpen={true}
      />
    );
    expect(openHtml).toContain('aria-expanded="true"');

    const closedHtml = renderToString(
      <AcceptanceCriteriaChecklist
        criteria={sampleCriteria}
        collapsible={true}
        defaultOpen={false}
      />
    );
    expect(closedHtml).toContain('aria-expanded="false"');
  });

  it('applies custom className, id, and style props to outer container', () => {
    const html = renderToString(
      <AcceptanceCriteriaChecklist
        criteria={sampleCriteria}
        id="custom-ac-checklist"
        className="my-ac-style"
        style={{ borderWidth: '2px' }}
      />
    );

    expect(html).toContain('id="custom-ac-checklist"');
    expect(html).toContain('acceptance-criteria-checklist my-ac-style');
    expect(html).toContain('border-width:2px');
  });
});
