import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WorkflowRun, WorkflowEvent } from '../lib/types';

// Mock dependencies before importing the hook
vi.mock('../lib/api', () => ({
  startWorkflowRun: vi.fn(),
  getWorkflowRun: vi.fn(),
  cancelWorkflowRun: vi.fn(),
  refineWorkflowRun: vi.fn(),
}));

vi.mock('../lib/sse', () => ({
  connectRunEvents: vi.fn(),
}));

vi.mock('../lib/indexeddb', () => ({
  saveRun: vi.fn().mockResolvedValue(undefined),
  getRun: vi.fn().mockResolvedValue(null),
  saveRunEvents: vi.fn().mockResolvedValue(undefined),
  getRunEvents: vi.fn().mockResolvedValue([]),
  getAppState: vi.fn().mockResolvedValue(null),
  setAppState: vi.fn().mockResolvedValue(undefined),
  removeAppState: vi.fn().mockResolvedValue(undefined),
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

import { useWorkflowRun } from './useWorkflowRun';
import * as api from '../lib/api';
import * as sse from '../lib/sse';
import * as idb from '../lib/indexeddb';

function renderHookHarness() {
  hookStateIndex = 0;
  const result = useWorkflowRun();
  return result;
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

describe('useWorkflowRun hook (src/hooks/useWorkflowRun.ts)', () => {
  beforeEach(() => {
    stateValues = [];
    stateSetters = [];
    hookStateIndex = 0;
    effectCleanups = [];
    pendingEffects = [];
    vi.clearAllMocks();
  });

  it('initializes with default empty state and actions', () => {
    const hook = renderHookHarness();

    expect(hook.run).toBeNull();
    expect(hook.events).toEqual([]);
    expect(hook.isLoading).toBe(false);
    expect(hook.error).toBeNull();
    expect(typeof hook.start).toBe('function');
    expect(typeof hook.loadRun).toBe('function');
    expect(typeof hook.cancel).toBe('function');
    expect(typeof hook.refine).toBe('function');
    expect(typeof hook.reset).toBe('function');
    expect(hook.refreshRun).toBeUndefined();
  });

  describe('start workflow run', () => {
    it('creates and initializes a new run successfully', async () => {
      const mockRun: WorkflowRun = {
        id: 'run-start-123',
        status: 'queued',
        repository: { owner: 'test', repo: 'app', fullName: 'test/app', defaultBranch: 'main' },
        issueNumber: 10,
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

      vi.mocked(api.startWorkflowRun).mockResolvedValue({
        id: 'run-start-123',
        status: 'queued',
        createdAt: '2026-01-01T00:00:00Z',
      });
      vi.mocked(api.getWorkflowRun).mockResolvedValue(mockRun);
      vi.mocked(sse.connectRunEvents).mockReturnValue(vi.fn());

      const hook = renderHookHarness();
      const started = await hook.start({
        repoUrl: 'https://github.com/test/app',
        issueNumber: 10,
      });

      expect(started).toEqual(mockRun);
      expect(api.startWorkflowRun).toHaveBeenCalledWith({
        repoUrl: 'https://github.com/test/app',
        issueNumber: 10,
      });
      expect(idb.saveRun).toHaveBeenCalledWith(mockRun);
      expect(idb.setAppState).toHaveBeenCalledWith('lastSelectedRunId', 'run-start-123');
      expect(sse.connectRunEvents).toHaveBeenCalledWith('run-start-123', expect.any(Function), expect.any(Function));
    });

    it('sets error and resets loading state when startWorkflowRun fails', async () => {
      vi.mocked(api.startWorkflowRun).mockRejectedValue(new Error('Network error starting run'));

      const hook = renderHookHarness();
      await expect(
        hook.start({
          repoUrl: 'https://github.com/test/app',
          issueNumber: 10,
        }),
      ).rejects.toThrow('Network error starting run');

      const updated = renderHookHarness();
      expect(updated.error).toBe('Network error starting run');
      expect(updated.isLoading).toBe(false);
    });

    it('creates run and falls back to resilient initial state if follow-up getWorkflowRun fails', async () => {
      vi.mocked(api.startWorkflowRun).mockResolvedValue({
        id: 'run-resilient-1',
        status: 'queued',
        createdAt: '2026-01-01T00:00:00Z',
      });
      vi.mocked(api.getWorkflowRun).mockRejectedValue(new Error('Transient fetch failure'));
      vi.mocked(sse.connectRunEvents).mockReturnValue(vi.fn());

      const hook = renderHookHarness();
      const started = await hook.start({
        repoUrl: 'https://github.com/facebook/react',
        issueNumber: 99,
        targetBranch: 'main',
      });

      expect(started.id).toBe('run-resilient-1');
      expect(started.status).toBe('queued');
      expect(started.repository.fullName).toBe('facebook/react');
      expect(sse.connectRunEvents).toHaveBeenCalledWith('run-resilient-1', expect.any(Function), expect.any(Function));
      expect(idb.saveRun).toHaveBeenCalledWith(started);
    });
  });

  describe('load existing run', () => {
    it('loads run from IndexedDB and refreshes from server', async () => {
      const mockRun: WorkflowRun = {
        id: 'run-load-456',
        status: 'completed',
        repository: { owner: 'test', repo: 'app', fullName: 'test/app', defaultBranch: 'main' },
        issueNumber: 5,
        issue: null,
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
        updatedAt: '2026-01-01T00:00:00Z',
      };

      vi.mocked(idb.getRun).mockResolvedValue(mockRun);
      vi.mocked(idb.getRunEvents).mockResolvedValue([]);
      vi.mocked(api.getWorkflowRun).mockResolvedValue(mockRun);

      const hook = renderHookHarness();
      const loaded = await hook.loadRun('run-load-456');

      expect(loaded).toEqual(mockRun);
      expect(idb.setAppState).toHaveBeenCalledWith('lastSelectedRunId', 'run-load-456');
      expect(idb.getRun).toHaveBeenCalledWith('run-load-456');
      expect(api.getWorkflowRun).toHaveBeenCalledWith('run-load-456');
    });

    it('falls back to local IndexedDB run if server call fails', async () => {
      const cachedRun: WorkflowRun = {
        id: 'run-offline-1',
        status: 'completed',
        repository: { owner: 'test', repo: 'app', fullName: 'test/app', defaultBranch: 'main' },
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

      vi.mocked(idb.getRun).mockResolvedValue(cachedRun);
      vi.mocked(idb.getRunEvents).mockResolvedValue([]);
      vi.mocked(api.getWorkflowRun).mockRejectedValue(new Error('Server unavailable'));

      const hook = renderHookHarness();
      const result = await hook.loadRun('run-offline-1');

      expect(result).toEqual(cachedRun);
    });
  });

  describe('cancel workflow run', () => {
    it('calls cancelWorkflowRun and refreshes state', async () => {
      const mockRun: WorkflowRun = {
        id: 'run-to-cancel',
        status: 'running',
        repository: { owner: 'test', repo: 'app', fullName: 'test/app', defaultBranch: 'main' },
        issueNumber: 7,
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
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      vi.mocked(api.startWorkflowRun).mockResolvedValue({ id: 'run-to-cancel', status: 'running', createdAt: '' });
      vi.mocked(api.getWorkflowRun).mockResolvedValue(mockRun);
      vi.mocked(api.cancelWorkflowRun).mockResolvedValue({ status: 'cancelled' });

      const hook = renderHookHarness();
      await hook.start({ repoUrl: 'https://github.com/test/app', issueNumber: 7 });

      // Re-render and flush effect so runRef is updated
      const updatedHook = renderHookHarness();
      await runPendingEffects();

      await updatedHook.cancel();
      expect(api.cancelWorkflowRun).toHaveBeenCalledWith('run-to-cancel');
    });
  });

  describe('refine workflow run', () => {
    it('submits refinement instructions and reconnects SSE stream', async () => {
      const mockRun: WorkflowRun = {
        id: 'run-refine-test',
        status: 'completed',
        repository: { owner: 'test', repo: 'app', fullName: 'test/app', defaultBranch: 'main' },
        issueNumber: 8,
        issue: null,
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
        updatedAt: '2026-01-01T00:00:00Z',
      };

      vi.mocked(api.startWorkflowRun).mockResolvedValue({ id: 'run-refine-test', status: 'completed', createdAt: '' });
      vi.mocked(api.getWorkflowRun).mockResolvedValue(mockRun);
      vi.mocked(api.refineWorkflowRun).mockResolvedValue({ id: 'run-refine-test', status: 'queued', revisionCount: 2 });
      vi.mocked(sse.connectRunEvents).mockReturnValue(vi.fn());

      const hook = renderHookHarness();
      await hook.start({ repoUrl: 'https://github.com/test/app', issueNumber: 8 });
      const updatedHook = renderHookHarness();
      await runPendingEffects();

      await updatedHook.refine({ instructions: 'Address comments' });
      expect(api.refineWorkflowRun).toHaveBeenCalledWith('run-refine-test', { instructions: 'Address comments' });
    });
  });

  describe('reset', () => {
    it('resets hook state and clears lastSelectedRunId', async () => {
      const hook = renderHookHarness();
      await hook.reset();

      expect(idb.removeAppState).toHaveBeenCalledWith('lastSelectedRunId');
      const updated = renderHookHarness();
      expect(updated.run).toBeNull();
      expect(updated.events).toEqual([]);
      expect(updated.error).toBeNull();
    });
  });

  describe('SSE real-time event subscription', () => {
    it('appends incoming WorkflowEvent to events list and persists to IndexedDB', async () => {
      let sseCallback: any;
      vi.mocked(sse.connectRunEvents).mockImplementation((_id, cb) => {
        sseCallback = cb;
        return vi.fn();
      });

      const mockRun: WorkflowRun = {
        id: 'run-sse-test',
        status: 'running',
        repository: { owner: 'test', repo: 'app', fullName: 'test/app', defaultBranch: 'main' },
        issueNumber: 12,
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
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      vi.mocked(api.startWorkflowRun).mockResolvedValue({ id: 'run-sse-test', status: 'running', createdAt: '' });
      vi.mocked(api.getWorkflowRun).mockResolvedValue(mockRun);

      const hook = renderHookHarness();
      await hook.start({ repoUrl: 'https://github.com/test/app', issueNumber: 12 });

      expect(sseCallback).toBeDefined();

      const incomingEvent: WorkflowEvent = {
        id: 'ev-100',
        runId: 'run-sse-test',
        eventType: 'log',
        message: 'Generating solution...',
        timestamp: '2026-01-01T00:01:00Z',
      };

      sseCallback(incomingEvent);
      expect(idb.saveRunEvents).toHaveBeenCalledWith('run-sse-test', [incomingEvent]);
    });
  });

  describe('refresh run error resilience', () => {
    it('preserves cached in-flight run without mutating to failed during transient network errors', async () => {
      const cachedInFlightRun: WorkflowRun = {
        id: 'run-inflight',
        status: 'running',
        repository: { owner: 'test', repo: 'app', fullName: 'test/app', defaultBranch: 'main' },
        issueNumber: 15,
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
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      vi.mocked(api.startWorkflowRun).mockResolvedValue({ id: 'run-inflight', status: 'running', createdAt: '' });
      vi.mocked(api.getWorkflowRun).mockResolvedValueOnce(cachedInFlightRun); // for start()

      const hook = renderHookHarness();
      await hook.start({ repoUrl: 'https://github.com/test/app', issueNumber: 15 });
      const updatedHook = renderHookHarness();

      // Now server fails transiently on refresh
      vi.mocked(api.getWorkflowRun).mockRejectedValue(new Error('Transient offline'));
      vi.mocked(idb.getRun).mockResolvedValue(cachedInFlightRun);

      const result = await updatedHook.refreshRun!();
      expect(result?.status).toBe('running');
      expect(result?.error).toBeNull();
      // Ensure it was NOT overwritten as failed
      expect(idb.saveRun).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
    });
  });

  describe('unmount lifecycle', () => {
    it('cleans up active SSE connection on unmount', async () => {
      const mockDisconnect = vi.fn();
      vi.mocked(sse.connectRunEvents).mockReturnValue(mockDisconnect);

      vi.mocked(idb.getAppState).mockResolvedValue('run-unmount');
      vi.mocked(idb.getRun).mockResolvedValue({
        id: 'run-unmount',
        status: 'running',
      } as any);

      renderHookHarness();
      await runPendingEffects();
      // Allow async restoreActiveRun microtasks to settle
      await new Promise((resolve) => setTimeout(resolve, 20));

      unmountHarness();
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});
