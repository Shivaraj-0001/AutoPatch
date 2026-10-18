import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AutoPatchApp } from './AutoPatchApp';
import type { PublicConfig, RunHistoryItem } from '@/lib/types';

const { mockConfig, mockHistory } = vi.hoisted(() => ({
  mockConfig: {
    aiConfigured: true,
    githubTokenConfigured: true,
    aiProvider: 'groq',
    aiModel: 'llama-3.3-70b-versatile',
    maxRevisionAttempts: 2,
    scoutMaxFiles: 60,
  },
  mockHistory: [
    {
      id: 'run-history-1',
      repository: 'facebook/react',
      issueNumber: 101,
      issueTitle: 'Test issue title',
      status: 'completed' as const,
      currentAgent: null,
      createdAt: '2026-10-18T08:00:00Z',
      updatedAt: '2026-10-18T08:05:00Z',
    },
  ],
}));

vi.mock('@/lib/api', () => ({
  fetchPublicConfig: vi.fn().mockResolvedValue(mockConfig),
  getPatchDownloadUrl: vi.fn((id: string) => `/api/runs/${id}/patch`),
}));

vi.mock('@/lib/indexeddb', () => ({
  getAppState: vi.fn().mockResolvedValue(null),
  setAppState: vi.fn().mockResolvedValue(undefined),
  getRun: vi.fn().mockResolvedValue(null),
  downloadPatchBlob: vi.fn(),
}));

vi.mock('@/hooks/useWorkflowRun', () => ({
  useWorkflowRun: () => ({
    run: null,
    isLoading: false,
    error: null,
    start: vi.fn(),
    loadRun: vi.fn(),
    cancel: vi.fn(),
    refine: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock('@/hooks/useRunHistory', () => ({
  useRunHistory: () => ({
    history: mockHistory,
    loading: false,
    refreshHistory: vi.fn(),
    deleteHistoryItem: vi.fn(),
    clearAllHistory: vi.fn(),
  }),
}));

describe('AutoPatchApp Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default workspace view with Header, Sidebar, and WorkspacePage form', () => {
    const html = renderToString(React.createElement(AutoPatchApp));

    expect(html).toContain('AutoPatch');
    expect(html).toContain('Workspace');
    expect(html).toContain('History');
    expect(html).toContain('Settings');
    expect(html).toContain('Recent Contributions');
    expect(html).toContain('Target Open-Source Issue');
    expect(html).toContain('Autonomous Contribution Pipeline');
    expect(html).toContain('role="main"');
    expect(html).toContain('aria-label="Main Application Content"');
    expect(html).toContain('class="app-body-container"');
  });

  it('renders HistoryPage view when initialTab is set to history', () => {
    const html = renderToString(
      React.createElement(AutoPatchApp, { initialTab: 'history' }),
    );

    expect(html).toContain('Contribution Run History');
    expect(html).toContain('IndexedDB Synced');
    expect(html).toContain('facebook/react');
    expect(html).toContain('#101: Test issue title');
  });

  it('renders SettingsPage view when initialTab is set to settings', () => {
    const html = renderToString(
      React.createElement(AutoPatchApp, { initialTab: 'settings' }),
    );

    expect(html).toContain('System Configuration');
    expect(html).toContain('Inference provider status and orchestration parameters');
    expect(html).toContain('AI Model &amp; Inference Provider');
    expect(html).toContain('Orchestration &amp; Safety Specs');
  });

  it('applies custom className, id, and style to the root element', () => {
    const html = renderToString(
      React.createElement(AutoPatchApp, {
        className: 'custom-app-class',
        id: 'autopatch-root',
        style: { zIndex: 10 },
      }),
    );

    expect(html).toContain('id="autopatch-root"');
    expect(html).toContain('class="autopatch-app custom-app-class"');
    expect(html).toContain('z-index:10');
  });
});
