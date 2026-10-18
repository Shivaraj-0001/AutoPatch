import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HistoryPage } from './HistoryPage';
import type { RunHistoryItem } from '@/lib/types';

describe('HistoryPage Component', () => {
  const mockOnSelectRun = vi.fn();
  const mockOnNewRun = vi.fn();
  const mockOnDeleteRun = vi.fn().mockResolvedValue(undefined);
  const mockOnClearHistory = vi.fn().mockResolvedValue(undefined);

  const sampleRuns: RunHistoryItem[] = [
    {
      id: 'run-101',
      repository: 'facebook/react',
      issueNumber: 101,
      issueTitle: 'Fix edge case in hooks dispatcher',
      status: 'completed',
      currentAgent: null,
      createdAt: '2026-10-18T08:00:00Z',
      updatedAt: '2026-10-18T08:05:00Z',
      revisionCount: 2,
    },
    {
      id: 'run-102',
      repository: 'vuejs/core',
      issueNumber: 42,
      issueTitle: 'Reactivity memory leak in effectScope',
      status: 'running',
      currentAgent: 'coding',
      createdAt: '2026-10-18T09:30:00Z',
      updatedAt: '2026-10-18T09:32:00Z',
    },
    {
      id: 'run-103',
      repository: 'vercel/next.js',
      issueNumber: 999,
      issueTitle: 'Turbopack build error with dynamic imports',
      status: 'failed',
      currentAgent: 'reviewer',
      createdAt: '2026-10-18T10:15:00Z',
      updatedAt: '2026-10-18T10:18:00Z',
    },
    {
      id: 'run-104',
      repository: 'tailwindlabs/tailwindcss',
      issueNumber: 55,
      issueTitle: 'Arbitrary values parser bug',
      status: 'cancelled',
      currentAgent: null,
      createdAt: '2026-10-18T11:00:00Z',
      updatedAt: '2026-10-18T11:01:00Z',
    },
    {
      id: 'run-105',
      repository: 'vitejs/vite',
      issueNumber: 1234,
      issueTitle: 'HMR reload loop with circular modules',
      status: 'queued',
      currentAgent: null,
      createdAt: '2026-10-18T11:30:00Z',
      updatedAt: '2026-10-18T11:30:00Z',
    },
  ];

  it('renders loading state when loading is true and history is empty', () => {
    const html = renderToString(
      React.createElement(HistoryPage, {
        history: [],
        loading: true,
        onSelectRun: mockOnSelectRun,
        onNewRun: mockOnNewRun,
      }),
    );

    expect(html).toContain('Loading runs from IndexedDB...');
    expect(html).not.toContain('No runs recorded yet');
  });

  it('renders empty history prompt when not loading and history is empty', () => {
    const html = renderToString(
      React.createElement(HistoryPage, {
        history: [],
        loading: false,
        onSelectRun: mockOnSelectRun,
        onNewRun: mockOnNewRun,
      }),
    );

    expect(html).toContain('No runs recorded yet');
    expect(html).toContain('Submit an open-source issue in the workspace');
    expect(html).toContain('Go to Workspace');
    expect(html).not.toContain('Clear History');
  });

  it('renders header, IndexedDB badge, and New Contribution button', () => {
    const html = renderToString(
      React.createElement(HistoryPage, {
        history: sampleRuns,
        loading: false,
        onSelectRun: mockOnSelectRun,
        onNewRun: mockOnNewRun,
      }),
    );

    expect(html).toContain('Contribution Run History');
    expect(html).toContain('IndexedDB Synced');
    expect(html).toContain('New Contribution');
  });

  it('renders list of runs with repository names, issues, and status badges', () => {
    const html = renderToString(
      React.createElement(HistoryPage, {
        history: sampleRuns,
        loading: false,
        onSelectRun: mockOnSelectRun,
        onNewRun: mockOnNewRun,
      }),
    );

    expect(html).toContain('facebook/react');
    expect(html).toContain('#101: Fix edge case in hooks dispatcher');
    expect(html).toContain('Completed');

    expect(html).toContain('vuejs/core');
    expect(html).toContain('#42: Reactivity memory leak in effectScope');
    expect(html).toContain('Running');

    expect(html).toContain('vercel/next.js');
    expect(html).toContain('#999: Turbopack build error with dynamic imports');
    expect(html).toContain('Failed');

    expect(html).toContain('tailwindlabs/tailwindcss');
    expect(html).toContain('#55: Arbitrary values parser bug');
    expect(html).toContain('Cancelled');

    expect(html).toContain('vitejs/vite');
    expect(html).toContain('#1234: HMR reload loop with circular modules');
    expect(html).toContain('Queued');
  });

  it('renders multi-revision tag when revisionCount is greater than 1', () => {
    const html = renderToString(
      React.createElement(HistoryPage, {
        history: sampleRuns,
        loading: false,
        onSelectRun: mockOnSelectRun,
        onNewRun: mockOnNewRun,
      }),
    );

    expect(html).toContain('2 Revisions');
  });

  it('renders patch download button only for completed runs', () => {
    const html = renderToString(
      React.createElement(HistoryPage, {
        history: sampleRuns,
        loading: false,
        onSelectRun: mockOnSelectRun,
        onNewRun: mockOnNewRun,
      }),
    );

    expect(html).toContain('aria-label="Download patch for facebook/react #101"');
    expect(html).not.toContain('aria-label="Download patch for vuejs/core #42"');
    expect(html).not.toContain('aria-label="Download patch for vercel/next.js #999"');
  });

  it('renders Clear History button when onClearHistory is supplied and history is not empty', () => {
    const html = renderToString(
      React.createElement(HistoryPage, {
        history: sampleRuns,
        loading: false,
        onSelectRun: mockOnSelectRun,
        onNewRun: mockOnNewRun,
        onClearHistory: mockOnClearHistory,
      }),
    );

    expect(html).toContain('Clear History');
    expect(html).toContain('aria-label="Clear all contribution history"');
  });

  it('omits Clear History button when onClearHistory is omitted', () => {
    const html = renderToString(
      React.createElement(HistoryPage, {
        history: sampleRuns,
        loading: false,
        onSelectRun: mockOnSelectRun,
        onNewRun: mockOnNewRun,
      }),
    );

    expect(html).not.toContain('Clear History');
  });

  it('renders individual delete buttons when onDeleteRun is provided', () => {
    const html = renderToString(
      React.createElement(HistoryPage, {
        history: sampleRuns,
        loading: false,
        onSelectRun: mockOnSelectRun,
        onNewRun: mockOnNewRun,
        onDeleteRun: mockOnDeleteRun,
      }),
    );

    expect(html).toContain('aria-label="Delete run run-101 from local history"');
    expect(html).toContain('aria-label="Delete run run-102 from local history"');
  });

  it('omits individual delete buttons when onDeleteRun is omitted', () => {
    const html = renderToString(
      React.createElement(HistoryPage, {
        history: sampleRuns,
        loading: false,
        onSelectRun: mockOnSelectRun,
        onNewRun: mockOnNewRun,
      }),
    );

    expect(html).not.toContain('aria-label="Delete run run-101 from local history"');
  });

  it('renders search filter input and status select filter bar', () => {
    const html = renderToString(
      React.createElement(HistoryPage, {
        history: sampleRuns,
        loading: false,
        onSelectRun: mockOnSelectRun,
        onNewRun: mockOnNewRun,
      }),
    );

    expect(html).toContain('placeholder="Search by repo, issue title, or #number..."');
    expect(html).toContain('All Statuses (5)');
    expect(html).toContain('Completed');
    expect(html).toContain('Running');
  });

  it('applies custom className, id, and style to root element', () => {
    const html = renderToString(
      React.createElement(HistoryPage, {
        history: sampleRuns,
        loading: false,
        onSelectRun: mockOnSelectRun,
        onNewRun: mockOnNewRun,
        className: 'custom-history-class',
        id: 'test-history-page',
        style: { opacity: 0.95 },
      }),
    );

    expect(html).toContain('id="test-history-page"');
    expect(html).toContain('class="history-page custom-history-class"');
    expect(html).toContain('opacity:0.95');
  });
});
