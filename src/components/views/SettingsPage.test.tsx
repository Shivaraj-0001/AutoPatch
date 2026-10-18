import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SettingsPage } from './SettingsPage';
import type { PublicConfig } from '@/lib/types';

describe('SettingsPage Component', () => {
  const mockOnRefresh = vi.fn();

  const mockConfig: PublicConfig = {
    aiConfigured: true,
    githubTokenConfigured: true,
    aiProvider: 'groq',
    aiModel: 'llama-3.3-70b-versatile',
    maxRevisionAttempts: 3,
    scoutMaxFiles: 80,
  };

  it('renders header, title, and description', () => {
    const html = renderToString(
      React.createElement(SettingsPage, {
        config: mockConfig,
        onRefreshConfig: mockOnRefresh,
      }),
    );

    expect(html).toContain('System Configuration');
    expect(html).toContain('Inference provider status and orchestration parameters');
    expect(html).toContain('AI Model &amp; Inference Provider');
    expect(html).toContain('Orchestration &amp; Safety Specs');
  });

  it('renders Connected badge when aiConfigured is true', () => {
    const html = renderToString(
      React.createElement(SettingsPage, {
        config: mockConfig,
        onRefreshConfig: mockOnRefresh,
      }),
    );

    expect(html).toContain('Connected');
    expect(html).not.toContain('Not Configured');
  });

  it('renders Not Configured badge when aiConfigured is false or null', () => {
    const html = renderToString(
      React.createElement(SettingsPage, {
        config: { ...mockConfig, aiConfigured: false },
        onRefreshConfig: mockOnRefresh,
      }),
    );

    expect(html).toContain('Not Configured');
    expect(html).not.toContain('Connected');
  });

  it('displays provider and model details from config', () => {
    const html = renderToString(
      React.createElement(SettingsPage, {
        config: mockConfig,
        onRefreshConfig: mockOnRefresh,
      }),
    );

    expect(html).toContain('groq');
    expect(html).toContain('llama-3.3-70b-versatile');
    expect(html).toContain('3 cycles');
    expect(html).toContain('Max 80 files / 100KB per file');
  });

  it('falls back to default parameters when config is null', () => {
    const html = renderToString(
      React.createElement(SettingsPage, {
        config: null,
        onRefreshConfig: mockOnRefresh,
      }),
    );

    expect(html).toContain('Not Configured');
    expect(html).toContain('groq');
    expect(html).toContain('openai/gpt-oss-120b');
    expect(html).toContain('2 cycles');
    expect(html).toContain('Max 60 files / 100KB per file');
  });

  it('renders safety validator specifications', () => {
    const html = renderToString(
      React.createElement(SettingsPage, {
        config: mockConfig,
        onRefreshConfig: mockOnRefresh,
      }),
    );

    expect(html).toContain('Patch Safety Validator');
    expect(html).toContain('Active (Traversal &amp; Sensitive Protection)');
  });

  it('renders refresh button with accessible attributes', () => {
    const html = renderToString(
      React.createElement(SettingsPage, {
        config: mockConfig,
        onRefreshConfig: mockOnRefresh,
      }),
    );

    expect(html).toContain('aria-label="Refresh system configuration"');
    expect(html).toContain('Refresh');
  });

  it('displays loading state and disabled button when loading is true', () => {
    const html = renderToString(
      React.createElement(SettingsPage, {
        config: mockConfig,
        onRefreshConfig: mockOnRefresh,
        loading: true,
      }),
    );

    expect(html).toContain('Refreshing...');
    expect(html).toContain('disabled=""');
    expect(html).toContain('animate-spin');
  });

  it('applies custom className, id, and style to root element', () => {
    const html = renderToString(
      React.createElement(SettingsPage, {
        config: mockConfig,
        onRefreshConfig: mockOnRefresh,
        className: 'custom-settings-panel',
        id: 'settings-root',
        style: { marginTop: '20px' },
      }),
    );

    expect(html).toContain('id="settings-root"');
    expect(html).toContain('class="settings-page custom-settings-panel"');
    expect(html).toContain('margin-top:20px');
  });
});
