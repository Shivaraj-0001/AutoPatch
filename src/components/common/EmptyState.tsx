'use client';

import React from 'react';
import { GitPullRequest } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <GitPullRequest size={36} color="var(--accent-primary)" />,
  title,
  description,
  action,
  className = '',
  style,
  id,
}) => {
  return (
    <div
      id={id}
      className={`empty-state ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '60px 24px',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--border-medium)',
        background: 'rgba(17, 24, 39, 0.4)',
        maxWidth: '560px',
        margin: '40px auto',
        ...style,
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(99, 102, 241, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        {icon}
      </div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '420px', marginBottom: action ? '20px' : 0 }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
