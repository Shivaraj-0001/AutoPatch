'use client';

import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  fallback?: ReactNode | ((error: Error | null, reset: () => void) => ReactNode);
  className?: string;
  style?: React.CSSProperties;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    console.error('ErrorBoundary caught rendering error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          className={`glass-panel ${this.props.className || ''}`.trim()}
          style={{
            padding: '24px',
            margin: '20px 0',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            background: 'rgba(244, 63, 94, 0.05)',
            borderRadius: 'var(--radius-lg)',
            ...this.props.style,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(244, 63, 94, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-rose)',
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-rose)', margin: 0 }}>
                {this.props.fallbackTitle || 'Component Rendering Error'}
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                A visual component encountered an issue rendering this state.
              </p>
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: '#070a10',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.775rem',
              color: 'var(--text-muted)',
              marginBottom: '16px',
              wordBreak: 'break-word',
            }}
          >
            {this.state.error?.message || 'Unknown render error'}
          </div>

          <button
            type="button"
            onClick={this.handleReset}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
          >
            <RefreshCw size={14} />
            <span>Try to Reload View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
