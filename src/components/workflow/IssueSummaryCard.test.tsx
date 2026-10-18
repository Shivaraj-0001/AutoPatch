import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { IssueSummaryCard } from './IssueSummaryCard';
import type { GitHubIssue } from '../../lib/types';

describe('IssueSummaryCard Component', () => {
  const mockIssue: GitHubIssue = {
    number: 5920,
    title: 'Fix path traversal vulnerability in static middleware',
    body: 'Static middleware allows relative path traversal under certain nested routes.',
    state: 'open',
    htmlUrl: 'https://github.com/expressjs/express/issues/5920',
    createdAt: '2026-10-18T10:00:00.000Z',
    updatedAt: '2026-10-18T10:30:00.000Z',
    author: {
      login: 'security-researcher',
      avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
    },
    labels: [
      { name: 'security', color: 'b60205', description: 'Security advisory' },
      { name: 'bug', color: 'd73a4a', description: "Something isn't working" },
    ],
    comments: [
      {
        author: 'maintainer',
        body: 'Investigating this now.',
        createdAt: '2026-10-18T10:15:00.000Z',
      },
      {
        author: 'contributor',
        body: 'Reproduction test case confirmed.',
        createdAt: '2026-10-18T10:20:00.000Z',
      },
    ],
  };

  it('renders repository name, open state badge, issue number, and title', () => {
    const html = renderToString(
      <IssueSummaryCard issue={mockIssue} repoFullName="expressjs/express" />
    );

    expect(html).toContain('expressjs/express');
    expect(html).toContain('OPEN');
    expect(html).toContain('#5920 Fix path traversal vulnerability in static middleware');
  });

  it('renders metadata bar with author login, formatted date, and comment count', () => {
    const html = renderToString(
      <IssueSummaryCard issue={mockIssue} repoFullName="expressjs/express" />
    );

    expect(html).toContain('security-researcher');
    expect(html).toContain('Opened ');
    expect(html).toContain('2 comments');
  });

  it('renders labels with customized hex color styling', () => {
    const html = renderToString(
      <IssueSummaryCard issue={mockIssue} repoFullName="expressjs/express" />
    );

    expect(html).toContain('security');
    expect(html).toContain('color:#b60205');
    expect(html).toContain('bug');
    expect(html).toContain('color:#d73a4a');
  });

  it('renders issue body and falls back when empty', () => {
    const htmlWithBody = renderToString(
      <IssueSummaryCard issue={mockIssue} repoFullName="expressjs/express" />
    );
    expect(htmlWithBody).toContain('Static middleware allows relative path traversal under certain nested routes.');

    const issueWithoutBody: GitHubIssue = {
      ...mockIssue,
      body: '',
    };
    const htmlWithoutBody = renderToString(
      <IssueSummaryCard issue={issueWithoutBody} repoFullName="expressjs/express" />
    );
    expect(htmlWithoutBody).toContain('No description provided.');
  });

  it('renders external link to GitHub with aria-label', () => {
    const html = renderToString(
      <IssueSummaryCard issue={mockIssue} repoFullName="expressjs/express" />
    );

    expect(html).toContain('href="https://github.com/expressjs/express/issues/5920"');
    expect(html).toContain('aria-label="View issue #5920 on GitHub"');
    expect(html).toContain('View on GitHub');
  });

  it('supports collapsible mode with aria attributes', () => {
    const openHtml = renderToString(
      <IssueSummaryCard
        issue={mockIssue}
        repoFullName="expressjs/express"
        collapsible={true}
        defaultOpen={true}
      />
    );
    expect(openHtml).toContain('aria-expanded="true"');

    const closedHtml = renderToString(
      <IssueSummaryCard
        issue={mockIssue}
        repoFullName="expressjs/express"
        collapsible={true}
        defaultOpen={false}
      />
    );
    expect(closedHtml).toContain('aria-expanded="false"');
  });

  it('applies custom className, id, and style props to outer container', () => {
    const html = renderToString(
      <IssueSummaryCard
        issue={mockIssue}
        repoFullName="expressjs/express"
        id="custom-issue-card"
        className="my-card-style"
        style={{ borderWidth: '2px' }}
      />
    );

    expect(html).toContain('id="custom-issue-card"');
    expect(html).toContain('issue-summary-card my-card-style');
    expect(html).toContain('border-width:2px');
  });
});
