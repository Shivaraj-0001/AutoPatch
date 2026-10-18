'use client';

import React from 'react';
import {
  FileSearch,
  Compass,
  FileCode2,
  Code2,
  CheckCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Maximize2,
} from 'lucide-react';
import type { WorkflowRun, AgentName, AgentStatus, AgentExecution } from '../../lib/types';
import { Badge } from '../common/Badge';

export interface WorkflowTimelineProps {
  run: WorkflowRun;
  onSelectAgent: (agentName: AgentName) => void;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export interface StepConfig {
  name: AgentName;
  displayName: string;
  role: string;
  icon: React.ReactNode;
}

export const STEPS: StepConfig[] = [
  {
    name: 'issue-analyst',
    displayName: 'Issue Analyst',
    role: 'Deconstructs requirements & extracts acceptance criteria',
    icon: <FileSearch size={18} />,
  },
  {
    name: 'repository-scout',
    displayName: 'Repository Scout',
    role: 'Locates target files, symbol definitions, & existing tests',
    icon: <Compass size={18} />,
  },
  {
    name: 'implementation-planner',
    displayName: 'Implementation Planner',
    role: 'Architects minimal diff strategy & rollback considerations',
    icon: <FileCode2 size={18} />,
  },
  {
    name: 'coding-agent',
    displayName: 'Coding Agent',
    role: 'Generates unified diff patch & verification tests',
    icon: <Code2 size={18} />,
  },
  {
    name: 'review-agent',
    displayName: 'Review Agent',
    role: 'Performs adversarial code audit & verifies criteria',
    icon: <CheckCheck size={18} />,
  },
];

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({
  run,
  onSelectAgent,
  className = '',
  style,
  id,
}) => {
  const getStatusIndicator = (status: AgentStatus, isCurrent: boolean) => {
    if (status === 'completed') {
      return (
        <div
          title="Step completed"
          aria-label="Step completed"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid var(--accent-emerald)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-emerald)',
          }}
        >
          <CheckCircle2 size={16} />
        </div>
      );
    }
    if (status === 'running' || isCurrent) {
      return (
        <div
          title="Step currently running"
          aria-label="Step currently running"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.2)',
            border: '1px solid var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)',
            boxShadow: '0 0 12px var(--accent-primary-glow)',
          }}
          className="animate-pulse-glow"
        >
          <span className="animate-spin" style={{ fontSize: '0.85rem' }}>⟳</span>
        </div>
      );
    }
    if (status === 'failed') {
      return (
        <div
          title="Step failed"
          aria-label="Step failed"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(244, 63, 94, 0.2)',
            border: '1px solid var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-rose)',
          }}
        >
          <XCircle size={16} />
        </div>
      );
    }
    return (
      <div
        title="Step pending"
        aria-label="Step pending"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-dim)',
        }}
      >
        <Clock size={14} />
      </div>
    );
  };

  return (
    <div
      id={id}
      className={`glass-panel workflow-timeline ${className}`.trim()}
      style={{ padding: '18px 20px', marginBottom: '20px', ...style }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Pipeline Progress
          </h3>
          <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
            Sequential specialist agents passing validated structured context
          </p>
        </div>

        {run.revisionCount > 0 && (
          <Badge variant="amber" icon={<Sparkles size={12} />}>
            {`Revision Cycle ${run.revisionCount}/${run.maxRevisions || 2}`}
          </Badge>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
        {STEPS.map((step, idx) => {
          const stepExecutions = Array.isArray(run.agentExecutions)
            ? run.agentExecutions.filter((e) => e.agentName === step.name)
            : (run.agentExecutions as Record<string, AgentExecution>)?.[step.name]
            ? [(run.agentExecutions as Record<string, AgentExecution>)[step.name]]
            : [];
          const execution = stepExecutions[stepExecutions.length - 1];
          const status = execution?.status || 'pending';
          const isCurrent = run.currentAgent === step.name && run.status === 'running';
          const hasOutput = !!execution?.outputArtifact;
          const durationVal = execution?.duration ?? execution?.durationMs;
          const duration = durationVal ? `${(durationVal / 1000).toFixed(1)}s` : null;
          const tokenCount = execution?.usage?.totalTokens ?? execution?.tokenUsage?.totalTokens;
          const revisionNumber = stepExecutions.length;

          return (
            <div
              key={step.name}
              data-agent={step.name}
              data-status={status}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isCurrent
                  ? 'rgba(99, 102, 241, 0.1)'
                  : status === 'completed'
                  ? 'rgba(255, 255, 255, 0.02)'
                  : 'rgba(255, 255, 255, 0.01)',
                border: isCurrent
                  ? '1px solid rgba(99, 102, 241, 0.4)'
                  : '1px solid var(--border-subtle)',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Status icon */}
              {getStatusIndicator(status, isCurrent)}

              {/* Agent info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                  <span style={{ color: isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                    {step.displayName}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {`Step ${idx + 1} of 5`}
                  </span>
                  {revisionNumber > 1 && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {`Revision ${revisionNumber}`}
                    </span>
                  )}
                  {status === 'completed' && duration && (
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {`• ${duration}`}
                    </span>
                  )}
                  {tokenCount && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                      {`(${tokenCount} tokens)`}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {step.role}
                </div>
                {execution?.error && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', marginTop: '4px', wordBreak: 'break-word' }}>
                    {execution.error}
                  </div>
                )}
              </div>

              {/* Action / View details */}
              {hasOutput ? (
                <button
                  type="button"
                  onClick={() => onSelectAgent(step.name)}
                  aria-label={`View details for ${step.displayName}`}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.775rem', padding: '5px 10px', height: 'auto' }}
                >
                  <Maximize2 size={13} />
                  <span>View Details</span>
                </button>
              ) : isCurrent ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 500 }}>
                  Analyzing...
                </div>
              ) : status === 'failed' ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontWeight: 600 }}>
                  Failed
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Pending
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
