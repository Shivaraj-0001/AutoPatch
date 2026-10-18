'use client';

import React, { useState, useMemo } from 'react';
import {
  History,
  ArrowRight,
  Download,
  CheckCircle2,
  RefreshCw,
  XCircle,
  AlertCircle,
  Trash2,
  Search,
  Database,
  Filter,
} from 'lucide-react';
import type { RunHistoryItem } from '@/lib/types';
import { Badge } from '@/components/common/Badge';
import { getPatchDownloadUrl } from '@/lib/api';
import { getRun, downloadPatchBlob } from '@/lib/indexeddb';

export interface HistoryPageProps {
  history: RunHistoryItem[];
  loading: boolean;
  onSelectRun: (id: string) => void;
  onNewRun: () => void;
  onDeleteRun?: (id: string) => Promise<void>;
  onClearHistory?: () => Promise<void>;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  history,
  loading,
  onSelectRun,
  onNewRun,
  onDeleteRun,
  onClearHistory,
  className,
  id,
  style,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isClearing, setIsClearing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const getStatusBadge = (status: RunHistoryItem['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="green" icon={<CheckCircle2 size={12} />}>Completed</Badge>;
      case 'running':
        return <Badge variant="cyan" icon={<RefreshCw size={12} className="animate-spin" />}>Running</Badge>;
      case 'failed':
        return <Badge variant="rose" icon={<XCircle size={12} />}>Failed</Badge>;
      case 'cancelled':
        return <Badge variant="neutral" icon={<AlertCircle size={12} />}>Cancelled</Badge>;
      default:
        return <Badge variant="neutral">Queued</Badge>;
    }
  };

  const handleDownloadPatch = async (item: RunHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloadingId(item.id);
      // 1. Try to load cached run with full patch directly from IndexedDB
      const cached = await getRun(item.id);
      if (cached?.codingProposal?.patch) {
        downloadPatchBlob(
          cached.codingProposal.patch,
          item.repository,
          item.issueNumber,
          cached.revisionCount > 0 ? cached.revisionCount : undefined,
        );
        return;
      }

      // 2. Fallback to API download link
      const fallbackUrl = getPatchDownloadUrl(item.id);
      const link = document.createElement('a');
      link.href = fallbackUrl;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Failed to download patch via client blob, trying URL:', err);
      const fallbackUrl = getPatchDownloadUrl(item.id);
      const link = document.createElement('a');
      link.href = fallbackUrl;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteItem = async (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDeleteRun) return;
    if (window.confirm('Delete this contribution run from your local history?')) {
      await onDeleteRun(idToDelete);
    }
  };

  const handleClearAll = async () => {
    if (!onClearHistory) return;
    if (window.confirm('Are you sure you want to clear all contribution history from IndexedDB?')) {
      setIsClearing(true);
      try {
        await onClearHistory();
      } finally {
        setIsClearing(false);
      }
    }
  };

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const repoMatch = item.repository.toLowerCase().includes(q);
      const titleMatch = (item.issueTitle || '').toLowerCase().includes(q);
      const numberMatch = item.issueNumber.toString().includes(q);

      return repoMatch || titleMatch || numberMatch;
    });
  }, [history, searchQuery, statusFilter]);

  return (
    <div
      id={id}
      className={className ? `history-page ${className}` : 'history-page'}
      style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px', ...style }}
    >
      {/* Header section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            <History size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Contribution Run History
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: 'var(--accent-emerald)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
                title="Your runs are preserved across page refreshes and browser restarts in IndexedDB"
              >
                <Database size={11} />
                <span>IndexedDB Synced</span>
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              All autonomous multi-agent runs, execution logs, and generated patches preserved locally
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {history.length > 0 && onClearHistory && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={isClearing}
              className="btn btn-ghost"
              style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}
              title="Clear all stored runs"
              aria-label="Clear all contribution history"
            >
              <Trash2 size={14} />
              <span>Clear History</span>
            </button>
          )}

          <button type="button" onClick={onNewRun} className="btn btn-primary" aria-label="Start new contribution">
            <span>New Contribution</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {history.length > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by repo, issue title, or #number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search contribution runs"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                width: '100%',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter runs by status"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                padding: '4px 8px',
                outline: 'none',
              }}
            >
              <option value="all">{`All Statuses (${history.length})`}</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      )}

      {/* List content */}
      {loading && history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <div>Loading runs from IndexedDB...</div>
        </div>
      ) : history.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '60px 24px',
            textAlign: 'center',
          }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            No runs recorded yet
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Submit an open-source issue in the workspace to launch the multi-agent system.
            Every run is automatically preserved in your browser!
          </p>
          <button type="button" onClick={onNewRun} className="btn btn-primary" aria-label="Go to Workspace">
            Go to Workspace
          </button>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '40px 24px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            {`No runs match your search query "${searchQuery}"`}
          </p>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            aria-label="Reset filters"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="glass-panel"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    {item.repository}
                  </span>
                  <span style={{ color: 'var(--text-dim)' }}>•</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>

                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {`#${item.issueNumber}: ${item.issueTitle || 'Issue Details'}`}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {getStatusBadge(item.status)}
                  {item.revisionCount && item.revisionCount > 1 ? (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {`${item.revisionCount} Revisions`}
                    </span>
                  ) : null}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {item.status === 'completed' && (
                  <button
                    type="button"
                    onClick={(e) => handleDownloadPatch(item, e)}
                    disabled={downloadingId === item.id}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    title="Download patch file"
                    aria-label={`Download patch for ${item.repository} #${item.issueNumber}`}
                  >
                    <Download size={14} />
                    <span>Patch</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onSelectRun(item.id)}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  aria-label={`Open contribution run ${item.id}`}
                >
                  <span>Open</span>
                  <ArrowRight size={14} />
                </button>

                {onDeleteRun && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(item.id, e)}
                    className="btn btn-ghost"
                    style={{
                      padding: '6px 8px',
                      color: 'var(--text-dim)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    title="Delete from local history"
                    aria-label={`Delete run ${item.id} from local history`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
