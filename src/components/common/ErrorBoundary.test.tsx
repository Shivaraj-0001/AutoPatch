import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary Component', () => {
  it('renders children when no error occurs', () => {
    const html = renderToString(
      <ErrorBoundary>
        <div data-testid="child-content">Normal Content</div>
      </ErrorBoundary>
    );
    expect(html).toContain('Normal Content');
    expect(html).not.toContain('Component Rendering Error');
  });

  it('updates state via getDerivedStateFromError', () => {
    const testError = new Error('Test crash in child component');
    const state = ErrorBoundary.getDerivedStateFromError(testError);
    expect(state).toEqual({
      hasError: true,
      error: testError,
    });
  });

  it('renders default fallback UI when error state is present', () => {
    const boundary = new ErrorBoundary({
      children: <div>Child</div>,
      fallbackTitle: 'Custom Failure Title',
    });
    boundary.state = {
      hasError: true,
      error: new Error('Critical syntax or render error'),
    };

    const rendered = boundary.render();
    const html = renderToString(rendered as React.ReactElement);

    expect(html).toContain('Custom Failure Title');
    expect(html).toContain('Critical syntax or render error');
    expect(html).toContain('Try to Reload View');
    expect(html).toContain('role="alert"');
  });

  it('renders custom ReactNode fallback when provided', () => {
    const boundary = new ErrorBoundary({
      children: <div>Child</div>,
      fallback: <div id="custom-fallback">Custom error screen</div>,
    });
    boundary.state = {
      hasError: true,
      error: new Error('Fatal error'),
    };

    const rendered = boundary.render();
    const html = renderToString(rendered as React.ReactElement);

    expect(html).toContain('id="custom-fallback"');
    expect(html).toContain('Custom error screen');
    expect(html).not.toContain('Try to Reload View');
  });

  it('renders functional fallback and passes error and reset handler', () => {
    const boundary = new ErrorBoundary({
      children: <div>Child</div>,
      fallback: (err, reset) => (
        <div>
          <span>{`Error: ${err?.message}`}</span>
          <button type="button" onClick={reset}>
            Reset Boundary
          </button>
        </div>
      ),
    });
    boundary.state = {
      hasError: true,
      error: new Error('Network failure'),
    };

    const rendered = boundary.render();
    const html = renderToString(rendered as React.ReactElement);

    expect(html).toContain('Error: Network failure');
    expect(html).toContain('Reset Boundary');
  });

  it('invokes onReset callback and resets state in handleReset', () => {
    const onReset = vi.fn();
    const boundary = new ErrorBoundary({
      children: <div>Child</div>,
      onReset,
    });
    boundary.state = {
      hasError: true,
      error: new Error('Some error'),
    };

    const setStateSpy = vi.spyOn(boundary, 'setState').mockImplementation((partial) => {
      boundary.state = { ...boundary.state, ...(partial as Partial<typeof boundary.state>) };
    });

    boundary.handleReset();

    expect(setStateSpy).toHaveBeenCalledWith({ hasError: false, error: null });
    expect(boundary.state).toEqual({ hasError: false, error: null });
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('calls onError prop and logs error in componentDidCatch', () => {
    const onError = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const boundary = new ErrorBoundary({
      children: <div>Child</div>,
      onError,
    });

    const error = new Error('Render crash');
    const errorInfo: React.ErrorInfo = { componentStack: 'at ChildComponent' };

    boundary.componentDidCatch(error, errorInfo);

    expect(onError).toHaveBeenCalledWith(error, errorInfo);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught rendering error:',
      error,
      errorInfo
    );

    consoleErrorSpy.mockRestore();
  });
});
