'use client';

import React from 'react';
import { Settings, Cpu, Shield, RefreshCw } from 'lucide-react';
import type { PublicConfig } from '@/lib/types';
import { Badge } from '@/components/common/Badge';

export interface SettingsPageProps {
  config: PublicConfig | null;
  onRefreshConfig: () => void;
  loading?: boolean;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  config,
  onRefreshConfig,
  loading = false,
  className,
  id,
  style,
}) => {
  const scoutLimit = config?.scoutMaxFiles || 60;

  return (
    <div
      id={id}
      className={className ? `settings-page ${className}` : 'settings-page'}
      style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 20px', ...style }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            <Settings size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              System Configuration
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Inference provider status and orchestration parameters
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefreshConfig}
          disabled={loading}
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          aria-label="Refresh system configuration"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* AI Provider Section */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                AI Model & Inference Provider
              </h3>
            </div>
            {config?.aiConfigured ? (
              <Badge variant="green">Connected</Badge>
            ) : (
              <Badge variant="amber">Not Configured</Badge>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.85rem' }}>
            <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '3px' }}>Provider</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {config?.aiProvider || 'groq'}
              </div>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '3px' }}>Active Model</div>
              <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                {config?.aiModel || 'openai/gpt-oss-120b'}
              </div>
            </div>
          </div>
        </div>

        {/* Orchestration Specs */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Shield size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Orchestration & Safety Specs
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Maximum Revision Attempts</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {`${config?.maxRevisionAttempts || 2} cycles`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Repository Scout File Limit</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                {`Max ${scoutLimit} files / 100KB per file`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Patch Safety Validator</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-emerald)', fontSize: '0.8rem' }}>
                Active (Traversal & Sensitive Protection)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
