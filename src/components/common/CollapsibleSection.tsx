'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  icon,
  badge,
  defaultOpen = true,
  isOpen: controlledIsOpen,
  onToggle,
  headerRight,
  children,
  className = '',
  style,
  id,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    const nextState = !isOpen;
    if (!isControlled) {
      setInternalIsOpen(nextState);
    }
    onToggle?.(nextState);
  };

  const contentId = id ? `${id}-content` : undefined;

  return (
    <div
      id={id}
      className={`glass-panel collapsible-section ${className}`.trim()}
      style={{
        marginBottom: '16px',
        overflow: 'hidden',
        transition: 'all var(--transition-fast)',
        ...style,
      }}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={handleToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          userSelect: 'none',
          borderBottom: isOpen ? '1px solid var(--border-subtle)' : 'none',
          transition: 'background var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {icon && (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {title}
              </span>
              {badge}
            </div>
            {subtitle && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {headerRight && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              {headerRight}
            </div>
          )}
          <div
            style={{
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.03)',
            }}
          >
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </div>
      </button>

      {isOpen && (
        <div id={contentId} style={{ padding: '20px' }}>
          {children}
        </div>
      )}
    </div>
  );
};
