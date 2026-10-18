'use client';

import React from 'react';
import { Award, CheckCircle2, Download, AlertTriangle, FileText, ShieldCheck, Sparkles } from 'lucide-react';
import type { WorkflowRun } from '../../lib/types';
import { downloadPatchBlob } from '../../lib/indexeddb';

export interface FinalReportProps {
  run: WorkflowRun;
  onRefine?: () => void;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}

export const FinalReport: React.FC<FinalReportProps> = ({ run, onRefine, className, id, style }) => {
  const satisfiedCriteria =
    run.reviewReport?.acceptanceCriterionResults?.filter?.((c) => c.status === 'satisfied')?.length ?? 0;
  const totalCriteria = run.issueSpecification?.acceptanceCriteria?.length ?? 0;

  const repoFullName =
    typeof run.repository === 'string'
      ? run.repository
      : run.repository?.fullName || 'repository';

  const filesCount =
    run.codingProposal?.filesModified?.length ??
    run.codingProposal?.filesChanged?.length ??
    0;

  return (
    <div
      id={id}
      className={`glass-panel ${className || ''}`.trim()}
      style={{
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(17, 24, 39, 0.6) 100%)',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
            }}
          >
            <Award size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Open-Source Contribution Package
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {`Autonomous multi-agent run complete for ${repoFullName} #${run.issueNumber}`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {onRefine &&
            ((run.reviewReport?.optionalSuggestions?.length ?? 0) > 0 ||
              (run.reviewReport?.findings?.length ?? 0) > 0) && (
              <button
                type="button"
                className="btn btn-secondary"
                aria-label="Refine patch with feedback from reviewer"
                onClick={onRefine}
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <Sparkles size={16} />
                <span>Refine with Feedback</span>
              </button>
            )}

          {run.codingProposal?.patch && (
            <button
              type="button"
              onClick={() => {
                downloadPatchBlob(
                  run.codingProposal!.patch,
                  repoFullName,
                  run.issueNumber,
                  run.revisionCount > 0 ? run.revisionCount : undefined,
                );
              }}
              className="btn btn-primary"
              style={{ padding: '8px 16px' }}
              aria-label={`Download patch for ${repoFullName} issue #${run.issueNumber}`}
              title="Download generated patch file"
            >
              <Download size={16} />
              <span>Download Ready Patch</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Criteria Satisfied
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
            {`${satisfiedCriteria} / ${totalCriteria}`}
          </div>
        </div>

        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Files Modified
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {filesCount}
          </div>
        </div>

        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Revision Cycles
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
            {`${run.revisionCount} / ${run.maxRevisions}`}
          </div>
        </div>

        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Review Status
          </div>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: run.reviewReport?.revisionRequired ? 'var(--accent-rose)' : 'var(--accent-emerald)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '4px',
            }}
          >
            {run.reviewReport?.revisionRequired ? (
              <>
                <AlertTriangle size={16} />
                <span>Needs Polish</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Ready to Apply</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Change Summary */}
      {run.codingProposal?.changeSummary && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '4px',
            }}
          >
            <FileText size={15} color="var(--accent-primary)" />
            <span>Summary of Changes</span>
          </div>
          {run.codingProposal.changeSummary}
        </div>
      )}

      {/* Review Agent Verification */}
      {run.reviewReport?.testAssessment && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(6, 182, 212, 0.04)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginTop: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              color: 'var(--accent-cyan)',
              marginBottom: '4px',
            }}
          >
            <ShieldCheck size={15} />
            <span>Review Agent Verification & Test Assessment</span>
          </div>
          {run.reviewReport.testAssessment}
        </div>
      )}
    </div>
  );
};
