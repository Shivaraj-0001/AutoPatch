'use client';

import React, { useState } from 'react';
import {
  Target,
  FileEdit,
  PlusCircle,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import type { ImplementationPlan } from '../../lib/types';
import { Badge } from '../common/Badge';

export interface ImplementationPlanViewProps {
  plan: ImplementationPlan;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}

export const ImplementationPlanView: React.FC<ImplementationPlanViewProps> = ({
  plan,
  collapsible = false,
  defaultOpen = false,
  className,
  id,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(collapsible ? defaultOpen : true);
  const isExpanded = collapsible ? isOpen : true;

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'modify':
        return <Badge variant="blue" icon={<FileEdit size={11} />}>Modify</Badge>;
      case 'create':
        return <Badge variant="green" icon={<PlusCircle size={11} />}>Create</Badge>;
      case 'delete':
        return <Badge variant="rose" icon={<Trash2 size={11} />}>Delete</Badge>;
      default:
        return <Badge variant="neutral">{action}</Badge>;
    }
  };

  const plannedChangesList = plan.plannedChanges || [];

  return (
    <div
      id={id}
      className={`glass-panel ${className || ''}`.trim()}
      style={{ padding: '20px', marginBottom: '20px', ...style }}
    >
      <div
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? isExpanded : undefined}
        aria-label={collapsible ? `${isExpanded ? 'Collapse' : 'Expand'} Implementation Strategy & Plan` : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: collapsible ? 'pointer' : 'default',
          marginBottom: isExpanded ? '16px' : '0',
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
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            <Target size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Implementation Strategy & Plan
              </h3>
              {plannedChangesList.length > 0 && (
                <Badge variant="blue">
                  {`${plannedChangesList.length} Planned Changes`}
                </Badge>
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Architectural strategy designed by Implementation Planner Agent
            </p>
          </div>
        </div>

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

      {isExpanded && (
        <>
          {/* Strategy Summary */}
          {plan.implementationStrategy && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                marginBottom: '16px',
                fontSize: '0.875rem',
                color: 'var(--text-primary)',
                lineHeight: 1.5,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  color: 'var(--accent-cyan)',
                  marginBottom: '4px',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Strategy
              </div>
              {plan.implementationStrategy}
            </div>
          )}

          {/* Planned Changes Table */}
          {plannedChangesList.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                }}
              >
                {`Planned File Changes (${plannedChangesList.length})`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {plannedChangesList.map((change, idx) => (
                  <div
                    key={`${change.file}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid var(--border-subtle)',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        {getActionBadge(change.action)}
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem',
                            color: 'var(--text-primary)',
                            fontWeight: 600,
                          }}
                        >
                          {change.file}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {change.description}
                      </div>
                    </div>

                    {change.relatedCriteria && change.relatedCriteria.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {change.relatedCriteria.map((rc) => (
                          <span
                            key={rc}
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.7rem',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: 'rgba(99, 102, 241, 0.1)',
                              color: '#a5b4fc',
                              border: '1px solid rgba(99, 102, 241, 0.2)',
                            }}
                          >
                            {rc}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risks & Mitigations */}
          {((plan.risks && plan.risks.length > 0) ||
            (plan.risksAndMitigations && plan.risksAndMitigations.length > 0)) && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                }}
              >
                Risks & Mitigations
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '8px',
                }}
              >
                {(plan.risks || []).map((rm, idx) => (
                  <div
                    key={`risk-${idx}`}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(245, 158, 11, 0.05)',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        color: '#fbbf24',
                        fontWeight: 600,
                        marginBottom: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={13} />
                        <span>{`Risk: ${rm.description}`}</span>
                      </div>
                      {rm.severity && (
                        <Badge
                          variant={
                            rm.severity === 'high'
                              ? 'rose'
                              : rm.severity === 'medium'
                              ? 'amber'
                              : 'neutral'
                          }
                        >
                          {rm.severity}
                        </Badge>
                      )}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <ShieldCheck size={13} color="var(--accent-emerald)" />
                      <span>{`Mitigation: ${rm.mitigation}`}</span>
                    </div>
                  </div>
                ))}
                {(plan.risksAndMitigations || []).map((rm, idx) => (
                  <div
                    key={`rm-${idx}`}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(245, 158, 11, 0.05)',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#fbbf24',
                        fontWeight: 600,
                        marginBottom: '4px',
                      }}
                    >
                      <AlertTriangle size={13} />
                      <span>{`Risk: ${rm.risk}`}</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <ShieldCheck size={13} color="var(--accent-emerald)" />
                      <span>{`Mitigation: ${rm.mitigation}`}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assumptions */}
          {plan.assumptions && plan.assumptions.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                }}
              >
                Assumptions
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {plan.assumptions.map((assumption, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.775rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {`• ${assumption}`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acceptance Criteria Mapping */}
          {plan.acceptanceCriterionMapping && plan.acceptanceCriterionMapping.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                }}
              >
                Acceptance Criteria Coverage
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '8px',
                }}
              >
                {plan.acceptanceCriterionMapping.map((mapping, idx) => (
                  <div
                    key={`mapping-${mapping.criterionId}-${idx}`}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(99, 102, 241, 0.05)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '6px',
                      }}
                    >
                      <CheckCircle2 size={13} color="var(--accent-primary)" />
                      <Badge variant="blue">{mapping.criterionId}</Badge>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {`${mapping.plannedChanges.length} linked changes`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {mapping.plannedChanges.map((changeFile) => (
                        <span
                          key={changeFile}
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.72rem',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {changeFile}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rollback Considerations */}
          {plan.rollbackConsiderations && plan.rollbackConsiderations.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RotateCcw size={14} color="#f43f5e" />
                <span>Rollback Considerations</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {plan.rollbackConsiderations.map((consideration, idx) => (
                  <div
                    key={`rollback-${idx}`}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {`• ${consideration}`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Plan */}
          {Boolean(plan.testPlan) && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                fontSize: '0.8rem',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  color: 'var(--accent-emerald)',
                  marginBottom: '8px',
                }}
              >
                Test Plan & Verification Strategy
              </div>
              {Array.isArray(plan.testPlan) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {plan.testPlan.map((tp, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '8px 10px',
                        background: 'rgba(0, 0, 0, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          minWidth: 0,
                        }}
                      >
                        {typeof tp === 'object' && tp !== null && tp.file && (
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.75rem',
                              color: 'var(--accent-cyan)',
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            {tp.file}
                          </span>
                        )}
                        <span
                          style={{
                            color: 'var(--text-secondary)',
                            fontSize: '0.8rem',
                            wordBreak: 'break-word',
                          }}
                        >
                          {typeof tp === 'object' && tp !== null
                            ? tp.description
                            : String(tp)}
                        </span>
                      </div>
                      {typeof tp === 'object' && tp !== null && tp.type && (
                        <Badge variant="cyan">{tp.type}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {String(plan.testPlan)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
