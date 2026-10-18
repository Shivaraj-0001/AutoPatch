'use client';

import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, HelpCircle, XCircle, CheckSquare, ChevronDown, ChevronRight } from 'lucide-react';
import type { AcceptanceCriterion, AcceptanceCriterionResult } from '../../lib/types';
import { Badge } from '../common/Badge';

export interface AcceptanceCriteriaChecklistProps {
  criteria: AcceptanceCriterion[];
  results?: AcceptanceCriterionResult[];
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export const AcceptanceCriteriaChecklist: React.FC<AcceptanceCriteriaChecklistProps> = ({
  criteria,
  results,
  collapsible = false,
  defaultOpen = true,
  className = '',
  style,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getResultForCriterion = (id: string) => {
    return results?.find((r) => r.criterionId === id);
  };

  const satisfiedCount = results
    ? criteria.filter((c) => getResultForCriterion(c.id)?.status === 'satisfied').length
    : 0;

  const getStatusBadge = (res?: AcceptanceCriterionResult) => {
    if (!res) {
      return <Badge variant="neutral" title="Criterion has not been evaluated yet">Not yet evaluated</Badge>;
    }
    switch (res.status) {
      case 'satisfied':
        return <Badge variant="green" icon={<CheckCircle2 size={12} />} title="Criterion verified and satisfied">Satisfied</Badge>;
      case 'partially-satisfied':
        return <Badge variant="amber" icon={<AlertCircle size={12} />} title="Criterion partially satisfied">Partially Satisfied</Badge>;
      case 'not-satisfied':
        return <Badge variant="rose" icon={<XCircle size={12} />} title="Criterion not satisfied">Not Satisfied</Badge>;
      case 'unable-to-verify':
        return <Badge variant="neutral" icon={<HelpCircle size={12} />} title="Unable to verify automatically without test runner">Unverified (No Test Runner)</Badge>;
      default:
        return <Badge variant="neutral">{res.status}</Badge>;
    }
  };

  return (
    <div
      id={id}
      className={`glass-panel acceptance-criteria-checklist ${className}`.trim()}
      style={{ padding: '20px', marginBottom: '20px', ...style }}
    >
      <div
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? isOpen : undefined}
        title={collapsible ? (isOpen ? 'Collapse criteria list' : 'Expand criteria list') : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: collapsible ? 'pointer' : 'default',
          marginBottom: isOpen ? '16px' : '0',
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
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-emerald)',
            }}
          >
            <CheckSquare size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Acceptance Criteria Verification
              </h3>
              {results && results.length > 0 && (
                <Badge
                  variant={satisfiedCount === criteria.length ? 'green' : 'cyan'}
                  title={`${satisfiedCount} of ${criteria.length} criteria satisfied`}
                >
                  {`${satisfiedCount}/${criteria.length} Satisfied`}
                </Badge>
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Requirements extracted by Issue Analyst and audited by Review Agent
            </p>
          </div>
        </div>

        {collapsible && (
          <div
            aria-hidden="true"
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

      {isOpen && (

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {criteria.length === 0 ? (
          <div style={{ fontSize: '0.825rem', color: 'var(--text-dim)', textAlign: 'center', padding: '16px 0' }}>
            No acceptance criteria recorded yet.
          </div>
        ) : (
          criteria.map((item) => {
            const res = getResultForCriterion(item.id);

            return (
              <div
                key={item.id}
                data-criterion-id={item.id}
                data-status={res?.status || 'unverified'}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--accent-cyan)',
                        marginTop: '2px',
                      }}
                    >
                      {`[${item.id}]`}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {item.description}
                      </div>
                      {item.inferred && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                          (Inferred from issue context)
                        </span>
                      )}
                    </div>
                  </div>

                  <div>{getStatusBadge(res)}</div>
                </div>

                {res?.explanation && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.25)',
                      fontSize: '0.775rem',
                      color: 'var(--text-secondary)',
                      borderLeft: '2px solid var(--border-medium)',
                    }}
                  >
                    <strong style={{ color: 'var(--text-primary)' }}>Reviewer note: </strong>
                    <span>{res.explanation}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      )}
    </div>
  );
};
