'use client';

import React from 'react';
import { GitBranch, Cpu, Sparkles, Plus, History, Settings, PanelLeft } from 'lucide-react';
import type { PublicConfig } from '../../lib/types';

export type NavigationTab = 'workspace' | 'history' | 'settings';

export interface HeaderProps {
  config: PublicConfig | null;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  onNewRun: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  activeTab,
  setActiveTab,
  onNewRun,
  isSidebarOpen = true,
  onToggleSidebar,
  className = '',
  style,
  id,
}) => {
  const handleLogoKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveTab('workspace');
    }
  };

  return (
    <header
      id={id}
      className={`app-header ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(10, 14, 23, 0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {onToggleSidebar && activeTab === 'workspace' && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="btn btn-ghost"
            style={{ padding: '6px', color: isSidebarOpen ? 'var(--accent-primary)' : 'var(--text-muted)' }}
            title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <PanelLeft size={18} />
          </button>
        )}

        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab('workspace')}
          onKeyDown={handleLogoKeyDown}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
          title="Return to Workspace"
          aria-label="AutoPatch Workspace"
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 0 12px rgba(99, 102, 241, 0.35)',
            }}
          >
            <GitBranch size={17} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#fff' }}>
              Auto<span style={{ color: 'var(--accent-cyan)' }}>Patch</span>
            </span>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav aria-label="Main Navigation" style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '16px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            aria-current={activeTab === 'workspace' ? 'page' : undefined}
            className={`btn ${activeTab === 'workspace' ? 'btn-secondary' : 'btn-ghost'}`}
            style={{
              fontSize: '0.825rem',
              padding: '6px 12px',
              borderBottom: activeTab === 'workspace' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Sparkles size={14} />
            <span>Workspace</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            aria-current={activeTab === 'history' ? 'page' : undefined}
            className={`btn ${activeTab === 'history' ? 'btn-secondary' : 'btn-ghost'}`}
            style={{
              fontSize: '0.825rem',
              padding: '6px 12px',
              borderBottom: activeTab === 'history' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <History size={14} />
            <span>History</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
            className={`btn ${activeTab === 'settings' ? 'btn-secondary' : 'btn-ghost'}`}
            style={{
              fontSize: '0.825rem',
              padding: '6px 12px',
              borderBottom: activeTab === 'settings' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Model status pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 11px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
          }}
          title={config ? `Provider: ${config.aiProvider} | Model: ${config.aiModel || 'default'}` : 'Loading config...'}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: config?.aiConfigured ? 'var(--accent-emerald)' : 'var(--accent-amber)',
              boxShadow: config?.aiConfigured ? '0 0 6px var(--accent-emerald)' : '0 0 6px var(--accent-amber)',
            }}
          />
          <Cpu size={13} color="var(--text-muted)" />
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {config?.aiModel ? config.aiModel.split('/').pop() : 'HF Inference'}
          </span>
        </div>

        <button
          type="button"
          onClick={onNewRun}
          className="btn btn-primary"
          style={{ padding: '6px 13px', fontSize: '0.825rem' }}
        >
          <Plus size={14} />
          <span>New Contribution</span>
        </button>
      </div>
    </header>
  );
};
