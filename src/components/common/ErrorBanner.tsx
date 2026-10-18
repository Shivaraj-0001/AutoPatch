'use client';

import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export interface ErrorBannerProps {
  message: string;
  details?: string;
  onDismiss?: () => void;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  details,
  onDismiss,
  className = '',
  style,
  id,
}) => {
  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      className={`error-banner ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'rgba(244, 63, 94, 0.12)',
        border: '1px solid rgba(244, 63, 94, 0.3)',
        color: '#fecdd3',
        marginBottom: '16px',
        ...style,
      }}
    >
      <AlertCircle size={20} color="var(--accent-rose)" style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{message}</div>
        {details && (
          <div style={{ fontSize: '0.8rem', color: '#fda4af', marginTop: '4px', wordBreak: 'break-word' }}>
            {details}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss error"
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#fda4af',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
