import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DiffViewer } from './DiffViewer';
import type { RevisionRecord } from '../../lib/types';

describe('DiffViewer Component', () => {
  const samplePatch = `--- a/src/index.ts
+++ b/src/index.ts
@@ -1,4 +1,5 @@
 import { config } from './config';
+// Added feature flag
-export const version = '1.0.0';
+export const version = '1.1.0';
 export default config;`;

  it('renders diff title, file count, and addition/deletion statistics', () => {
    const html = renderToString(
      <DiffViewer
        patch={samplePatch}
        filesModified={['src/index.ts']}
      />
    );

    expect(html).toContain('Proposed Code Changes');
    expect(html).toContain('1 files changed');
    expect(html).toContain('+2');
    expect(html).toContain('-1');
    expect(html).toContain('src/index.ts');
  });

  it('parses and renders hunk, added lines, and deleted lines with correct styling', () => {
    const html = renderToString(<DiffViewer patch={samplePatch} />);

    expect(html).toContain('diff-line-hunk');
    expect(html).toContain('@@ -1,4 +1,5 @@');
    expect(html).toContain('diff-line-add');
    expect(html).toContain('+export const version = &#x27;1.1.0&#x27;;');
    expect(html).toContain('diff-line-del');
    expect(html).toContain('-export const version = &#x27;1.0.0&#x27;;');
  });

  it('renders copy button and download link when runId is provided', () => {
    const html = renderToString(
      <DiffViewer patch={samplePatch} runId="run-777" />
    );

    expect(html).toContain('Copy Patch');
    expect(html).toContain('aria-label="Copy patch to clipboard"');
    expect(html).toContain('href="/api/runs/run-777/patch?revision=1"');
    expect(html).toContain('aria-label="Download .patch file for Revision 1"');
    expect(html).toContain('Download .patch');
  });

  it('omits download link when runId is omitted', () => {
    const html = renderToString(<DiffViewer patch={samplePatch} />);

    expect(html).not.toContain('Download .patch');
  });

  it('supports collapsible mode with aria attributes', () => {
    const openHtml = renderToString(
      <DiffViewer patch={samplePatch} collapsible={true} defaultOpen={true} />
    );
    expect(openHtml).toContain('aria-expanded="true"');

    const closedHtml = renderToString(
      <DiffViewer patch={samplePatch} collapsible={true} defaultOpen={false} />
    );
    expect(closedHtml).toContain('aria-expanded="false"');
  });

  it('renders revision switcher tabs when revisionHistory is provided', () => {
    const mockRevisions: RevisionRecord[] = [
      {
        attempt: 1,
        revision: 1,
        timestamp: '2026-10-18T10:00:00.000Z',
        summary: 'Initial implementation proposal',
        codingProposal: {
          patch: samplePatch,
          filesModified: ['src/index.ts'],
          filesChanged: [{ path: 'src/index.ts', action: 'modify' }],
          changeSummary: 'Initial proposed fix',
        },
      },
      {
        attempt: 2,
        revision: 2,
        timestamp: '2026-10-18T10:15:00.000Z',
        summary: 'Refined patch based on review feedback',
        instructions: 'Add type check test coverage',
        codingProposal: {
          patch: `${samplePatch}\n+// Additional test comment`,
          filesModified: ['src/index.ts', 'src/index.test.ts'],
          filesChanged: [
            { path: 'src/index.ts', action: 'modify' },
            { path: 'src/index.test.ts', action: 'create' },
          ],
          changeSummary: 'Second revision with tests',
        },
      },
    ];

    const html = renderToString(
      <DiffViewer
        patch={samplePatch}
        revisionHistory={mockRevisions}
      />
    );

    expect(html).toContain('Revision 1');
    expect(html).toContain('Revision 2');
    expect(html).toContain('Revisions:');
    expect(html).toContain('Latest');
  });

  it('applies custom className, id, and style props', () => {
    const html = renderToString(
      <DiffViewer
        id="custom-diff-viewer"
        className="my-diff-style"
        style={{ opacity: 0.99 }}
        patch={samplePatch}
      />
    );

    expect(html).toContain('id="custom-diff-viewer"');
    expect(html).toContain('diff-viewer my-diff-style');
    expect(html).toContain('opacity:0.99');
  });
});
