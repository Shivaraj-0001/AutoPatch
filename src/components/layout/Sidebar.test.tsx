import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Sidebar } from './Sidebar';
import type { RunHistoryItem } from '../../lib/types';

describe('Sidebar Component', () => {
  const mockHistory: RunHistoryItem[] = [
    {
      id: 'run-1',
      repository: 'facebook/react',
      issueNumber: 101,
      issueTitle: 'Fix state dispatch batching',
      status: 'completed',
      currentAgent: null,
      createdAt: '2026-10-18T10:00:00.000Z',
      updatedAt: '2026-10-18T10:05:00.000Z',
    },
    {
      id: 'run-2',
      repository: 'vercel/next.js',
      issueNumber: 202,
      issueTitle: 'App router streaming hydration',
      status: 'running',
      currentAgent: 'coding-agent',
      createdAt: '2026-10-18T10:15:00.000Z',
      updatedAt: '2026-10-18T10:20:00.000Z',
    },
    {
      id: 'run-3',
      repository: 'vuejs/core',
      issueNumber: 303,
      issueTitle: 'Reactivity memory leak',
      status: 'failed',
      currentAgent: 'review-agent',
      createdAt: '2026-10-18T10:30:00.000Z',
      updatedAt: '2026-10-18T10:35:00.000Z',
    },
  ];

  it('renders collapsed state when collapsed is true', () => {
    const html = renderToString(
      <Sidebar
        history={mockHistory}
        collapsed={true}
        onSelectRun={() => {}}
        onRefresh={() => {}}
      />
    );

    expect(html).toContain('sidebar-collapsed');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('Recent Contributions');
  });

  it('renders empty message when history is empty', () => {
    const html = renderToString(
      <Sidebar
        history={[]}
        onSelectRun={() => {}}
        onRefresh={() => {}}
      />
    );

    expect(html).toContain('No runs yet. Enter a GitHub issue URL to start!');
    expect(html).toContain('Recent Contributions');
  });

  it('renders history items with titles, repositories, and badges', () => {
    const html = renderToString(
      <Sidebar
        history={mockHistory}
        selectedRunId="run-1"
        onSelectRun={() => {}}
        onRefresh={() => {}}
      />
    );

    expect(html).toContain('facebook/react');
    expect(html).toContain('#101: Fix state dispatch batching');
    expect(html).toContain('Completed');

    expect(html).toContain('vercel/next.js');
    expect(html).toContain('#202: App router streaming hydration');
    expect(html).toContain('Running');

    expect(html).toContain('vuejs/core');
    expect(html).toContain('#303: Reactivity memory leak');
    expect(html).toContain('Failed');
  });

  it('marks selected run with aria-selected="true"', () => {
    const html = renderToString(
      <Sidebar
        history={mockHistory}
        selectedRunId="run-2"
        onSelectRun={() => {}}
        onRefresh={() => {}}
      />
    );

    expect(html).toContain('aria-selected="true"');
  });

  it('renders refresh button and collapse toggle button', () => {
    const onToggleCollapse = vi.fn();
    const html = renderToString(
      <Sidebar
        history={mockHistory}
        onSelectRun={() => {}}
        onRefresh={() => {}}
        onToggleCollapse={onToggleCollapse}
      />
    );

    expect(html).toContain('title="Refresh runs"');
    expect(html).toContain('title="Collapse sidebar"');
  });

  it('renders delete button when onDeleteRun is supplied', () => {
    const onDeleteRun = vi.fn();
    const html = renderToString(
      <Sidebar
        history={mockHistory}
        onSelectRun={() => {}}
        onRefresh={() => {}}
        onDeleteRun={onDeleteRun}
      />
    );

    expect(html).toContain('title="Delete run"');
    expect(html).toContain('aria-label="Delete run run-1"');
  });

  it('renders cancelled and queued status badges properly', () => {
    const extraHistory: RunHistoryItem[] = [
      {
        id: 'run-4',
        repository: 'owner/repo1',
        issueNumber: 404,
        issueTitle: 'Cancelled task',
        status: 'cancelled',
        currentAgent: null,
        createdAt: '2026-10-18T10:40:00.000Z',
        updatedAt: '2026-10-18T10:42:00.000Z',
      },
      {
        id: 'run-5',
        repository: 'owner/repo2',
        issueNumber: 505,
        issueTitle: 'Queued task',
        status: 'queued',
        currentAgent: null,
        createdAt: '2026-10-18T10:45:00.000Z',
        updatedAt: '2026-10-18T10:45:00.000Z',
      },
    ];

    const html = renderToString(
      <Sidebar
        history={extraHistory}
        onSelectRun={() => {}}
        onRefresh={() => {}}
      />
    );

    expect(html).toContain('Cancelled');
    expect(html).toContain('Queued');
  });

  it('applies custom className, id, and style props', () => {
    const html = renderToString(
      <Sidebar
        id="app-sidebar-id"
        className="my-sidebar-style"
        style={{ opacity: 0.92 }}
        history={mockHistory}
        onSelectRun={() => {}}
        onRefresh={() => {}}
      />
    );

    expect(html).toContain('id="app-sidebar-id"');
    expect(html).toContain('app-sidebar my-sidebar-style');
    expect(html).toContain('opacity:0.92');
  });
});
