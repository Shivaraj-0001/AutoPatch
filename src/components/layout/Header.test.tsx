import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Header } from './Header';
import type { PublicConfig } from '../../lib/types';

describe('Header Component', () => {
  const mockConfig: PublicConfig = {
    aiConfigured: true,
    githubTokenConfigured: true,
    aiProvider: 'openai',
    aiModel: 'gpt-4o-mini',
    maxRevisionAttempts: 3,
  };

  it('renders application brand and navigation tabs', () => {
    const html = renderToString(
      <Header
        config={mockConfig}
        activeTab="workspace"
        setActiveTab={() => {}}
        onNewRun={() => {}}
      />
    );

    expect(html).toContain('Auto');
    expect(html).toContain('Patch');
    expect(html).toContain('Workspace');
    expect(html).toContain('History');
    expect(html).toContain('Settings');
    expect(html).toContain('app-header');
  });

  it('sets aria-current="page" on the active navigation tab', () => {
    const html = renderToString(
      <Header
        config={mockConfig}
        activeTab="history"
        setActiveTab={() => {}}
        onNewRun={() => {}}
      />
    );

    expect(html).toContain('aria-current="page"');
    expect(html).toContain('btn-secondary');
  });

  it('renders configured AI model pill with provider information', () => {
    const html = renderToString(
      <Header
        config={mockConfig}
        activeTab="workspace"
        setActiveTab={() => {}}
        onNewRun={() => {}}
      />
    );

    expect(html).toContain('gpt-4o-mini');
    expect(html).toContain('Provider: openai');
    expect(html).toContain('var(--accent-emerald)');
  });

  it('renders unconfigured AI status pill when aiConfigured is false', () => {
    const unconfiguredConfig: PublicConfig = {
      ...mockConfig,
      aiConfigured: false,
      aiModel: '',
    };

    const html = renderToString(
      <Header
        config={unconfiguredConfig}
        activeTab="workspace"
        setActiveTab={() => {}}
        onNewRun={() => {}}
      />
    );

    expect(html).toContain('var(--accent-amber)');
    expect(html).toContain('HF Inference');
  });

  it('renders fallback when config is null', () => {
    const html = renderToString(
      <Header
        config={null}
        activeTab="workspace"
        setActiveTab={() => {}}
        onNewRun={() => {}}
      />
    );

    expect(html).toContain('Loading config...');
    expect(html).toContain('HF Inference');
  });

  it('renders sidebar toggle button on workspace tab when handler provided', () => {
    const onToggleSidebar = vi.fn();
    const html = renderToString(
      <Header
        config={mockConfig}
        activeTab="workspace"
        setActiveTab={() => {}}
        onNewRun={() => {}}
        isSidebarOpen={true}
        onToggleSidebar={onToggleSidebar}
      />
    );

    expect(html).toContain('title="Hide sidebar"');
  });

  it('omits sidebar toggle button when on history or settings tab', () => {
    const html = renderToString(
      <Header
        config={mockConfig}
        activeTab="history"
        setActiveTab={() => {}}
        onNewRun={() => {}}
        onToggleSidebar={() => {}}
      />
    );

    expect(html).not.toContain('title="Hide sidebar"');
    expect(html).not.toContain('title="Show sidebar"');
  });

  it('renders New Contribution button with CTA label', () => {
    const html = renderToString(
      <Header
        config={mockConfig}
        activeTab="workspace"
        setActiveTab={() => {}}
        onNewRun={() => {}}
      />
    );

    expect(html).toContain('New Contribution');
    expect(html).not.toContain('disabled=""');
  });

  it('disables New Contribution button when newRunDisabled is true', () => {
    const html = renderToString(
      <Header
        config={mockConfig}
        activeTab="workspace"
        setActiveTab={() => {}}
        onNewRun={() => {}}
        newRunDisabled={true}
      />
    );

    expect(html).toContain('disabled=""');
  });

  it('applies custom className, id, and style props', () => {
    const html = renderToString(
      <Header
        id="main-app-header"
        className="custom-header-class"
        style={{ opacity: 0.98 }}
        config={mockConfig}
        activeTab="workspace"
        setActiveTab={() => {}}
        onNewRun={() => {}}
      />
    );

    expect(html).toContain('id="main-app-header"');
    expect(html).toContain('app-header custom-header-class');
    expect(html).toContain('opacity:0.98');
  });
});
