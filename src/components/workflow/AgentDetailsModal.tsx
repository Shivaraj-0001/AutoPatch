'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Cpu,
  Clock,
  Coins,
  Copy,
  Check,
  FileText,
  AlertOctagon,
  TestTube2,
  Lightbulb,
  Target,
  FileDiff,
  FolderSearch,
  ShieldAlert,
  Sparkles,
  Code2,
  FileEdit,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import type {
  WorkflowRun,
  AgentName,
  AgentExecution,
  IssueAnalysis,
  RepositoryContext,
  ImplementationPlan,
  CodingProposal,
  ReviewReport,
} from '../../lib/types';
import { Badge } from '../common/Badge';

export interface AgentDetailsModalProps {
  run: WorkflowRun;
  agentName: AgentName | null;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export const AgentDetailsModal: React.FC<AgentDetailsModalProps> = ({
  run,
  agentName,
  onClose,
  className = '',
  style,
  id,
}) => {
  const [viewMode, setViewMode] = useState<'structured' | 'raw'>('structured');
  const [copied, setCopied] = useState(false);
  const [userSelectedIdx, setUserSelectedIdx] = useState<number | null>(null);

  const allExecutions = useMemo(() => {
    if (!agentName) return [];
    if (Array.isArray(run.agentExecutions)) {
      return run.agentExecutions.filter((e) => e.agentName === agentName);
    }
    const single = (run.agentExecutions as Record<string, AgentExecution>)?.[agentName];
    return single ? [single] : [];
  }, [run.agentExecutions, agentName]);

  const latestExecIdx = Math.max(0, allExecutions.length - 1);
  const selectedExecIdx =
    userSelectedIdx !== null && userSelectedIdx < allExecutions.length
      ? userSelectedIdx
      : latestExecIdx;

  const execution = allExecutions[selectedExecIdx] || allExecutions[latestExecIdx];
  const artifact = execution?.outputArtifact;
  const durationVal = execution?.duration ?? execution?.durationMs;
  const modelName = execution?.model ?? execution?.modelUsed;
  const tokenCount = execution?.usage?.totalTokens ?? execution?.tokenUsage?.totalTokens;

  if (!agentName) return null;

  const handleCopyRaw = () => {
    if (!artifact) return;
    navigator.clipboard.writeText(JSON.stringify(artifact, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getAgentMeta = (name: AgentName) => {
    switch (name) {
      case 'issue-analyst':
        return {
          title: 'Issue Analyst Output',
          subtitle: 'Formal specification & extracted acceptance criteria',
          icon: <FileText size={18} color="var(--accent-primary)" />,
        };
      case 'repository-scout':
        return {
          title: 'Repository Scout Output',
          subtitle: 'Codebase context, relevant files & symbol mapping',
          icon: <FolderSearch size={18} color="var(--accent-cyan)" />,
        };
      case 'implementation-planner':
        return {
          title: 'Implementation Planner Output',
          subtitle: 'Architectural changes, test plan & risk analysis',
          icon: <Target size={18} color="var(--accent-primary)" />,
        };
      case 'coding-agent':
        return {
          title: 'Coding Agent Output',
          subtitle: 'Synthesized patch, file changes & added tests',
          icon: <FileDiff size={18} color="var(--accent-emerald)" />,
        };
      case 'review-agent':
        return {
          title: 'Review Agent Output',
          subtitle: 'Adversarial code review, criteria audit & verdict',
          icon: <ShieldAlert size={18} color="var(--accent-rose)" />,
        };
    }
  };

  const agentMeta = getAgentMeta(agentName);

  // ─── Agent Specific Structured Renderers ─────────────────────────────────────

  const renderIssueAnalystView = (data: IssueAnalysis) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Summary */}
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
        }}
      >
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '4px' }}>
          ISSUE SUMMARY
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
          {data.summary}
        </div>
      </div>

      {/* Problem & Expected Behavior */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-rose)', marginBottom: '6px' }}>
            PROBLEM STATEMENT
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {data.problemStatement}
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
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-emerald)', marginBottom: '6px' }}>
            EXPECTED BEHAVIOR
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {data.expectedBehavior}
          </div>
        </div>
      </div>

      {/* Acceptance Criteria */}
      {data.acceptanceCriteria && data.acceptanceCriteria.length > 0 && (
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
            Extracted Acceptance Criteria ({data.acceptanceCriteria.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.acceptanceCriteria.map((ac) => (
              <div
                key={ac.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.82rem',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent-cyan)',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    flexShrink: 0,
                  }}
                >
                  {ac.id}
                </span>
                <span style={{ flex: 1, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {ac.description}
                </span>
                {ac.inferred && (
                  <Badge variant="amber">Inferred</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Constraints & Requirements */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {data.constraints && data.constraints.length > 0 && (
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              CONSTRAINTS
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {data.constraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {data.verificationRequirements && data.verificationRequirements.length > 0 && (
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              VERIFICATION REQUIREMENTS
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {data.verificationRequirements.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  const renderRepositoryScoutView = (data: RepositoryContext) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Overview */}
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(6, 182, 212, 0.05)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
        }}
      >
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
          REPOSITORY OVERVIEW
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
          {data.repositoryOverview}
        </div>
      </div>

      {/* Relevant Files */}
      {data.relevantFiles && data.relevantFiles.length > 0 && (
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
            Relevant Files Identified ({data.relevantFiles.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.relevantFiles.map((rf, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '2px' }}>
                    {rf.path}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {rf.reason}
                  </div>
                  {rf.symbols && rf.symbols.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {rf.symbols.map((sym, si) => (
                        <span
                          key={si}
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.7rem',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {sym}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ flexShrink: 0 }}>
                  <Badge variant={rf.inspected ? 'green' : 'neutral'}>
                    {rf.inspected ? 'Inspected' : 'Candidate'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Tests */}
      {data.existingTests && data.existingTests.length > 0 && (
        <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Existing Tests Found ({data.existingTests.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {data.existingTests.map((t, idx) => (
              <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{t.path}</span>
                <span>—</span>
                <span>{t.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderImplementationPlannerView = (data: ImplementationPlan) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Strategy */}
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
        }}
      >
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '4px' }}>
          IMPLEMENTATION STRATEGY
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
          {data.implementationStrategy}
        </div>
      </div>

      {/* Planned Changes */}
      {data.plannedChanges && data.plannedChanges.length > 0 && (
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
            Planned File Changes ({data.plannedChanges.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.plannedChanges.map((change, idx) => {
              const actionBadge =
                change.action === 'modify' ? (
                  <Badge variant="blue" icon={<FileEdit size={11} />}>Modify</Badge>
                ) : change.action === 'create' ? (
                  <Badge variant="green" icon={<PlusCircle size={11} />}>Create</Badge>
                ) : (
                  <Badge variant="rose" icon={<Trash2 size={11} />}>Delete</Badge>
                );

              return (
                <div
                  key={idx}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {change.file}
                    </span>
                    {actionBadge}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {change.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Test Plan */}
      {Boolean(data.testPlan) && (
        <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-emerald)', marginBottom: '8px' }}>
            Test Plan & Verification
          </div>
          {Array.isArray(data.testPlan) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.testPlan.map((tp, idx) => (
                <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{tp.file}</span>
                  <span>{tp.description}</span>
                  {tp.type && <Badge variant="cyan">{tp.type}</Badge>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{String(data.testPlan)}</div>
          )}
        </div>
      )}

      {/* Risks */}
      {data.risks && data.risks.length > 0 && (
        <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-amber)', marginBottom: '8px' }}>
            Risk Analysis & Mitigations ({data.risks.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.risks.map((r, idx) => (
              <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <Badge variant={r.severity === 'high' ? 'rose' : r.severity === 'medium' ? 'amber' : 'green'}>
                    {r.severity.toUpperCase()}
                  </Badge>
                  <strong style={{ color: 'var(--text-primary)' }}>{r.description}</strong>
                </div>
                <div style={{ paddingLeft: '8px', color: 'var(--text-muted)' }}>
                  Mitigation: {r.mitigation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderCodingAgentView = (data: CodingProposal) => {
    const rawPatch = data.patch || '';
    const lines = rawPatch.split('\n');
    let additions = 0;
    let deletions = 0;
    for (const l of lines) {
      if (l.startsWith('+') && !l.startsWith('+++')) additions++;
      else if (l.startsWith('-') && !l.startsWith('---')) deletions++;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Change Summary */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-emerald)', marginBottom: '4px' }}>
            CHANGE SUMMARY
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {data.changeSummary}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--diff-add-text)', fontWeight: 600 }}>+{additions} additions</span>
            <span style={{ color: 'var(--diff-del-text)', fontWeight: 600 }}>-{deletions} deletions</span>
            <span style={{ color: 'var(--text-muted)' }}>{lines.length} patch lines</span>
          </div>
        </div>

        {/* Files Changed */}
        {data.filesChanged && data.filesChanged.length > 0 && (
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
              Files Changed ({data.filesChanged.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.filesChanged.map((fc, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {fc.path}
                  </span>
                  <Badge variant={fc.action === 'create' ? 'green' : fc.action === 'modify' ? 'blue' : 'rose'}>
                    {fc.action}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patch Preview */}
        {data.patch && (
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: '#070a10',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Generated Patch Preview
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(data.patch);
                }}
                className="btn btn-ghost"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                <Copy size={13} />
                <span>Copy Patch</span>
              </button>
            </div>
            <pre
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--text-primary)',
                maxHeight: '300px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              {data.patch}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const renderReviewAgentView = (data: ReviewReport) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Verdict Header */}
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          background: data.revisionRequired ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)',
          border: data.revisionRequired
            ? '1px solid rgba(244, 63, 94, 0.25)'
            : '1px solid rgba(16, 185, 129, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: data.revisionRequired ? '#fb7185' : '#34d399' }}>
            REVIEW VERDICT
          </div>
          <Badge variant={data.revisionRequired ? 'rose' : 'green'}>
            {data.revisionRequired ? 'Revision Required' : 'Approved'}
          </Badge>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
          {data.overallAssessment}
        </div>
      </div>

      {/* Required Changes */}
      {data.requiredChanges && data.requiredChanges.length > 0 && (
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(244, 63, 94, 0.05)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <AlertOctagon size={14} />
            <span>Required Changes ({data.requiredChanges.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {data.requiredChanges.map((rc, idx) => (
              <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', gap: '6px' }}>
                <span style={{ color: 'var(--accent-rose)' }}>•</span>
                <span>{rc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Assessment */}
      {data.testAssessment && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(6, 182, 212, 0.05)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <TestTube2 size={14} />
            <span>Test Assessment</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            {data.testAssessment}
          </div>
        </div>
      )}

      {/* Findings */}
      {data.findings && data.findings.length > 0 && (
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
            Detailed Findings ({data.findings.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.findings.map((f, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Badge variant={f.severity === 'critical' || f.severity === 'major' ? 'rose' : f.severity === 'minor' ? 'amber' : 'cyan'}>
                    {f.severity.toUpperCase()}
                  </Badge>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.category}</span>
                  {(f.filePath || f.file) && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                      {f.filePath || f.file}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {f.description}
                </div>
                {f.suggestedFix && (
                  <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>
                    <strong>Fix:</strong> {f.suggestedFix}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional Suggestions */}
      {data.optionalSuggestions && data.optionalSuggestions.length > 0 && (
        <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Lightbulb size={14} />
            <span>Optional Suggestions ({data.optionalSuggestions.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {data.optionalSuggestions.map((s, idx) => (
              <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                • {s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStructuredView = () => {
    if (!artifact) return null;
    switch (agentName) {
      case 'issue-analyst':
        return renderIssueAnalystView(artifact as IssueAnalysis);
      case 'repository-scout':
        return renderRepositoryScoutView(artifact as RepositoryContext);
      case 'implementation-planner':
        return renderImplementationPlannerView(artifact as ImplementationPlan);
      case 'coding-agent':
        return renderCodingAgentView(artifact as CodingProposal);
      case 'review-agent':
        return renderReviewAgentView(artifact as ReviewReport);
      default:
        return (
          <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            {JSON.stringify(artifact, null, 2)}
          </pre>
        );
    }
  };

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-details-modal-title"
      className={`agent-details-modal-backdrop ${className}`.trim()}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        ...style,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '85vh',
          backgroundColor: '#0c101c',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(255, 255, 255, 0.02)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {agentMeta.icon}
            </div>
            <div>
              <h3 id="agent-details-modal-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {agentMeta.title}
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {agentMeta.subtitle}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* View Mode Toggle Segment */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-subtle)',
                padding: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('structured')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: viewMode === 'structured' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'structured' ? '#fff' : 'var(--text-muted)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Sparkles size={12} />
                <span>Structured</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('raw')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: viewMode === 'raw' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: viewMode === 'raw' ? 'var(--text-primary)' : 'var(--text-muted)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Code2 size={12} />
                <span>Raw JSON</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              title="Close modal"
              className="btn btn-ghost"
              style={{ padding: '6px', minWidth: 'auto', height: 'auto' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Execution Revision Switcher (when multiple executions/revisions exist) */}
        {allExecutions.length > 1 && (
          <div
            style={{
              padding: '8px 24px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              overflowX: 'auto',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
              }}
            >
              Execution Pass:
            </span>
            {allExecutions.map((_exec, idx) => {
              const isSelected = selectedExecIdx === idx;
              const isLatest = idx === allExecutions.length - 1;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setUserSelectedIdx(idx)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    background: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isSelected ? 600 : 500,
                  }}
                >
                  <span>{`Revision ${idx + 1}`}</span>
                  {idx === 0 && (
                    <span style={{ fontSize: '0.68rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                      (Initial)
                    </span>
                  )}
                  {idx > 0 && (
                    <span style={{ fontSize: '0.68rem', color: isSelected ? '#fbbf24' : 'var(--accent-amber)' }}>
                      (Feedback Loop)
                    </span>
                  )}
                  {isLatest && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '3px',
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

        {/* Execution Metadata Pill Bar */}
        {(durationVal || modelName || tokenCount) && (
          <div
            style={{
              padding: '8px 24px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            {durationVal && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} color="var(--text-dim)" />
                {`${(durationVal / 1000).toFixed(1)}s runtime`}
              </span>
            )}
            {modelName && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)' }}>
                <Cpu size={12} color="var(--accent-cyan)" />
                {modelName}
              </span>
            )}
            {tokenCount && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Coins size={12} color="var(--accent-amber)" />
                {`${tokenCount.toLocaleString()} tokens`}
              </span>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {!artifact ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px 0' }}>
              No artifact generated yet for this agent execution.
            </div>
          ) : viewMode === 'structured' ? (
            renderStructuredView()
          ) : (
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  zIndex: 10,
                }}
              >
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                >
                  {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre
                style={{
                  background: '#070a10',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  padding: '16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.775rem',
                  color: 'var(--text-primary)',
                  maxHeight: '520px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {JSON.stringify(artifact, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Agent: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{agentName}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {Boolean(artifact) && (
              <button
                type="button"
                onClick={handleCopyRaw}
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                <Copy size={14} />
                <span>Copy JSON</span>
              </button>
            )}
            <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
