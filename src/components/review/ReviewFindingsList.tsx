'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCcw,
  TestTube2,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Sparkles,
  History,
  ArrowRight,
} from 'lucide-react';
import type { ReviewReport, ReviewFinding, RevisionRecord } from '../../lib/types';
import { Badge } from '../common/Badge';

export interface ReviewFindingsListProps {
  report: ReviewReport;
  runId?: string;
  revisionCount?: number;
  maxRevisions?: number;
  collapsible?: boolean;
  defaultOpen?: boolean;
  isRunRunning?: boolean;
  onRefine?: (options?: { instructions?: string; selectedSuggestions?: string[] }) => Promise<void>;
  revisionHistory?: RevisionRecord[];
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}

export interface ReviewRevisionItem {
  revisionNumber: number;
  label: string;
  isLatest: boolean;
  report: ReviewReport;
  timestamp?: string;
  summary?: string;
}

export const ReviewFindingsList: React.FC<ReviewFindingsListProps> = ({
  report,
  runId: _runId,
  revisionCount,
  maxRevisions,
  collapsible = false,
  defaultOpen = true,
  isRunRunning = false,
  onRefine,
  revisionHistory,
  className,
  id,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isRefining, setIsRefining] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');

  const isExpanded = collapsible ? isOpen : true;

  // ─── Build unified list of review audits ────────────────────────────────────
  const reviewRevList: ReviewRevisionItem[] = useMemo(() => {
    if (revisionHistory && revisionHistory.length > 0) {
      const items: ReviewRevisionItem[] = [];

      revisionHistory.forEach((r, idx) => {
        if (r.reviewReport) {
          const revNum = r.revision || idx + 1;
          items.push({
            revisionNumber: revNum,
            label: idx === 0 ? 'Initial Audit' : `Feedback Loop Audit #${idx}`,
            isLatest: false,
            report: r.reviewReport,
            timestamp: r.timestamp,
            summary: r.summary,
          });
        }
      });

      // If active report is different from last recorded report
      const lastHistReport = items[items.length - 1]?.report;
      if (report && report !== lastHistReport && !items.some((it) => it.report === report)) {
        items.push({
          revisionNumber: items.length + 1,
          label: `Feedback Audit #${items.length}`,
          isLatest: true,
          report,
        });
      }

      // Mark the last item as latest
      if (items.length > 0) {
        for (let i = 0; i < items.length - 1; i++) {
          items[i].isLatest = false;
        }
        items[items.length - 1].isLatest = true;
        return items;
      }
    }

    // Fallback single review
    return [
      {
        revisionNumber: revisionCount || 1,
        label: 'Initial Audit',
        isLatest: true,
        report,
      },
    ];
  }, [revisionHistory, report, revisionCount]);

  const latestRevNum = reviewRevList[reviewRevList.length - 1]?.revisionNumber || 1;

  // ─── Selected review revision state, always defaulting to latest ───────────
  const [selectedRevNum, setSelectedRevNum] = useState<number>(latestRevNum);
  const prevLatestRef = useRef(latestRevNum);

  useEffect(() => {
    if (latestRevNum !== prevLatestRef.current) {
      setSelectedRevNum(latestRevNum);
      prevLatestRef.current = latestRevNum;
    }
  }, [latestRevNum]);

  const activeRev =
    reviewRevList.find((r) => r.revisionNumber === selectedRevNum) ||
    reviewRevList[reviewRevList.length - 1];

  const activeReport = activeRev?.report || report;

  const handleApplyFeedback = async () => {
    if (!onRefine) return;
    setIsRefining(true);
    try {
      await onRefine({
        instructions: customInstructions.trim() || undefined,
      });
      setShowInstructions(false);
      setCustomInstructions('');
    } catch (err) {
      console.error('Failed to apply review feedback:', err);
    } finally {
      setIsRefining(false);
    }
  };

  const getSeverityBadge = (severity: ReviewFinding['severity']) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="rose" icon={<AlertOctagon size={12} />} title="Critical severity finding">Critical</Badge>;
      case 'major':
        return <Badge variant="rose" icon={<AlertTriangle size={12} />} title="Major severity finding">Major</Badge>;
      case 'minor':
        return <Badge variant="amber" icon={<AlertTriangle size={12} />} title="Minor severity finding">Minor</Badge>;
      case 'suggestion':
        return <Badge variant="cyan" icon={<Info size={12} />} title="Suggestion for enhancement">Suggestion</Badge>;
    }
  };

  return (
    <div
      id={id}
      className={`glass-panel ${className || ''}`.trim()}
      style={{ padding: '20px', marginBottom: '20px', ...style }}
    >
      {/* Header bar */}
      <div
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? isExpanded : undefined}
        aria-label={collapsible ? `${isExpanded ? 'Collapse' : 'Expand'} Independent Review Audit` : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isExpanded ? '16px' : '0',
          flexWrap: 'wrap',
          gap: '10px',
          cursor: collapsible ? 'pointer' : 'default',
          outline: 'none',
        }}
        onClick={() => {
          if (collapsible) setIsOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(244, 63, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-rose)',
            }}
          >
            <ShieldAlert size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Independent Review Audit
              </h3>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  color: 'var(--accent-rose)',
                  letterSpacing: '0.3px',
                }}
              >
                {`Review #${activeRev?.revisionNumber ?? 1} of ${latestRevNum}`}
              </span>
              {activeRev?.isLatest && reviewRevList.length > 1 && (
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
                  Latest Audit
                </span>
              )}
              {activeReport.findings.length > 0 && (
                <Badge variant={activeReport.revisionRequired ? 'rose' : 'amber'}>
                  {`${activeReport.findings.length} findings`}
                </Badge>
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Adversarial code review by Review Agent
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {typeof revisionCount === 'number' && maxRevisions !== undefined && revisionCount > 0 && (
            <Badge variant="amber" icon={<RefreshCcw size={12} />}>
              {`Revisions: ${revisionCount}/${maxRevisions}`}
            </Badge>
          )}

          {activeReport.revisionRequired ? (
            <Badge variant="rose" icon={<RefreshCcw size={12} />}>
              Revision Required
            </Badge>
          ) : (
            <Badge variant="green" icon={<CheckCircle2 size={12} />}>
              Patch Approved
            </Badge>
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
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Review Revision Switcher Bar (when multiple reviews exist) */}
          {reviewRevList.length > 1 && (
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
                <span>Audits:</span>
              </div>

              {reviewRevList.map((r) => {
                const isSelected = r.revisionNumber === selectedRevNum;
                return (
                  <button
                    key={r.revisionNumber}
                    type="button"
                    aria-label={`Switch to Review #${r.revisionNumber} audit`}
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
                        ? 'rgba(244, 63, 94, 0.2)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected
                        ? '1px solid var(--accent-rose)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isSelected ? 600 : 500,
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? '0 0 10px rgba(244, 63, 94, 0.25)' : 'none',
                    }}
                  >
                    <ShieldAlert
                      size={13}
                      color={isSelected ? 'var(--accent-rose)' : 'currentColor'}
                    />
                    <span>{`Review #${r.revisionNumber}`}</span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: isSelected ? 'var(--accent-rose)' : 'var(--text-muted)',
                      }}
                    >
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

          {/* Historical Review Notice Banner */}
          {!activeRev?.isLatest && reviewRevList.length > 1 && (
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
                {`Viewing historical `}
                <strong>{`Review #${activeRev?.revisionNumber}`}</strong>
                {` (${activeRev?.label}). Findings from this review guided the subsequent feedback loop refinement into Revision ${latestRevNum}.`}
              </span>
              <button
                type="button"
                aria-label={`Jump to Latest Review #${latestRevNum}`}
                onClick={() => setSelectedRevNum(latestRevNum)}
                style={{
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  borderRadius: '4px',
                  color: '#fb7185',
                  cursor: 'pointer',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>{`Jump to Latest (Review #${latestRevNum})`}</span>
                <ArrowRight size={12} />
              </button>
            </div>
          )}

          {/* Overall Assessment Banner */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: activeReport.revisionRequired
                ? 'rgba(244, 63, 94, 0.08)'
                : 'rgba(16, 185, 129, 0.08)',
              border: activeReport.revisionRequired
                ? '1px solid rgba(244, 63, 94, 0.25)'
                : '1px solid rgba(16, 185, 129, 0.25)',
              marginBottom: '16px',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: activeReport.revisionRequired ? '#fb7185' : '#34d399',
                marginBottom: '4px',
              }}
            >
              {activeReport.revisionRequired
                ? `Review #${activeRev?.revisionNumber ?? 1} Verdict: Revision Needed Before Shipping`
                : `Review #${activeRev?.revisionNumber ?? 1} Verdict: Code Quality Passed`}
            </div>
            {activeReport.overallAssessment}
          </div>

          {/* Review-to-Code Feedback Loop Callout */}
          {onRefine &&
            ((activeReport.optionalSuggestions?.length ?? 0) > 0 ||
              (activeReport.findings?.length ?? 0) > 0) && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background:
                    'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)',
                      }}
                    >
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        Review-to-Code Feedback Loop
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Transmit reviewer findings and suggestions back to the Coding Agent to synthesize a new revision.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      aria-label="Apply Feedback & Synthesize New Revision"
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: isRefining || isRunRunning ? 'not-allowed' : 'pointer',
                      }}
                      disabled={isRefining || isRunRunning}
                      onClick={handleApplyFeedback}
                    >
                      {isRefining ? (
                        <>
                          <RefreshCcw size={14} className="animate-spin" />
                          <span>Transmitting Feedback to Coder...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          <span>Apply Feedback & Synthesize New Revision</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      aria-label={showInstructions ? 'Hide custom notes' : 'Add custom notes'}
                      style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                      onClick={() => setShowInstructions(!showInstructions)}
                    >
                      {showInstructions ? 'Hide Notes' : '+ Custom Notes'}
                    </button>
                  </div>
                </div>

                {showInstructions && (
                  <div style={{ marginTop: '12px' }}>
                    <textarea
                      aria-label="Directives for the Coding Agent"
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="Optional: Add specific directives for the Coding Agent (e.g., 'Update comment in normalize and call rejectZeroStep before normalize as suggested')..."
                      style={{
                        width: '100%',
                        minHeight: '60px',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                )}
              </div>
            )}

          {/* Required Changes Section (if flagged by reviewer) */}
          {activeReport.requiredChanges && activeReport.requiredChanges.length > 0 && (
            <div
              style={{
                marginBottom: '16px',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.05)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
              }}
            >
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--accent-rose)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '10px',
                }}
              >
                <AlertOctagon size={15} />
                <span>{`Required Changes Before Approval (${activeReport.requiredChanges.length})`}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activeReport.requiredChanges.map((change, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '0.82rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.4,
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--accent-rose)',
                        fontWeight: 700,
                        marginTop: '2px',
                      }}
                    >
                      •
                    </span>
                    <span>{change}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Assessment Callout */}
          {activeReport.testAssessment && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(6, 182, 212, 0.05)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
              }}
            >
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '6px',
                }}
              >
                <TestTube2 size={15} />
                <span>Test Assessment</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {activeReport.testAssessment}
              </div>
            </div>
          )}

          {/* Optional Suggestions */}
          {activeReport.optionalSuggestions && activeReport.optionalSuggestions.length > 0 && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px',
                }}
              >
                <Lightbulb size={15} />
                <span>{`Optional Suggestions (${activeReport.optionalSuggestions.length})`}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activeReport.optionalSuggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ color: 'var(--accent-primary)', marginTop: '2px' }}>•</span>
                    <span>{sug}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Findings List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {`Detailed Findings (${activeReport.findings.length})`}
            </div>

            {activeReport.findings.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                No critical or major issues identified in this revision.
              </div>
            ) : (
              activeReport.findings.map((f, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getSeverityBadge(f.severity)}
                      <Badge variant="neutral">{f.category.toUpperCase()}</Badge>
                      {(f.filePath || f.file) && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                          {`${f.filePath || f.file}${
                            typeof f.lineRange === 'string' && f.lineRange
                              ? `:${f.lineRange}`
                              : typeof f.lineRange === 'object' && f.lineRange
                              ? `:${f.lineRange.start}-${f.lineRange.end}`
                              : ''
                          }`}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      {`Confidence: ${f.confidence}`}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {f.description}
                  </div>

                  {f.evidence && (
                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '6px',
                        borderLeft: '2px solid var(--border-medium)',
                      }}
                    >
                      <strong style={{ color: 'var(--text-muted)' }}>Evidence:</strong> {f.evidence}
                    </div>
                  )}

                  {f.suggestedFix && (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--diff-add-text)',
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: '2px solid var(--accent-emerald)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '6px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <strong>Suggested Fix:</strong> {f.suggestedFix}
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          background: 'rgba(16, 185, 129, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          color: 'var(--accent-emerald)',
                          fontWeight: 600,
                          letterSpacing: '0.02em',
                        }}
                      >
                        Actionable via Feedback Loop
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
