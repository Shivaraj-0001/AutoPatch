import type { WorkflowRun, WorkflowEvent, RunHistoryItem } from './types';

const DB_NAME = 'autopatch_db';
const DB_VERSION = 1;

const STORES = {
  RUNS: 'runs',
  EVENTS: 'events',
  APP_STATE: 'app_state',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Check if IndexedDB is supported in the current environment
 */
export function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
}

/**
 * Reset the cached IndexedDB database instance promise (useful for testing or connection recovery)
 */
export function resetDBInstance(): void {
  dbPromise = null;
}

/**
 * Open and initialize the IndexedDB instance
 */
export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Store for full WorkflowRun objects
      if (!db.objectStoreNames.contains(STORES.RUNS)) {
        const runsStore = db.createObjectStore(STORES.RUNS, { keyPath: 'id' });
        runsStore.createIndex('createdAt', 'createdAt', { unique: false });
        runsStore.createIndex('status', 'status', { unique: false });
        runsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // 2. Store for WorkflowEvent lists keyed by runId
      if (!db.objectStoreNames.contains(STORES.EVENTS)) {
        db.createObjectStore(STORES.EVENTS, { keyPath: 'runId' });
      }

      // 3. Store for key-value application state (e.g., activeRunId, activeTab)
      if (!db.objectStoreNames.contains(STORES.APP_STATE)) {
        db.createObjectStore(STORES.APP_STATE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };

      resolve(db);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };

    request.onblocked = () => {
      console.warn('IndexedDB database upgrade blocked. Please close other tabs.');
    };
  });

  return dbPromise;
}

// ─── Runs Store ─────────────────────────────────────────────────────────────

/**
 * Save or update a full workflow run in IndexedDB
 */
export async function saveRun(run: WorkflowRun): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RUNS, 'readwrite');
      const store = tx.objectStore(STORES.RUNS);
      const request = store.put(run);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to save run to IndexedDB:', err);
  }
}

/**
 * Get a single workflow run by ID from IndexedDB
 */
export async function getRun(id: string): Promise<WorkflowRun | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RUNS, 'readonly');
      const store = tx.objectStore(STORES.RUNS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Failed to get run ${id} from IndexedDB:`, err);
    return null;
  }
}

/**
 * Get all workflow runs from IndexedDB, sorted by createdAt descending
 */
export async function getAllRuns(): Promise<WorkflowRun[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RUNS, 'readonly');
      const store = tx.objectStore(STORES.RUNS);
      const request = store.getAll();

      request.onsuccess = () => {
        const runs = (request.result || []) as WorkflowRun[];
        runs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(runs);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get all runs from IndexedDB:', err);
    return [];
  }
}

/**
 * Delete a workflow run and its events from IndexedDB
 */
export async function deleteRun(id: string): Promise<void> {
  try {
    const db = await getDB();
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORES.RUNS, 'readwrite');
        const store = tx.objectStore(STORES.RUNS);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      deleteRunEvents(id),
    ]);

    // Check if the deleted run was the active run
    const activeRunId = await getAppState<string>('lastSelectedRunId');
    if (activeRunId === id) {
      await removeAppState('lastSelectedRunId');
    }
  } catch (err) {
    console.error(`Failed to delete run ${id} from IndexedDB:`, err);
  }
}

/**
 * Clear all runs, events, and active run state from IndexedDB
 */
export async function clearAllRuns(): Promise<void> {
  try {
    const db = await getDB();
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORES.RUNS, 'readwrite');
        const store = tx.objectStore(STORES.RUNS);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORES.EVENTS, 'readwrite');
        const store = tx.objectStore(STORES.EVENTS);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
      removeAppState('lastSelectedRunId'),
    ]);
  } catch (err) {
    console.error('Failed to clear runs from IndexedDB:', err);
  }
}

// ─── Events Store ───────────────────────────────────────────────────────────

/**
 * Save workflow events for a run
 */
export async function saveRunEvents(runId: string, events: WorkflowEvent[]): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.EVENTS, 'readwrite');
      const store = tx.objectStore(STORES.EVENTS);
      const request = store.put({
        runId,
        events,
        updatedAt: new Date().toISOString(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Failed to save events for run ${runId}:`, err);
  }
}

/**
 * Get workflow events for a run
 */
export async function getRunEvents(runId: string): Promise<WorkflowEvent[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.EVENTS, 'readonly');
      const store = tx.objectStore(STORES.EVENTS);
      const request = store.get(runId);

      request.onsuccess = () => {
        resolve(request.result?.events || []);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Failed to get events for run ${runId}:`, err);
    return [];
  }
}

/**
 * Delete events for a run
 */
export async function deleteRunEvents(runId: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.EVENTS, 'readwrite');
      const store = tx.objectStore(STORES.EVENTS);
      const request = store.delete(runId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Failed to delete events for run ${runId}:`, err);
  }
}

// ─── App State Store ────────────────────────────────────────────────────────

/**
 * Get an application state value
 */
export async function getAppState<T>(key: string, defaultValue?: T): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.APP_STATE, 'readonly');
      const store = tx.objectStore(STORES.APP_STATE);
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result && request.result.value !== undefined) {
          resolve(request.result.value as T);
        } else {
          resolve(defaultValue ?? null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Failed to get app state for ${key}:`, err);
    return defaultValue ?? null;
  }
}

/**
 * Set an application state value
 */
export async function setAppState<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.APP_STATE, 'readwrite');
      const store = tx.objectStore(STORES.APP_STATE);
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Failed to set app state for ${key}:`, err);
  }
}

/**
 * Remove an application state value
 */
export async function removeAppState(key: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.APP_STATE, 'readwrite');
      const store = tx.objectStore(STORES.APP_STATE);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Failed to remove app state for ${key}:`, err);
  }
}

// ─── Utility Helpers ────────────────────────────────────────────────────────

/**
 * Convert a full WorkflowRun into a lightweight RunHistoryItem
 */
export function runToHistoryItem(run: WorkflowRun): RunHistoryItem {
  const repoName = typeof run.repository === 'string'
    ? run.repository
    : run.repository?.fullName || `${run.repository?.owner || ''}/${run.repository?.repo || ''}`;

  return {
    id: run.id,
    repository: repoName,
    issueNumber: run.issueNumber,
    issueTitle: run.issue?.title || null,
    status: run.status,
    currentAgent: run.currentAgent,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    revisionCount: run.revisionCount,
  };
}

/**
 * Format a patch string with standard metadata header for download
 */
export function formatPatchContent(
  patch: string,
  repoName: string,
  issueNumber: number,
  revisionNumber?: number,
): string {
  const header = [
    `# AutoPatch Generated Patch`,
    `# Repository: ${repoName}`,
    `# Issue: #${issueNumber}${revisionNumber ? ` (Revision ${revisionNumber})` : ''}`,
    `# Generated: ${new Date().toISOString()}`,
    `# WARNING: This is an AI-generated patch. Review carefully before applying.`,
    ``,
  ].join('\n');

  return header + patch;
}

/**
 * Trigger direct client-side download of a patch file using a Blob
 */
export function downloadPatchBlob(
  patch: string,
  repoName: string,
  issueNumber: number,
  revisionNumber?: number,
): void {
  const content = formatPatchContent(patch, repoName, issueNumber, revisionNumber);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanRepo = repoName.split('/').pop() || 'contribution';
  const revSuffix = revisionNumber ? `-rev${revisionNumber}` : '';
  a.download = `${cleanRepo}-issue-${issueNumber}${revSuffix}.patch`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
