import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PatchDownloadButton } from './PatchDownloadButton';

describe('PatchDownloadButton Component', () => {
  it('returns null when hasPatch is false', () => {
    const html = renderToString(
      <PatchDownloadButton runId="run-123" hasPatch={false} />
    );
    expect(html).toBe('');
  });

  it('renders download button anchor when hasPatch is true', () => {
    const html = renderToString(
      <PatchDownloadButton runId="run-456" hasPatch={true} />
    );
    expect(html).toContain('href="/api/runs/run-456/patch"');
    expect(html).toContain('download');
    expect(html).toContain('Download Patch (.patch)');
    expect(html).toContain('patch-download-btn');
  });

  it('includes repoName and issueNumber in tooltip title when provided', () => {
    const html = renderToString(
      <PatchDownloadButton
        runId="run-789"
        hasPatch={true}
        repoName="owner/repo"
        issueNumber={42}
      />
    );
    expect(html).toContain('title="Download unified diff patch for owner/repo #42"');
  });

  it('omits repo context from title when repoName/issueNumber not provided', () => {
    const html = renderToString(
      <PatchDownloadButton runId="run-101" hasPatch={true} />
    );
    expect(html).toContain('title="Download unified diff patch"');
  });

  it('applies custom className, id, and style props', () => {
    const html = renderToString(
      <PatchDownloadButton
        runId="run-202"
        hasPatch={true}
        id="patch-btn-id"
        className="custom-btn-style"
        style={{ opacity: 0.88 }}
      />
    );
    expect(html).toContain('id="patch-btn-id"');
    expect(html).toContain('patch-download-btn custom-btn-style');
    expect(html).toContain('opacity:0.88');
  });

  it('renders custom label and filename attribute when provided', () => {
    const html = renderToString(
      <PatchDownloadButton
        runId="run-303"
        hasPatch={true}
        filename="custom-fix.patch"
        label="Export Diff File"
      />
    );
    expect(html).toContain('download="custom-fix.patch"');
    expect(html).toContain('Export Diff File');
  });
});
