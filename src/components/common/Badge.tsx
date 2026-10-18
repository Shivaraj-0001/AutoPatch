'use client';

import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'amber' | 'rose' | 'cyan' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLSpanElement>;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  icon,
  className = '',
  style,
  onClick,
}) => {
  return (
    <span
      className={`badge badge-${variant} ${className}`.trim()}
      style={style}
      onClick={onClick}
    >
      {icon && <span style={{ display: 'inline-flex', fontSize: '0.9em' }}>{icon}</span>}
      {children}
    </span>
  );
};
