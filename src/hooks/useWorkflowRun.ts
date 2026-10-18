'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WorkflowRun, WorkflowEvent } from '../lib/types';
import {
  startWorkflowRun,
  getWorkflowRun,
  cancelWorkflowRun,
  refineWorkflowRun,
} from '../lib/api';
import { connectRunEvents } from '../lib/sse';
import {
  saveRun as saveRunToDB,
  getRun as getRunFromDB,
  saveRunEvents as saveEventsToDB,
  getRunEvents as getEventsFromDB,
  getAppState,
  setAppState,
  removeAppState,
} from '../lib/indexeddb';

export function useWorkflowRun() {
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runRef = useRef<WorkflowRun | null>(null);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const disconnectRef = useRef<(() => void) | null>(null);

  // Clean up SSE connection
  const disconnect = useCallback(() => {
    if (disconnectRef.current) {
      disconnectRef.current();
      disconnectRef.current = null;
    }
  }, []);

  // Poll or refresh full run details
  const refreshRun = useCallback(async (runId: string) => {
    try {
      const data = await getWorkflowRun(runId);
      setRun(data);
      // Persist latest state to IndexedDB
      await saveRunToDB(data);
      return data;
    } catch (err: unknown) {
      console.warn('Failed to refresh run from server:', err);
      // If server failed (e.g. server restarted), check if we have local cached run
      const local = await getRunFromDB(runId);
      if (local) {
        // If run was in flight but server is unreachable or 404, mark as interrupted
        if (local.status === 'running' || local.status === 'queued') {
          const updated: WorkflowRun = {
            ...local,
            status: 'failed',
            error: 'Server connection lost. Preserved in local browser storage.',
            updatedAt: new Date().toISOString(),
          };
          setRun(updated);
          await saveRunToDB(updated);
          return updated;
        }
        return local;
      }
      return null;
    }
  }, []);

  // Connect to SSE for a specific run ID
  const connectToRun = useCallback(
    (runId: string) => {
      disconnect();

      const cleanup = connectRunEvents(
        runId,
        (data) => {
          if ('eventType' in data && data.eventType === 'run.state' && 'run' in data) {
            const updatedRun = data.run as WorkflowRun;
            setRun(updatedRun);
            saveRunToDB(updatedRun);
            return;
          }

          const event = data as WorkflowEvent;
          setEvents((prev) => {
            const next = [...prev, event];
            saveEventsToDB(runId, next);
            return next;
          });

          // When terminal or milestone events occur, refresh run to get latest artifacts & revisions
          if (
            event.eventType === 'run.completed' ||
            event.eventType === 'run.failed' ||
            event.eventType === 'run.cancelled' ||
            event.eventType === 'agent.completed' ||
            event.eventType === 'artifact.created' ||
            event.eventType === 'revision.started'
          ) {
            refreshRun(runId);
          }
        },
        () => {
          // Fallback refresh on error/disconnect
          refreshRun(runId);
        },
      );

      disconnectRef.current = cleanup;
    },
    [disconnect, refreshRun],
  );

  // Restore run from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;

    async function restoreActiveRun() {
      try {
        const lastRunId = await getAppState<string>('lastSelectedRunId');
        if (!lastRunId || !isMounted) return;

        // 1. Load instantly from IndexedDB
        const cachedRun = await getRunFromDB(lastRunId);
        if (!cachedRun || !isMounted) return;

        const cachedEvents = await getEventsFromDB(lastRunId);
        if (!isMounted) return;

        setRun(cachedRun);
        setEvents(cachedEvents);

        // 2. If it was active, reconnect SSE or refresh
        if (cachedRun.status === 'running' || cachedRun.status === 'queued') {
          connectToRun(lastRunId);
          refreshRun(lastRunId);
        }
      } catch (err) {
        console.error('Failed to restore active run from IndexedDB:', err);
      }
    }

    restoreActiveRun();

    return () => {
      isMounted = false;
      disconnect();
    };
  }, [connectToRun, refreshRun, disconnect]);

  // Start new run
  const start = useCallback(
    async (params: {
      repoUrl: string;
      issueNumber: number;
      additionalInstructions?: string;
      targetBranch?: string;
    }) => {
      setIsLoading(true);
      setError(null);
      setEvents([]);

      try {
        const { id } = await startWorkflowRun(params);
        const initialRun = await getWorkflowRun(id);

        setRun(initialRun);
        await saveRunToDB(initialRun);
        await setAppState('lastSelectedRunId', id);

        connectToRun(id);
        return initialRun;
      } catch (err: any) {
        setError(err.message || 'Failed to start workflow');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [connectToRun],
  );

  // Load existing run by ID (from IndexedDB first, then verify with server)
  const loadRun = useCallback(
    async (runId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await setAppState('lastSelectedRunId', runId);

        // 1. Instant load from IndexedDB
        const localRun = await getRunFromDB(runId);
        const localEvents = await getEventsFromDB(runId);
        if (localRun) {
          setRun(localRun);
          setEvents(localEvents);
        }

        // 2. Fetch fresh from server if available
        try {
          const serverRun = await getWorkflowRun(runId);
          setRun(serverRun);
          await saveRunToDB(serverRun);

          if (serverRun.status === 'running' || serverRun.status === 'queued') {
            connectToRun(runId);
          }
          return serverRun;
        } catch {
          // If server failed (e.g. offline or restarted), local run is still loaded
          if (localRun) {
            return localRun;
          }
          throw new Error('Failed to load run from server or local database');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load run');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [connectToRun],
  );

  // Cancel current run
  const cancel = useCallback(async () => {
    const currentRun = runRef.current;
    if (!currentRun?.id) return;
    try {
      await cancelWorkflowRun(currentRun.id);
      await refreshRun(currentRun.id);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel run');
    }
  }, [refreshRun]);

  // Refine run with review feedback or user instructions
  const refine = useCallback(
    async (options?: { instructions?: string; selectedSuggestions?: string[] }) => {
      const currentRun = runRef.current;
      if (!currentRun?.id) return;
      setIsLoading(true);
      setError(null);
      try {
        await refineWorkflowRun(currentRun.id, options);
        connectToRun(currentRun.id);
        await refreshRun(currentRun.id);
      } catch (err: any) {
        setError(err.message || 'Failed to refine workflow run');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [connectToRun, refreshRun],
  );

  const reset = useCallback(async () => {
    disconnect();
    setRun(null);
    setEvents([]);
    setError(null);
    await removeAppState('lastSelectedRunId');
  }, [disconnect]);

  return {
    run,
    events,
    isLoading,
    error,
    start,
    loadRun,
    cancel,
    refine,
    reset,
    refreshRun: run?.id ? () => refreshRun(run.id) : undefined,
  };
}
