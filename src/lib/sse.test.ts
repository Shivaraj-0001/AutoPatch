import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectRunEvents } from './sse';

describe('Server-Sent Events client utility (src/lib/sse.ts)', () => {
  let mockEventSourceInstances: any[] = [];
  const originalEventSource = global.EventSource;

  class MockEventSource {
    url: string;
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    closed = false;

    constructor(url: string) {
      this.url = url;
      mockEventSourceInstances.push(this);
    }

    close() {
      this.closed = true;
    }
  }

  beforeEach(() => {
    mockEventSourceInstances = [];
    (global as any).EventSource = MockEventSource;
  });

  afterEach(() => {
    (global as any).EventSource = originalEventSource;
  });

  it('connects to the correct SSE endpoint URL', () => {
    const onEvent = vi.fn();
    connectRunEvents('run-abc-123', onEvent);

    expect(mockEventSourceInstances).toHaveLength(1);
    expect(mockEventSourceInstances[0].url).toBe('/api/runs/run-abc-123/events');
  });

  it('parses incoming JSON messages and dispatches to onEvent callback', () => {
    const onEvent = vi.fn();
    connectRunEvents('run-1', onEvent);

    const instance = mockEventSourceInstances[0];
    const testPayload = {
      eventType: 'agent.completed',
      runId: 'run-1',
      agent: 'issue-analyst',
      timestamp: '2026-01-01T00:00:00Z',
    };

    instance.onmessage?.({ data: JSON.stringify(testPayload) });
    expect(onEvent).toHaveBeenCalledWith(testPayload);
  });

  it('handles invalid JSON gracefully without throwing', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onEvent = vi.fn();
    connectRunEvents('run-1', onEvent);

    const instance = mockEventSourceInstances[0];
    expect(() => {
      instance.onmessage?.({ data: 'not-valid-json{{{' });
    }).not.toThrow();

    expect(onEvent).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error parsing SSE event data:',
      expect.any(Error),
    );
  });

  it('wires up onError callback when provided', () => {
    const onEvent = vi.fn();
    const onError = vi.fn();
    connectRunEvents('run-err-1', onEvent, onError);

    const instance = mockEventSourceInstances[0];
    const mockErrorEvent = new Event('error');
    instance.onerror?.(mockErrorEvent);

    expect(onError).toHaveBeenCalledWith(mockErrorEvent);
  });

  it('does not register onerror handler when onError is omitted', () => {
    const onEvent = vi.fn();
    connectRunEvents('run-no-err', onEvent);

    const instance = mockEventSourceInstances[0];
    expect(instance.onerror).toBeNull();
  });

  it('returns cleanup function that closes the EventSource connection', () => {
    const onEvent = vi.fn();
    const disconnect = connectRunEvents('run-close-1', onEvent);

    const instance = mockEventSourceInstances[0];
    expect(instance.closed).toBe(false);

    disconnect();
    expect(instance.closed).toBe(true);
  });

  it('returns a no-op cleanup function safely when EventSource is not supported (SSR)', () => {
    (global as any).EventSource = undefined;
    const onEvent = vi.fn();
    const disconnect = connectRunEvents('run-ssr', onEvent);
    expect(typeof disconnect).toBe('function');
    expect(() => disconnect()).not.toThrow();
  });
});
