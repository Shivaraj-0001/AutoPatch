import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CollapsibleSection } from './CollapsibleSection';

describe('CollapsibleSection Component', () => {
  it('renders title and open content by default', () => {
    const html = renderToString(
      <CollapsibleSection title="Execution Steps">
        <div data-testid="section-content">Step 1: Cloning repository</div>
      </CollapsibleSection>
    );

    expect(html).toContain('Execution Steps');
    expect(html).toContain('Step 1: Cloning repository');
    expect(html).toContain('aria-expanded="true"');
  });

  it('omits children when defaultOpen is false', () => {
    const html = renderToString(
      <CollapsibleSection title="Collapsed View" defaultOpen={false}>
        <div>Hidden Content</div>
      </CollapsibleSection>
    );

    expect(html).toContain('Collapsed View');
    expect(html).not.toContain('Hidden Content');
    expect(html).toContain('aria-expanded="false"');
  });

  it('renders subtitle, icon, and badge when provided', () => {
    const icon = <span data-testid="section-icon">📁</span>;
    const badge = <span data-testid="section-badge">Completed</span>;

    const html = renderToString(
      <CollapsibleSection
        title="Artifacts"
        subtitle="Generated patches and logs"
        icon={icon}
        badge={badge}
      >
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(html).toContain('📁');
    expect(html).toContain('Completed');
    expect(html).toContain('Generated patches and logs');
  });

  it('renders headerRight slot when provided', () => {
    const headerRight = <button type="button">Copy Diff</button>;

    const html = renderToString(
      <CollapsibleSection title="Diff" headerRight={headerRight}>
        <div>Diff Content</div>
      </CollapsibleSection>
    );

    expect(html).toContain('Copy Diff');
  });

  it('supports controlled isOpen mode', () => {
    const openHtml = renderToString(
      <CollapsibleSection title="Controlled Open" isOpen={true}>
        <div>Open Content</div>
      </CollapsibleSection>
    );
    expect(openHtml).toContain('aria-expanded="true"');
    expect(openHtml).toContain('Open Content');

    const closedHtml = renderToString(
      <CollapsibleSection title="Controlled Closed" isOpen={false}>
        <div>Closed Content</div>
      </CollapsibleSection>
    );
    expect(closedHtml).toContain('aria-expanded="false"');
    expect(closedHtml).not.toContain('Closed Content');
  });

  it('associates aria-controls with content id when id is provided', () => {
    const html = renderToString(
      <CollapsibleSection id="custom-section" title="Section Title">
        <div>Content with id</div>
      </CollapsibleSection>
    );

    expect(html).toContain('id="custom-section"');
    expect(html).toContain('aria-controls="custom-section-content"');
    expect(html).toContain('id="custom-section-content"');
  });

  it('merges custom className and applies custom style', () => {
    const html = renderToString(
      <CollapsibleSection
        title="Custom Classes"
        className="extra-section-class"
        style={{ opacity: 0.95 }}
      >
        <div>Styled Content</div>
      </CollapsibleSection>
    );

    expect(html).toContain('collapsible-section extra-section-class');
    expect(html).toContain('opacity:0.95');
  });
});
