import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WorkflowRun } from '../lib/types';

// Mock dependencies before importing the hook
vi.mock('../lib/api', () => ({
  listWorkflowRuns: vi.fn(),
  getWorkflowRun: vi.fn(),
  deleteWorkflowRun: vi.fn().mockResolvedValue({ success: true }),
  clearAllWorkflowRuns: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../lib/indexeddb', () => ({
  getAllRuns: vi.fn().mockResolvedValue([]),
  saveRun: vi.fn().mockResolvedValue(undefined),
  deleteRun: vi.fn().mockResolvedValue(undefined),
  clearAllRuns: vi.fn().mockResolvedValue(undefined),
  runToHistoryItem: (run: any) => ({
    id: run.id,
    repository: typeof run.repository === 'string' ? run.repository : run.repository?.fullName || '',
    issueNumber: run.issueNumber,
    issueTitle: run.issue?.title || null,
    status: run.status,
    currentAgent: run.currentAgent,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    revisionCount: run.revisionCount,
  }),
}));

// Build lightweight React hook test harness for pure Node execution
let stateValues: any[] = [];
let stateSetters: Array<(val: any) => void> = [];
let hookStateIndex = 0;
let effectCleanups: Array<(() => void) | void> = [];
let pendingEffects: Array<() => (() => void) | void> = [];

vi.mock('react', () => ({
  useState: (initial: any) => {
    const idx = hookStateIndex++;
    if (stateValues.length <= idx) {
      stateValues[idx] = typeof initial === 'function' ? initial() : initial;
    }
    const setter = (update: any) => {
      const nextVal = typeof update === 'function' ? update(stateValues[idx]) : update;
      stateValues[idx] = nextVal;
    };
    stateSetters[idx] = setter;
    return [stateValues[idx], setter];
  },
  useRef: (initial: any) => {
    const idx = hookStateIndex++;
    if (stateValues.length <= idx) {
      stateValues[idx] = { current: initial };
    }
    return stateValues[idx];
  },
  useCallback: (fn: any) => fn,
  useEffect: (effect: () => (() => void) | void) => {
    pendingEffects.push(effect);
  },
}));

import { useRunHistory } from './useRunHistory';
import * as api from '../lib/api';
import * as idb from '../lib/indexeddb';

function renderHookHarness() {
  hookStateIndex = 0;
  return useRunHistory();
}

async function runPendingEffects() {
  const effectsToRun = [...pendingEffects];
  pendingEffects = [];
  for (const eff of effectsToRun) {
    const cleanup = eff();
    if (cleanup) effectCleanups.push(cleanup);
  }
}

function unmountHarness() {
  for (const cleanup of effectCleanups) {
    if (typeof cleanup === 'function') cleanup();
  }
  effectCleanups = [];
}

describe('useRunHistory hook (src/hooks/useRunHistory.ts)', () => {
  beforeEach(() => {
    stateValues = [];
    stateSetters = [];
    hookStateIndex = 0;
    effectCleanups = [];
    pendingEffects = [];
    vi.clearAllMocks();
  });

  it('initializes with default state and actions', () => {
    const hook = renderHookHarness();

    expect(hook.history).toEqual([]);
    expect(hook.loading).toBe(false);
    expect(typeof hook.refreshHistory).toBe('function');
    expect(typeof hook.deleteHistoryItem).toBe('function');
    expect(typeof hook.clearAllHistory).toBe('function');
  });

  it('loads existing runs immediately from IndexedDB on mount', async () => {
    const localRun: WorkflowRun = {
      id: 'local-run-1',
      status: 'completed',
      repository: { owner: 'org', repo: 'project', fullName: 'org/project', defaultBranch: 'main' },
      issueNumber: 42,
      issue: { number: 42, title: 'Bug title', body: '', state: 'open', htmlUrl: '', author: { login: '', avatarUrl: '' }, labels: [], createdAt: '2026-01-01T00:00:00Z' },
      currentAgent: null,
      agentExecutions: [],
      issueSpecification: null,
      repositoryContext: null,
      implementationPlan: null,
      codingProposal: null,
      reviewReport: null,
      revisionCount: 1,
      error: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T01:00:00Z',
    };

    vi.mocked(idb.getAllRuns).mockResolvedValue([localRun]);
    vi.mocked(api.listWorkflowRuns).mockResolvedValue([]);

    renderHookHarness();
    await runPendingEffects();

    // Allow async initialLoad to complete
    await new Promise((resolve) => setTimeout(resolve, 20));

    const updated = renderHookHarness();
    expect(updated.history).toHaveLength(1);
    expect(updated.history[0].id).toBe('local-run-1');
    expect(updated.history[0].issueTitle).toBe('Bug title');
  });

  describe('refreshHistory sync', () => {
    it('fetches server runs, queries details for new runs, and persists to IndexedDB', async () => {
      vi.mocked(idb.getAllRuns).mockResolvedValue([]);

      const serverList = [
        {
          id: 'server-run-10',
          repository: 'facebook/react',
          issueNumber: 10,
          issueTitle: 'Feature request',
          status: 'running' as const,
          currentAgent: 'coding-agent',
          createdAt: '2026-01-01T12:00:00Z',
          updatedAt: '2026-01-01T12:05:00Z',
        },
      ];

      const fullServerRun: WorkflowRun = {
        id: 'server-run-10',
        status: 'running',
        repository: { owner: 'facebook', repo: 'react', fullName: 'facebook/react', defaultBranch: 'main' },
        issueNumber: 10,
        issue: null,
        currentAgent: 'coding-agent',
        agentExecutions: [],
        issueSpecification: null,
        repositoryContext: null,
        implementationPlan: null,
        codingProposal: null,
        reviewReport: null,
        revisionCount: 0,
        error: null,
        createdAt: '2026-01-01T12:00:00Z',
        updatedAt: '2026-01-01T12:05:00Z',
      };

      vi.mocked(api.listWorkflowRuns).mockResolvedValue(serverList);
      vi.mocked(api.getWorkflowRun).mockResolvedValue(fullServerRun);

      const hook = renderHookHarness();
      await hook.refreshHistory();

      expect(api.listWorkflowRuns).toHaveBeenCalled();
      expect(api.getWorkflowRun).toHaveBeenCalledWith('server-run-10');
      expect(idb.saveRun).toHaveBeenCalledWith(fullServerRun);

      const updated = renderHookHarness();
      expect(updated.history).toHaveLength(1);
      expect(updated.history[0].id).toBe('server-run-10');
    });

    it('synthesizes minimal run if getWorkflowRun fails for a new server run', async () => {
      vi.mocked(idb.getAllRuns).mockResolvedValue([]);

      const serverList = [
        {
          id: 'server-run-minimal',
          repository: 'vuejs/core',
          issueNumber: 77,
          issueTitle: 'Reactivity issue',
          status: 'queued' as const,
          currentAgent: null,
          createdAt: '2026-01-01T15:00:00Z',
          updatedAt: '2026-01-01T15:00:00Z',
        },
      ];

      vi.mocked(api.listWorkflowRuns).mockResolvedValue(serverList);
      vi.mocked(api.getWorkflowRun).mockRejectedValue(new Error('404 Not Found'));

      const hook = renderHookHarness();
      await hook.refreshHistory();

      expect(idb.saveRun).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'server-run-minimal',
          repository: expect.objectContaining({ fullName: 'vuejs/core' }),
        }),
      );

      const updated = renderHookHarness();
      expect(updated.history).toHaveLength(1);
      expect(updated.history[0].id).toBe('server-run-minimal');
    });

    it('updates status and updatedAt when existing run status changes on server', async () => {
      const existingRun: WorkflowRun = {
        id: 'run-existing-1',
        status: 'queued',
        repository: { owner: 'owner', repo: 'repo', fullName: 'owner/repo', defaultBranch: 'main' },
        issueNumber: 3,
        issue: null,
        currentAgent: null,
        agentExecutions: [],
        issueSpecification: null,
        repositoryContext: null,
        implementationPlan: null,
        codingProposal: null,
        reviewReport: null,
        revisionCount: 0,
        error: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      vi.mocked(idb.getAllRuns).mockResolvedValue([existingRun]);

      const updatedServerList = [
        {
          id: 'run-existing-1',
          repository: 'owner/repo',
          issueNumber: 3,
          issueTitle: null,
          status: 'completed' as const,
          currentAgent: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:10:00Z',
        },
      ];

      vi.mocked(api.listWorkflowRuns).mockResolvedValue(updatedServerList);

      const hook = renderHookHarness();
      await hook.refreshHistory();

      expect(idb.saveRun).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'run-existing-1',
          status: 'completed',
          updatedAt: '2026-01-01T00:10:00Z',
        }),
      );
    });

    it('gracefully preserves local history when server listWorkflowRuns throws', async () => {
      const existingRun: WorkflowRun = {
        id: 'run-local-preserved',
        status: 'completed',
        repository: { owner: 'org', repo: 'app', fullName: 'org/app', defaultBranch: 'main' },
        issueNumber: 1,
        issue: null,
        currentAgent: null,
        agentExecutions: [],
        issueSpecification: null,
        repositoryContext: null,
        implementationPlan: null,
        codingProposal: null,
        reviewReport: null,
        revisionCount: 0,
        error: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      vi.mocked(idb.getAllRuns).mockResolvedValue([existingRun]);
      vi.mocked(api.listWorkflowRuns).mockRejectedValue(new Error('Server offline'));

      const hook = renderHookHarness();
      await hook.refreshHistory();

      const updated = renderHookHarness();
      expect(updated.history).toHaveLength(1);
      expect(updated.history[0].id).toBe('run-local-preserved');
    });
  });

  describe('deleteHistoryItem', () => {
    it('removes item from IndexedDB and state immediately, and calls server endpoint', async () => {
      const initialRuns = [
        { id: 'run-del-1', repository: 'org/repo1', issueNumber: 1, createdAt: '2026-01-01T00:00:00Z', status: 'completed' as const, currentAgent: null, updatedAt: '', issueTitle: null },
        { id: 'run-del-2', repository: 'org/repo2', issueNumber: 2, createdAt: '2026-01-01T00:00:00Z', status: 'completed' as const, currentAgent: null, updatedAt: '', issueTitle: null },
      ];

      // Seed initial history
      stateValues[0] = initialRuns;

      const hook = renderHookHarness();
      await hook.deleteHistoryItem('run-del-1');

      expect(idb.deleteRun).toHaveBeenCalledWith('run-del-1');
      expect(api.deleteWorkflowRun).toHaveBeenCalledWith('run-del-1');

      const updated = renderHookHarness();
      expect(updated.history).toHaveLength(1);
      expect(updated.history[0].id).toBe('run-del-2');
    });
  });

  describe('clearAllHistory', () => {
    it('clears all items from IndexedDB and state, and calls server endpoint', async () => {
      stateValues[0] = [
        { id: 'run-1', repository: 'r1', issueNumber: 1, createdAt: '', status: 'completed' as const, currentAgent: null, updatedAt: '', issueTitle: null },
      ];

      const hook = renderHookHarness();
      await hook.clearAllHistory();

      expect(idb.clearAllRuns).toHaveBeenCalled();
      expect(api.clearAllWorkflowRuns).toHaveBeenCalled();

      const updated = renderHookHarness();
      expect(updated.history).toEqual([]);
    });
  });

  describe('unmount lifecycle', () => {
    it('clears interval on unmount', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      renderHookHarness();
      await runPendingEffects();

      unmountHarness();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});
