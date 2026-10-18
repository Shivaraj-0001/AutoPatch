import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { RepositoryIssueForm } from './RepositoryIssueForm';

describe('RepositoryIssueForm Component', () => {
  const defaultProps = {
    onIssueLoaded: vi.fn(),
    onStartRun: vi.fn(),
    isLoading: false,
  };

  it('renders title, inputs, sample preset button, and action buttons', () => {
    const html = renderToString(<RepositoryIssueForm {...defaultProps} />);

    expect(html).toContain('Target Open-Source Issue');
    expect(html).toContain('Enter any public GitHub repository and issue to resolve');
    expect(html).toContain('Load Sample (Express #5920)');
    expect(html).toContain('Repository URL');
    expect(html).toContain('Issue #');
    expect(html).toContain('Inspect Issue');
    expect(html).toContain('Start Run');
  });

  it('populates initial form values when provided', () => {
    const html = renderToString(
      <RepositoryIssueForm
        {...defaultProps}
        initialRepoUrl="https://github.com/facebook/react"
        initialIssueNumber={24000}
      />
    );

    expect(html).toContain('value="https://github.com/facebook/react"');
    expect(html).toContain('value="24000"');
  });

  it('renders advanced options section when initial instructions or target branch are passed', () => {
    const html = renderToString(
      <RepositoryIssueForm
        {...defaultProps}
        initialInstructions="Preserve backward compatibility"
        initialTargetBranch="develop"
      />
    );

    expect(html).toContain('Custom Constraints / Instructions');
    expect(html).toContain('value="Preserve backward compatibility"');
    expect(html).toContain('Target Branch');
    expect(html).toContain('value="develop"');
    expect(html).toContain('aria-expanded="true"');
  });

  it('renders loading state when isLoading is true', () => {
    const html = renderToString(
      <RepositoryIssueForm
        {...defaultProps}
        isLoading={true}
        initialRepoUrl="https://github.com/expressjs/express"
        initialIssueNumber={5920}
      />
    );

    expect(html).toContain('Generating...');
    expect(html).toContain('disabled=""');
  });

  it('includes accessible labels, ids, and controls', () => {
    const html = renderToString(<RepositoryIssueForm {...defaultProps} />);

    expect(html).toContain('id="repo-url-input"');
    expect(html).toContain('aria-label="Repository URL"');
    expect(html).toContain('id="issue-number-input"');
    expect(html).toContain('aria-label="Issue Number"');
    expect(html).toContain('aria-controls="advanced-form-options"');
  });

  it('applies custom className, id, and style props to outer container', () => {
    const html = renderToString(
      <RepositoryIssueForm
        {...defaultProps}
        id="custom-repo-form"
        className="custom-form-class"
        style={{ marginTop: '24px' }}
      />
    );

    expect(html).toContain('id="custom-repo-form"');
    expect(html).toContain('repository-issue-form custom-form-class');
    expect(html).toContain('margin-top:24px');
  });
});
