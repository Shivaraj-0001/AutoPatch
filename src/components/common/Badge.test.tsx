import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Badge } from './Badge';

describe('Badge Component', () => {
  it('renders children with default neutral variant', () => {
    const html = renderToString(<Badge>Test Badge</Badge>);
    expect(html).toContain('Test Badge');
    expect(html).toContain('badge badge-neutral');
  });

  it('renders specific color variants properly', () => {
    const variants = ['blue', 'green', 'amber', 'rose', 'cyan', 'neutral'] as const;

    for (const variant of variants) {
      const html = renderToString(<Badge variant={variant}>{`Variant ${variant}`}</Badge>);
      expect(html).toContain(`badge badge-${variant}`);
      expect(html).toContain(`Variant ${variant}`);
    }
  });

  it('renders optional icon when provided', () => {
    const icon = <span data-testid="custom-icon">★</span>;
    const html = renderToString(<Badge icon={icon}>With Icon</Badge>);
    expect(html).toContain('★');
    expect(html).toContain('With Icon');
    expect(html).toContain('display:inline-flex');
  });

  it('merges custom className with variant classes', () => {
    const html = renderToString(
      <Badge variant="green" className="custom-class additional-style">
        Green Badge
      </Badge>
    );
    expect(html).toContain('badge badge-green custom-class additional-style');
  });

  it('applies custom inline styles', () => {
    const html = renderToString(
      <Badge style={{ cursor: 'pointer', opacity: 0.8 }}>Clickable</Badge>
    );
    expect(html).toContain('cursor:pointer');
    expect(html).toContain('opacity:0.8');
  });

  it('renders small size and title attribute when provided', () => {
    const html = renderToString(
      <Badge size="sm" title="Tooltip Title">Small Badge</Badge>
    );
    expect(html).toContain('badge-sm');
    expect(html).toContain('title="Tooltip Title"');
  });

  it('applies accessibility attributes and clickable class when onClick is provided', () => {
    const html = renderToString(
      <Badge onClick={() => {}}>Interactive</Badge>
    );
    expect(html).toContain('badge-clickable');
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
  });
});
