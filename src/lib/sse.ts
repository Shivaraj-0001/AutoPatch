import type { WorkflowEvent, WorkflowRun } from './types';

export type SSECallback = (event: WorkflowEvent | { eventType: 'run.state'; run: WorkflowRun }) => void;

export function connectRunEvents(
  runId: string,
  onEvent: SSECallback,
  onError?: (err: Event) => void,
): () => void {
  const url = `/api/runs/${runId}/events`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch (err) {
      console.error('Error parsing SSE event data:', err);
    }
  };

  if (onError) {
    eventSource.onerror = (e) => {
      onError(e);
    };
  }

  return () => {
    eventSource.close();
  };
}
