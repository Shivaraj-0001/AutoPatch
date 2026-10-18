'use client';

import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'amber' | 'rose' | 'cyan' | 'neutral';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  onClick?: React.MouseEventHandler<HTMLSpanElement>;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
  style,
  title,
  onClick,
}) => {
  const sizeClass = size === 'sm' ? 'badge-sm' : '';
  const clickableClass = onClick ? 'badge-clickable' : '';

  return (
    <span
      title={title}
      className={`badge badge-${variant} ${sizeClass} ${clickableClass} ${className}`.replace(/\s+/g, ' ').trim()}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {icon && <span style={{ display: 'inline-flex', fontSize: '0.9em' }}>{icon}</span>}
      {children}
    </span>
  );
};
