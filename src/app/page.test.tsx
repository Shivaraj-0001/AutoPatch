import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import HomePage from './page';
import RootLayout, { metadata, viewport } from './layout';

vi.mock('@/components/AutoPatchApp', () => ({
  AutoPatchApp: () => React.createElement('div', { 'data-testid': 'mock-autopatch-app' }, 'AutoPatch Mock'),
  default: () => React.createElement('div', { 'data-testid': 'mock-autopatch-app' }, 'AutoPatch Mock'),
}));

describe('Application Shell (Layout and Page)', () => {
  it('defines comprehensive SEO metadata', () => {
    expect(metadata.title).toBe('AutoPatch — Autonomous Multi-Agent Open-Source Contribution System');
    expect(metadata.description).toContain('Turn public GitHub issues into verified, reviewable code contributions');
    expect(metadata.icons).toEqual({ icon: '/hero.png' });
  });

  it('defines viewport settings with theme color', () => {
    expect(viewport.themeColor).toBe('#0a0e17');
    expect(viewport.width).toBe('device-width');
    expect(viewport.initialScale).toBe(1);
  });

  it('renders RootLayout with preconnect fonts and children', () => {
    const html = renderToString(
      React.createElement(
        RootLayout,
        null,
        React.createElement('div', { id: 'child-content' }, 'App Content'),
      ),
    );

    expect(html).toContain('fonts.googleapis.com');
    expect(html).toContain('fonts.gstatic.com');
    expect(html).toContain('App Content');
    expect(html).toContain('id="child-content"');
  });

  it('renders HomePage successfully', () => {
    const html = renderToString(React.createElement(HomePage));
    expect(html).toBeDefined();
  });
});
