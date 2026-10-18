import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isIndexedDBSupported,
  resetDBInstance,
  getDB,
  saveRun,
  getRun,
  getAllRuns,
  deleteRun,
  clearAllRuns,
  saveRunEvents,
  getRunEvents,
  deleteRunEvents,
  getAppState,
  setAppState,
  removeAppState,
  runToHistoryItem,
  formatPatchContent,
  downloadPatchBlob,
} from './indexeddb';
import type { WorkflowRun, WorkflowEvent } from './types';

describe('IndexedDB Client Storage & Utilities (src/lib/indexeddb.ts)', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    resetDBInstance();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetDBInstance();
    global.window = originalWindow;
  });

  describe('Pure Utility Helpers', () => {
    it('runToHistoryItem formats workflow run correctly with object repository', () => {
      const mockRun: WorkflowRun = {
        id: 'run-uuid-1',
        repository: {
          owner: 'facebook',
          repo: 'react',
          fullName: 'facebook/react',
          defaultBranch: 'main',
        },
        issueNumber: 1234,
        issue: {
          number: 1234,
          title: 'Fix ConcurrentMode bug',
          body: 'Description',
          author: { login: 'dev', avatarUrl: 'https://example.com/avatar.png' },
          labels: [],
          state: 'open',
          htmlUrl: 'https://github.com/facebook/react/issues/1234',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        status: 'completed',
        currentAgent: null,
        agentExecutions: [],
        issueSpecification: null,
        repositoryContext: null,
        implementationPlan: null,
        codingProposal: null,
        reviewReport: null,
        error: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T01:00:00Z',
        revisionCount: 2,
      };

      const historyItem = runToHistoryItem(mockRun);
      expect(historyItem).toEqual({
        id: 'run-uuid-1',
        repository: 'facebook/react',
        issueNumber: 1234,
        issueTitle: 'Fix ConcurrentMode bug',
        status: 'completed',
        currentAgent: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T01:00:00Z',
        revisionCount: 2,
      });
    });

    it('runToHistoryItem handles string repository and missing issue title', () => {
      const mockRun = {
        id: 'run-uuid-2',
        repository: 'vercel/next.js',
        issueNumber: 99,
        issue: null,
        status: 'running' as const,
        currentAgent: 'coding-agent',
        createdAt: '2026-01-02T00:00:00Z',
        updatedAt: '2026-01-02T00:05:00Z',
      } as unknown as WorkflowRun;

      const historyItem = runToHistoryItem(mockRun);
      expect(historyItem.repository).toBe('vercel/next.js');
      expect(historyItem.issueTitle).toBeNull();
      expect(historyItem.status).toBe('running');
    });

    it('formatPatchContent generates formatted header with metadata', () => {
      const patch = 'diff --git a/file.ts b/file.ts\n+console.log("hi");\n';
      const output = formatPatchContent(patch, 'owner/repo', 42);

      expect(output).toContain('# AutoPatch Generated Patch');
      expect(output).toContain('# Repository: owner/repo');
      expect(output).toContain('# Issue: #42');
      expect(output).toContain('# WARNING: This is an AI-generated patch.');
      expect(output).toContain(patch);
    });

    it('formatPatchContent includes revision number when provided', () => {
      const patch = 'diff --git a/index.ts b/index.ts\n';
      const output = formatPatchContent(patch, 'owner/repo', 42, 3);
      expect(output).toContain('# Issue: #42 (Revision 3)');
    });

    it('downloadPatchBlob creates anchor element and triggers download', () => {
      const mockAppend = vi.fn();
      const mockRemove = vi.fn();
      const mockClick = vi.fn();
      let createdHref = '';
      let downloadFilename = '';

      const mockAnchor = {
        set href(val: string) {
          createdHref = val;
        },
        get href() {
          return createdHref;
        },
        set download(val: string) {
          downloadFilename = val;
        },
        get download() {
          return downloadFilename;
        },
        click: mockClick,
      };

      global.document = {
        createElement: vi.fn().mockReturnValue(mockAnchor),
        body: {
          appendChild: mockAppend,
          removeChild: mockRemove,
        },
      } as any;

      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/blob-id');
      global.URL.revokeObjectURL = vi.fn();

      downloadPatchBlob('diff content', 'facebook/react', 101, 2);

      expect(mockAppend).toHaveBeenCalledWith(mockAnchor);
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemove).toHaveBeenCalledWith(mockAnchor);
      expect(downloadFilename).toBe('react-issue-101-rev2.patch');
    });
  });

  describe('SSR / Non-Browser Fallbacks', () => {
    it('isIndexedDBSupported returns false when window is undefined', () => {
      (global as any).window = undefined;
      expect(isIndexedDBSupported()).toBe(false);
    });

    it('isIndexedDBSupported returns false when indexedDB is missing from window', () => {
      (global as any).window = {};
      expect(isIndexedDBSupported()).toBe(false);
    });

    it('getDB rejects when IndexedDB is not supported', async () => {
      (global as any).window = undefined;
      await expect(getDB()).rejects.toThrow('IndexedDB is not supported in this environment');
    });

    it('all storage operations handle unsupported IndexedDB gracefully without uncaught exceptions', async () => {
      (global as any).window = undefined;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(saveRun({ id: '1' } as any)).resolves.toBeUndefined();
      await expect(getRun('1')).resolves.toBeNull();
      await expect(getAllRuns()).resolves.toEqual([]);
      await expect(deleteRun('1')).resolves.toBeUndefined();
      await expect(clearAllRuns()).resolves.toBeUndefined();

      await expect(saveRunEvents('1', [])).resolves.toBeUndefined();
      await expect(getRunEvents('1')).resolves.toEqual([]);
      await expect(deleteRunEvents('1')).resolves.toBeUndefined();

      await expect(getAppState('theme', 'dark')).resolves.toBe('dark');
      await expect(setAppState('theme', 'light')).resolves.toBeUndefined();
      await expect(removeAppState('theme')).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('In-Memory Mock Database Operations', () => {
    let mockStores: Record<string, Map<string, any>>;

    beforeEach(() => {
      mockStores = {
        runs: new Map(),
        events: new Map(),
        app_state: new Map(),
      };

      const mockDb: any = {
        objectStoreNames: {
          contains: (name: string) => name in mockStores,
        },
        createObjectStore: vi.fn().mockImplementation((name: string) => {
          mockStores[name] = new Map();
          return { createIndex: vi.fn() };
        }),
        transaction: (storeName: string, _mode: string) => {
          const storeMap = mockStores[storeName];
          return {
            objectStore: (_s: string) => ({
              put: (val: any) => {
                const req: any = {};
                setTimeout(() => {
                  const key = val.id || val.runId || val.key;
                  storeMap.set(key, val);
                  req.onsuccess?.({ target: { result: key } });
                }, 0);
                return req;
              },
              get: (key: string) => {
                const req: any = {};
                setTimeout(() => {
                  req.result = storeMap.get(key) || null;
                  req.onsuccess?.({ target: { result: req.result } });
                }, 0);
                return req;
              },
              getAll: () => {
                const req: any = {};
                setTimeout(() => {
                  req.result = Array.from(storeMap.values());
                  req.onsuccess?.({ target: { result: req.result } });
                }, 0);
                return req;
              },
              delete: (key: string) => {
                const req: any = {};
                setTimeout(() => {
                  storeMap.delete(key);
                  req.onsuccess?.({ target: {} });
                }, 0);
                return req;
              },
              clear: () => {
                const req: any = {};
                setTimeout(() => {
                  storeMap.clear();
                  req.onsuccess?.({ target: {} });
                }, 0);
                return req;
              },
            }),
          };
        },
        close: vi.fn(),
      };

      (global as any).window = {
        indexedDB: {
          open: () => {
            const req: any = {};
            setTimeout(() => {
              req.result = mockDb;
              req.onupgradeneeded?.({ target: req });
              req.onsuccess?.({ target: req });
            }, 0);
            return req;
          },
        },
      };
    });

    it('saves and retrieves workflow runs, sorted by createdAt descending', async () => {
      const run1 = {
        id: 'run-1',
        createdAt: '2026-01-01T10:00:00Z',
        status: 'completed',
      } as WorkflowRun;

      const run2 = {
        id: 'run-2',
        createdAt: '2026-01-01T12:00:00Z',
        status: 'running',
      } as WorkflowRun;

      await saveRun(run1);
      await saveRun(run2);

      const retrieved1 = await getRun('run-1');
      expect(retrieved1).toEqual(run1);

      const all = await getAllRuns();
      expect(all).toHaveLength(2);
      expect(all[0].id).toBe('run-2'); // newer first
      expect(all[1].id).toBe('run-1');
    });

    it('deletes a run and associated events', async () => {
      const run = { id: 'run-delete-me', createdAt: '2026-01-01T00:00:00Z' } as WorkflowRun;
      await saveRun(run);
      await saveRunEvents('run-delete-me', [{ eventType: 'log', message: 'test' } as any]);

      await deleteRun('run-delete-me');

      expect(await getRun('run-delete-me')).toBeNull();
      expect(await getRunEvents('run-delete-me')).toEqual([]);
    });

    it('clears all runs and events', async () => {
      await saveRun({ id: 'r1', createdAt: '2026-01-01T00:00:00Z' } as any);
      await saveRun({ id: 'r2', createdAt: '2026-01-02T00:00:00Z' } as any);
      await saveRunEvents('r1', [{ eventType: 'log' } as any]);

      await clearAllRuns();

      expect(await getAllRuns()).toEqual([]);
      expect(await getRunEvents('r1')).toEqual([]);
    });

    it('saves, gets, and removes application state values', async () => {
      await setAppState('activeTab', 'workspace');
      expect(await getAppState<string>('activeTab')).toBe('workspace');

      await removeAppState('activeTab');
      expect(await getAppState<string>('activeTab')).toBeNull();
      expect(await getAppState<string>('activeTab', 'defaultTab')).toBe('defaultTab');
    });

    it('stores and retrieves workflow events list for a run', async () => {
      const events: WorkflowEvent[] = [
        {
          id: 'ev-1',
          eventType: 'agent.started',
          runId: 'run-ev-1',
          agentName: 'issue-analyst',
          message: 'Agent started',
          timestamp: '2026-01-01T00:00:00Z',
        },
        {
          id: 'ev-2',
          eventType: 'agent.completed',
          runId: 'run-ev-1',
          agentName: 'issue-analyst',
          message: 'Agent completed',
          timestamp: '2026-01-01T00:01:00Z',
        },
      ];

      await saveRunEvents('run-ev-1', events);
      const loaded = await getRunEvents('run-ev-1');
      expect(loaded).toEqual(events);

      await deleteRunEvents('run-ev-1');
      expect(await getRunEvents('run-ev-1')).toEqual([]);
    });
  });
});
