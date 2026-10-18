import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { EmptyState } from './EmptyState';

describe('EmptyState Component', () => {
  it('renders title and description', () => {
    const html = renderToString(
      <EmptyState
        title="No Repositories Found"
        description="Try searching with a different URL or keyword."
      />
    );
    expect(html).toContain('No Repositories Found');
    expect(html).toContain('Try searching with a different URL or keyword.');
    expect(html).toContain('empty-state');
  });

  it('renders default icon when none is provided', () => {
    const html = renderToString(
      <EmptyState title="Default Icon" description="Testing default icon render" />
    );
    // Lucide GitPullRequest SVG renders with svg tag
    expect(html).toContain('<svg');
  });

  it('renders custom icon when provided', () => {
    const customIcon = <span data-testid="custom-test-icon">CustomIconMarker</span>;
    const html = renderToString(
      <EmptyState
        icon={customIcon}
        title="Custom Icon State"
        description="Testing custom icon"
      />
    );
    expect(html).toContain('CustomIconMarker');
  });

  it('renders action button or element when provided', () => {
    const actionButton = <button type="button">Create Repository</button>;
    const html = renderToString(
      <EmptyState
        title="Action State"
        description="With an action element"
        action={actionButton}
      />
    );
    expect(html).toContain('Create Repository');
    expect(html).toContain('<button type="button">');
  });

  it('omits action container when action prop is not provided', () => {
    const html = renderToString(
      <EmptyState title="No Action" description="Without action" />
    );
    expect(html).not.toContain('<button');
  });

  it('merges custom className and applies custom id and style', () => {
    const html = renderToString(
      <EmptyState
        id="custom-empty-id"
        className="my-custom-empty-class"
        style={{ opacity: 0.85 }}
        title="Styled State"
        description="Testing styles and classes"
      />
    );
    expect(html).toContain('id="custom-empty-id"');
    expect(html).toContain('empty-state my-custom-empty-class');
    expect(html).toContain('opacity:0.85');
  });
});
