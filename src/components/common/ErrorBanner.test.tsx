import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ErrorBanner } from './ErrorBanner';

describe('ErrorBanner Component', () => {
  it('renders message with alert role and assertive live region', () => {
    const html = renderToString(
      <ErrorBanner message="Failed to connect to GitHub" />
    );
    expect(html).toContain('Failed to connect to GitHub');
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('error-banner');
  });

  it('renders optional details when provided', () => {
    const html = renderToString(
      <ErrorBanner
        message="Request timeout"
        details="ETIMEDOUT 140.82.121.4:443"
      />
    );
    expect(html).toContain('Request timeout');
    expect(html).toContain('ETIMEDOUT 140.82.121.4:443');
  });

  it('omits details block when details prop is not provided', () => {
    const html = renderToString(
      <ErrorBanner message="Simple error message" />
    );
    expect(html).toContain('Simple error message');
    expect(html).not.toContain('word-break:break-word');
  });

  it('renders dismiss button with aria-label when onDismiss is supplied', () => {
    const html = renderToString(
      <ErrorBanner
        message="Dismissable alert"
        onDismiss={() => {}}
      />
    );
    expect(html).toContain('<button type="button" aria-label="Dismiss error"');
  });

  it('omits dismiss button when onDismiss is omitted', () => {
    const html = renderToString(
      <ErrorBanner message="Non-dismissable alert" />
    );
    expect(html).not.toContain('aria-label="Dismiss error"');
    expect(html).not.toContain('<button');
  });

  it('triggers onDismiss callback when dismiss button is activated', () => {
    const onDismiss = vi.fn();
    const element = ErrorBanner({
      message: 'Dismissable alert',
      onDismiss,
    }) as React.ReactElement<React.HTMLAttributes<HTMLDivElement>>;

    // The button is the 3rd child in the container (icon, content, button)
    const children = React.Children.toArray(element.props.children);
    const button = children.find(
      (child) => React.isValidElement(child) && child.type === 'button'
    ) as React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>> | undefined;

    expect(button).toBeDefined();
    button?.props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('applies custom className, id, and style props', () => {
    const html = renderToString(
      <ErrorBanner
        id="custom-banner-id"
        className="my-banner-class"
        style={{ opacity: 0.9 }}
        message="Styled banner"
      />
    );
    expect(html).toContain('id="custom-banner-id"');
    expect(html).toContain('error-banner my-banner-class');
    expect(html).toContain('opacity:0.9');
  });
});
