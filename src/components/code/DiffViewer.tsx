'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Copy,
  Check,
  FileDiff,
  Download,
  ChevronDown,
  ChevronRight,
  GitCommit,
  Sparkles,
  History,
  ArrowRight,
} from 'lucide-react';
import { getPatchDownloadUrl } from '../../lib/api';
import type { RevisionRecord } from '../../lib/types';

export interface DiffViewerProps {
  patch: string;
  filesModified?: string[];
  runId?: string;
  repoName?: string;
  issueNumber?: number;
  collapsible?: boolean;
  defaultOpen?: boolean;
  revisionHistory?: RevisionRecord[];
  currentRevision?: number;
  changeSummary?: string;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export interface DiffLine {
  type: 'add' | 'del' | 'hunk' | 'header' | 'context';
  text: string;
  oldNum?: number;
  newNum?: number;
}

export interface RevisionViewItem {
  revisionNumber: number;
  label: string;
  isLatest: boolean;
  patch: string;
  filesModified: string[];
  changeSummary?: string;
  timestamp?: string;
  instructions?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  patch,
  filesModified = [],
  runId,
  collapsible = false,
  defaultOpen = true,
  revisionHistory,
  currentRevision,
  changeSummary,
  className = '',
  style,
  id,
}) => {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // ─── Build unified list of revisions ─────────────────────────────────────────
  const revList: RevisionViewItem[] = useMemo(() => {
    if (revisionHistory && revisionHistory.length > 0) {
      const items: RevisionViewItem[] = revisionHistory.map((r, idx) => {
        const revNum = r.revision || idx + 1;
        const files =
          r.codingProposal?.filesModified ||
          r.codingProposal?.filesChanged?.map((f) => f.path) ||
          [];
        const isLatest = idx === revisionHistory.length - 1 && patch === r.codingProposal?.patch;

        return {
          revisionNumber: revNum,
          label:
            idx === 0
              ? 'Initial Proposal'
              : r.instructions
              ? 'User Refinement'
              : 'Feedback Loop Refinement',
          isLatest,
          patch: r.codingProposal?.patch || patch,
          filesModified: files.length > 0 ? files : filesModified,
          changeSummary: r.codingProposal?.changeSummary || r.summary,
          timestamp: r.timestamp,
          instructions: r.instructions,
        };
      });

      // If there is an active new patch that isn't in revisionHistory yet (e.g. newly synthesized during refinement)
      const lastHistPatch = revisionHistory[revisionHistory.length - 1]?.codingProposal?.patch;
      if (patch && patch !== lastHistPatch) {
        items.push({
          revisionNumber: revisionHistory.length + 1,
          label: 'Feedback Refinement (Latest)',
          isLatest: true,
          patch,
          filesModified,
          changeSummary,
        });
      }

      // Mark the very last item as latest
      if (items.length > 0) {
        for (let i = 0; i < items.length - 1; i++) {
          items[i].isLatest = false;
        }
        items[items.length - 1].isLatest = true;
      }

      return items;
    }

    // Single revision fallback
    return [
      {
        revisionNumber: currentRevision || 1,
        label: 'Initial Proposal',
        isLatest: true,
        patch,
        filesModified,
        changeSummary,
      },
    ];
  }, [revisionHistory, patch, filesModified, currentRevision, changeSummary]);

  const latestRevisionNumber = revList[revList.length - 1]?.revisionNumber || 1;

  // ─── State: selected revision, always defaults to the latest ────────────────
  const [selectedRevNum, setSelectedRevNum] = useState<number>(latestRevisionNumber);
  const prevLatestRef = useRef(latestRevisionNumber);

  // When latest revision changes (e.g. feedback loop generates new revision), auto-switch to latest
  useEffect(() => {
    if (latestRevisionNumber !== prevLatestRef.current) {
      setSelectedRevNum(latestRevisionNumber);
      prevLatestRef.current = latestRevisionNumber;
    }
  }, [latestRevisionNumber]);

  // Selected revision object (guaranteed fallback to latest)
  const activeRev =
    revList.find((r) => r.revisionNumber === selectedRevNum) ||
    revList[revList.length - 1];

  const activePatch = activeRev?.patch || patch;
  const activeFilesModified = activeRev?.filesModified || filesModified;

  const handleCopy = () => {
    navigator.clipboard.writeText(activePatch);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Parse lines for stats & display ─────────────────────────────────────────
  const { parsedLines, additionsCount, deletionsCount } = useMemo(() => {
    const rawLines = activePatch.split('\n');
    let adds = 0;
    let dels = 0;
    const lines: DiffLine[] = [];
    let oldLineCounter = 0;
    let newLineCounter = 0;

    for (const line of rawLines) {
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldLineCounter = parseInt(match[1], 10);
          newLineCounter = parseInt(match[2], 10);
        }
        lines.push({ type: 'hunk', text: line });
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        adds++;
        lines.push({
          type: 'add',
          text: line,
          newNum: newLineCounter++,
        });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        dels++;
        lines.push({
          type: 'del',
          text: line,
          oldNum: oldLineCounter++,
        });
      } else if (
        line.startsWith('diff --git') ||
        line.startsWith('index') ||
        line.startsWith('---') ||
        line.startsWith('+++')
      ) {
        lines.push({ type: 'header', text: line });
      } else {
        lines.push({
          type: 'context',
          text: line,
          oldNum: oldLineCounter > 0 ? oldLineCounter++ : undefined,
          newNum: newLineCounter > 0 ? newLineCounter++ : undefined,
        });
      }
    }

    return { parsedLines: lines, additionsCount: adds, deletionsCount: dels };
  }, [activePatch]);

  return (
    <div
      id={id}
      className={`glass-panel diff-viewer ${className}`.trim()}
      style={{ padding: '20px', marginBottom: '20px', ...style }}
    >
      {/* Header bar */}
      <div
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? isOpen : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isOpen ? '16px' : '0',
          cursor: collapsible ? 'pointer' : 'default',
          flexWrap: 'wrap',
          gap: '12px',
        }}
        onClick={() => {
          if (collapsible) setIsOpen(!isOpen);
        }}
        onKeyDown={(e) => {
          if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
            }}
          >
            <FileDiff size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Proposed Code Changes
              </h3>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid rgba(6, 182, 212, 0.35)',
                  color: 'var(--accent-cyan)',
                  letterSpacing: '0.3px',
                }}
              >
                {`Revision ${activeRev?.revisionNumber ?? 1} of ${latestRevisionNumber}`}
              </span>
              {activeRev?.isLatest && revList.length > 1 && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: 'var(--accent-emerald)',
                  }}
                >
                  Latest Revision
                </span>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.8rem',
                marginTop: '3px',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>
                {activeFilesModified.length > 0
                  ? `${activeFilesModified.length} files changed`
                  : 'Unified diff patch'}
              </span>
              <span style={{ color: 'var(--diff-add-text)', fontWeight: 600 }}>{`+${additionsCount}`}</span>
              <span style={{ color: 'var(--diff-del-text)', fontWeight: 600 }}>{`-${deletionsCount}`}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="btn btn-secondary"
            style={{ fontSize: '0.775rem', padding: '6px 12px' }}
          >
            {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Patch'}</span>
          </button>

          {runId && (
            <a
              href={getPatchDownloadUrl(runId, activeRev?.revisionNumber)}
              download
              className="btn btn-primary"
              style={{ fontSize: '0.775rem', padding: '6px 12px' }}
              onClick={(e) => e.stopPropagation()}
              title={`Download .patch for Revision ${activeRev?.revisionNumber}`}
            >
              <Download size={14} />
              <span>Download .patch</span>
            </a>
          )}

          {collapsible && (
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
            >
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <>
          {/* Revision Switcher Bar (when multiple revisions exist) */}
          {revList.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '14px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--border-subtle)',
                overflowX: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginRight: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                <History size={13} />
                <span>Revisions:</span>
              </div>

              {revList.map((r) => {
                const isSelected = r.revisionNumber === selectedRevNum;
                return (
                  <button
                    key={r.revisionNumber}
                    type="button"
                    onClick={() => setSelectedRevNum(r.revisionNumber)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: isSelected
                        ? 'rgba(6, 182, 212, 0.2)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected
                        ? '1px solid var(--accent-cyan)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isSelected ? 600 : 500,
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? '0 0 10px rgba(6, 182, 212, 0.25)' : 'none',
                    }}
                  >
                    {r.revisionNumber === 1 ? (
                      <GitCommit size={13} color={isSelected ? 'var(--accent-cyan)' : 'currentColor'} />
                    ) : (
                      <Sparkles size={13} color={isSelected ? 'var(--accent-cyan)' : '#fbbf24'} />
                    )}
                    <span>{`Revision ${r.revisionNumber}`}</span>
                    <span style={{ fontSize: '0.7rem', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                      {`(${r.label})`}
                    </span>
                    {r.isLatest && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: 'var(--accent-emerald)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                        }}
                      >
                        Latest
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Historical Revision Banner (if user navigated back to an older revision) */}
          {!activeRev?.isLatest && revList.length > 1 && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                fontSize: '0.8rem',
                color: 'var(--accent-amber)',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span>
                Viewing historical <strong>Revision {activeRev?.revisionNumber}</strong> ({activeRev?.label}).
                Subsequent feedback refinements were applied in Revision {latestRevisionNumber}.
              </span>
              <button
                type="button"
                onClick={() => setSelectedRevNum(latestRevisionNumber)}
                style={{
                  background: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: '4px',
                  color: 'var(--accent-cyan)',
                  cursor: 'pointer',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Jump to Latest (Rev {latestRevisionNumber})</span>
                <ArrowRight size={12} />
              </button>
            </div>
          )}

          {/* Revision Change Summary Banner */}
          {activeRev?.changeSummary && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                marginBottom: '14px',
                lineHeight: 1.45,
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--accent-cyan)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '3px',
                }}
              >
                {`Revision ${activeRev.revisionNumber} Change Summary`}
              </div>
              <div>{activeRev.changeSummary}</div>
              {activeRev.instructions && (
                <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  <strong>Feedback Instruction:</strong> {activeRev.instructions}
                </div>
              )}
            </div>
          )}

          {/* Files modified pill bar */}
          {activeFilesModified.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              {activeFilesModified.map((f) => (
                <span
                  key={f}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--accent-cyan)',
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          )}

          {/* Unified Diff Box */}
          <div
            style={{
              background: '#070a10',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                maxHeight: '480px',
                overflowY: 'auto',
                overflowX: 'auto',
                padding: '8px 0',
              }}
            >
              {parsedLines.map((line, idx) => {
                if (line.type === 'hunk') {
                  return (
                    <div key={idx} className="diff-line diff-line-hunk">
                      <span className="diff-line-number">...</span>
                      <span style={{ color: 'var(--diff-hunk-text)' }}>{line.text}</span>
                    </div>
                  );
                }

                if (line.type === 'header') {
                  return (
                    <div
                      key={idx}
                      className="diff-line"
                      style={{ color: 'var(--text-dim)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                    >
                      <span className="diff-line-number" />
                      <span>{line.text}</span>
                    </div>
                  );
                }

                const className =
                  line.type === 'add'
                    ? 'diff-line diff-line-add'
                    : line.type === 'del'
                    ? 'diff-line diff-line-del'
                    : 'diff-line diff-line-context';

                return (
                  <div key={idx} className={className}>
                    <span className="diff-line-number">
                      {line.type === 'add' ? line.newNum : line.oldNum || ''}
                    </span>
                    <span>{line.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
