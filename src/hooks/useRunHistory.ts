'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { RunHistoryItem, WorkflowRun } from '../lib/types';
import { listWorkflowRuns, getWorkflowRun, deleteWorkflowRun, clearAllWorkflowRuns } from '../lib/api';
import {
  getAllRuns,
  saveRun,
  deleteRun as deleteRunFromDB,
  clearAllRuns as clearAllRunsFromDB,
  runToHistoryItem,
} from '../lib/indexeddb';

export type { RunHistoryItem };

export interface UseRunHistoryOptions {
  autoRefresh?: boolean;
  pollIntervalMs?: number;
}

export function useRunHistory(options: UseRunHistoryOptions = {}) {
  const { autoRefresh = true, pollIntervalMs = 10_000 } = options;
  const [history, setHistory] = useState<RunHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync IndexedDB with server runs
  const fetchHistory = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setLoading(true);

      // 1. Load what we currently have in IndexedDB
      const localRuns = await getAllRuns();
      if (!isMountedRef.current) return;
      const localMap = new Map<string, WorkflowRun>(localRuns.map((r) => [r.id, r]));

      // 2. Fetch runs from server
      try {
        const serverRuns = await listWorkflowRuns();

        // For each server run, sync to IndexedDB if missing or changed
        for (const sRun of serverRuns) {
          const existing = localMap.get(sRun.id);
          if (!existing) {
            // New run on server not in IndexedDB yet: fetch full details and persist
            try {
              const fullRun = await getWorkflowRun(sRun.id);
              await saveRun(fullRun);
              localMap.set(fullRun.id, fullRun);
            } catch {
              // If full fetch fails, synthesize a minimal run
              const minimalRun: WorkflowRun = {
                id: sRun.id,
                status: sRun.status,
                repository: {
                  owner: sRun.repository.split('/')[0] || '',
                  repo: sRun.repository.split('/')[1] || '',
                  fullName: sRun.repository,
                  defaultBranch: 'main',
                },
                issueNumber: sRun.issueNumber,
                issue: sRun.issueTitle ? {
                  number: sRun.issueNumber,
                  title: sRun.issueTitle,
                  body: '',
                  state: 'open',
                  htmlUrl: '',
                  author: { login: '', avatarUrl: '' },
                  labels: [],
                  createdAt: sRun.createdAt,
                } : null,
                currentAgent: sRun.currentAgent as any,
                agentExecutions: [],
                issueSpecification: null,
                repositoryContext: null,
                implementationPlan: null,
                codingProposal: null,
                reviewReport: null,
                revisionCount: 0,
                error: null,
                createdAt: sRun.createdAt,
                updatedAt: sRun.updatedAt,
              };
              await saveRun(minimalRun);
              localMap.set(minimalRun.id, minimalRun);
            }
          } else if (existing.status !== sRun.status || existing.updatedAt !== sRun.updatedAt) {
            // Updated status on server: update local copy
            const updated: WorkflowRun = {
              ...existing,
              status: sRun.status,
              currentAgent: sRun.currentAgent as any,
              updatedAt: sRun.updatedAt,
            };
            await saveRun(updated);
            localMap.set(updated.id, updated);
          }
        }
      } catch (serverErr) {
        // If server is unreachable or returned an error, preserve all existing IndexedDB runs
        console.warn('Server runs unavailable, using IndexedDB offline history:', serverErr);
      }

      // Convert combined map to sorted history list
      const combined = Array.from(localMap.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(runToHistoryItem);

      if (isMountedRef.current) {
        setHistory(combined);
      }
    } catch (err) {
      console.error('Failed to load run history:', err);
      if (isMountedRef.current) {
        setError((err as Error).message || 'Failed to load run history');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Initial load from IndexedDB immediately, then sync with server
  useEffect(() => {
    let active = true;

    async function initialLoad() {
      // 1. Load instantly from IndexedDB so there is 0ms delay / no blank flash
      const localRuns = await getAllRuns();
      if (active && localRuns.length > 0) {
        setHistory(localRuns.map(runToHistoryItem));
      }
      // 2. Sync with server in background
      if (active) {
        fetchHistory();
      }
    }

    initialLoad();

    // Auto-refresh interval if enabled
    let interval: ReturnType<typeof setInterval> | null = null;
    if (autoRefresh && pollIntervalMs > 0) {
      interval = setInterval(() => {
        fetchHistory();
      }, pollIntervalMs);
    }

    return () => {
      active = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [fetchHistory, autoRefresh, pollIntervalMs]);

  // Delete a single run from history
  const deleteHistoryItem = useCallback(async (id: string) => {
    if (!id || typeof id !== 'string') return;
    // 1. Remove from local IndexedDB
    await deleteRunFromDB(id);
    // 2. Update state immediately
    setHistory((prev) => prev.filter((item) => item.id !== id));
    // 3. Delete from server if supported
    deleteWorkflowRun(id).catch(() => {});
  }, []);

  // Clear all run history
  const clearAllHistory = useCallback(async () => {
    // 1. Clear IndexedDB
    await clearAllRunsFromDB();
    // 2. Update state immediately
    setHistory([]);
    // 3. Clear server runs if supported
    clearAllWorkflowRuns().catch(() => {});
  }, []);

  return {
    history,
    loading,
    error,
    refreshHistory: fetchHistory,
    deleteHistoryItem,
    clearAllHistory,
  };
}
