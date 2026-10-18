'use client';

import React, { useState } from 'react';
import { ExternalLink, Tag, User, Calendar, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import type { GitHubIssue } from '../../lib/types';
import { Badge } from '../common/Badge';

export interface IssueSummaryCardProps {
  issue: GitHubIssue;
  repoFullName: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

function normalizeLabelColor(color?: string): string {
  if (!color) return '6b7280';
  const cleaned = color.replace(/^#/, '').trim();
  return /^[0-9a-fA-F]{3,6}$/.test(cleaned) ? cleaned : '6b7280';
}

export const IssueSummaryCard: React.FC<IssueSummaryCardProps> = ({
  issue,
  repoFullName,
  collapsible = false,
  defaultOpen = true,
  className = '',
  style,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const formattedDate = issue.createdAt
    ? new Date(issue.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'recently';

  return (
    <div
      id={id}
      className={`glass-panel issue-summary-card ${className}`.trim()}
      style={{ padding: '20px', marginBottom: '20px', ...style }}
    >
      <div
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? isOpen : undefined}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: isOpen ? '12px' : '0',
          cursor: collapsible ? 'pointer' : 'default',
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
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
              {repoFullName}
            </span>
            <span style={{ color: 'var(--text-dim)' }}>•</span>
            <Badge variant={issue.state === 'open' ? 'green' : 'neutral'}>
              {(issue.state || 'open').toUpperCase()}
            </Badge>
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {`#${issue.number} ${issue.title}`}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <a
            href={issue.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View issue #${issue.number} on GitHub`}
            title={`View issue #${issue.number} on GitHub`}
            className="btn btn-ghost"
            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <span>View on GitHub</span>
            <ExternalLink size={14} />
          </a>

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
      </div>

      {isOpen && (
        <>

      {/* Metadata Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '16px',
          padding: '8px 0',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '16px',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <User size={14} color="var(--text-dim)" />
          <span>{issue.author?.login || 'contributor'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} color="var(--text-dim)" />
          <span>{`Opened ${formattedDate}`}</span>
        </div>
        {issue.comments && issue.comments.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={14} color="var(--text-dim)" />
            <span>{`${issue.comments.length} comments`}</span>
          </div>
        )}
      </div>

      {/* Labels */}
      {(issue.labels?.length ?? 0) > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
          {issue.labels!.map((label) => {
            const safeColor = normalizeLabelColor(label.color);
            return (
              <span
                key={label.name}
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: `#${safeColor}22`,
                  color: `#${safeColor}`,
                  border: `1px solid #${safeColor}44`,
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Tag size={10} />
                {label.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Body preview */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          maxHeight: '140px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.5,
          fontFamily: 'inherit',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {issue.body || 'No description provided.'}
      </div>
        </>
      )}
    </div>
  );
};
