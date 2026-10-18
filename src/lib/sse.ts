import type { WorkflowEvent, WorkflowRun } from './types';

export type SSECallback = (event: WorkflowEvent | { eventType: 'run.state'; run: WorkflowRun }) => void;

export function connectRunEvents(
  runId: string,
  onEvent: SSECallback,
  onError?: (err: Event) => void,
): () => void {
  const EventSourceConstructor =
    (typeof window !== 'undefined' ? (window as any).EventSource : undefined) ||
    (typeof EventSource !== 'undefined' ? EventSource : undefined);

  if (!EventSourceConstructor) {
    return () => {};
  }

  const url = `/api/runs/${runId}/events`;
  const eventSource = new EventSourceConstructor(url);

  eventSource.onmessage = (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch (err) {
      console.error('Error parsing SSE event data:', err);
    }
  };

  if (onError) {
    eventSource.onerror = (e: Event) => {
      onError(e);
    };
  }

  return () => {
    eventSource.close();
  };
}
