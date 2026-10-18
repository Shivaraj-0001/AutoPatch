'use client';

import React from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Trash2, ChevronLeft } from 'lucide-react';
import type { RunHistoryItem } from '../../lib/types';
import { Badge } from '../common/Badge';

export interface SidebarProps {
  history: RunHistoryItem[];
  selectedRunId?: string;
  onSelectRun: (id: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onDeleteRun?: (id: string) => Promise<void> | void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  history,
  selectedRunId,
  onSelectRun,
  onRefresh,
  isRefreshing = false,
  onDeleteRun,
  collapsed = false,
  onToggleCollapse,
  className = '',
  style,
  id,
}) => {
  const getStatusBadge = (status: RunHistoryItem['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="green" icon={<CheckCircle2 size={11} />}>Completed</Badge>;
      case 'running':
        return <Badge variant="cyan" icon={<RefreshCw size={11} className="animate-spin" />}>Running</Badge>;
      case 'failed':
        return <Badge variant="rose" icon={<XCircle size={11} />}>Failed</Badge>;
      case 'cancelled':
        return <Badge variant="neutral" icon={<AlertCircle size={11} />}>Cancelled</Badge>;
      default:
        return <Badge variant="neutral">Queued</Badge>;
    }
  };

  if (collapsed) {
    return (
      <aside
        id={id}
        aria-hidden="true"
        className={`app-sidebar sidebar-collapsed ${className}`.trim()}
        style={{
          width: '0px',
          borderRight: 'none',
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  return (
    <aside
      id={id}
      aria-label="Recent Contributions"
      className={`app-sidebar ${className}`.trim()}
      style={{
        width: '280px',
        borderRight: '1px solid var(--border-subtle)',
        background: 'rgba(13, 19, 33, 0.7)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 57px)',
        overflow: 'hidden',
        flexShrink: 0,
        transition: 'width 0.2s ease',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={15} color="var(--text-muted)" />
          <span style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Recent Contributions
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '10px' }}>
            {history.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn btn-ghost"
            style={{ padding: '4px', height: 'auto', minWidth: 'auto', color: 'var(--text-muted)' }}
            title="Refresh runs"
            aria-label="Refresh runs"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : undefined} />
          </button>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="btn btn-ghost"
              style={{ padding: '4px', height: 'auto', minWidth: 'auto', color: 'var(--text-muted)' }}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={15} />
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {history.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            No runs yet. Enter a GitHub issue URL to start!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {history.map((item) => {
              const isSelected = item.id === selectedRunId;
              const dateStr = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-selected={isSelected}
                  onClick={() => onSelectRun(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectRun(item.id);
                    }
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: isSelected ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-medium)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <div
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        color: 'var(--accent-cyan)',
                        fontFamily: 'var(--font-mono)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '160px',
                      }}
                    >
                      {item.repository}
                    </div>
                    <span style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>{dateStr}</span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)',
                      marginBottom: '6px',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {`#${item.issueNumber}: ${item.issueTitle || 'Issue Details'}`}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {getStatusBadge(item.status)}
                    {onDeleteRun && (
                      <button
                        type="button"
                        aria-label={`Delete run ${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
                            ? window.confirm('Delete this contribution from history?')
                            : true;
                          if (confirmed) {
                            onDeleteRun(item.id);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: 0.6,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--accent-rose)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                        title="Delete run"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
