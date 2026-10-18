import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ApiError,
  fetchPublicConfig,
  fetchIssueDetails,
  fetchRepoMetadata,
  startWorkflowRun,
  getWorkflowRun,
  listWorkflowRuns,
  cancelWorkflowRun,
  refineWorkflowRun,
  getPatchDownloadUrl,
  deleteWorkflowRun,
  clearAllWorkflowRuns,
} from './api';

describe('Client API utilities (src/lib/api.ts)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('ApiError', () => {
    it('initializes with message, status, and details', () => {
      const err = new ApiError('Not found', 404, { field: 'id' });
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('ApiError');
      expect(err.message).toBe('Not found');
      expect(err.status).toBe(404);
      expect(err.details).toEqual({ field: 'id' });
    });

    it('initializes with optional status and details omitted', () => {
      const err = new ApiError('Generic error');
      expect(err.status).toBeUndefined();
      expect(err.details).toBeUndefined();
    });
  });

  describe('fetchPublicConfig', () => {
    it('fetches public config from /api/config', async () => {
      const mockConfig = {
        aiProvider: 'openai',
        aiConfigured: true,
        githubTokenConfigured: true,
        scoutMaxFiles: 100,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockConfig,
      } as Response);

      const result = await fetchPublicConfig();
      expect(global.fetch).toHaveBeenCalledWith('/api/config', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockConfig);
    });
  });

  describe('fetchIssueDetails', () => {
    it('posts request to /api/github/issue', async () => {
      const mockResponse = {
        issue: { number: 42, title: 'Bug report' },
        repository: { owner: 'owner', repo: 'repo' },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await fetchIssueDetails('https://github.com/owner/repo', 42);
      expect(global.fetch).toHaveBeenCalledWith('/api/github/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: 'https://github.com/owner/repo',
          issueNumber: 42,
        }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('fetchRepoMetadata', () => {
    it('encodes repository URL parameter in query string', async () => {
      const mockRepo = { repository: { fullName: 'owner/repo' } };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRepo,
      } as Response);

      const result = await fetchRepoMetadata('https://github.com/owner/repo?ref=main');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/github/repository?url=' + encodeURIComponent('https://github.com/owner/repo?ref=main'),
        { headers: { 'Content-Type': 'application/json' } },
      );
      expect(result).toEqual(mockRepo);
    });
  });

  describe('startWorkflowRun', () => {
    it('sends POST request to /api/runs with parameters', async () => {
      const mockRunRes = { id: 'run-123', status: 'queued', createdAt: '2026-01-01T00:00:00Z' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRunRes,
      } as Response);

      const params = {
        repoUrl: 'https://github.com/owner/repo',
        issueNumber: 15,
        additionalInstructions: 'Focus on tests',
        targetBranch: 'develop',
      };

      const result = await startWorkflowRun(params);
      expect(global.fetch).toHaveBeenCalledWith('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      expect(result).toEqual(mockRunRes);
    });
  });

  describe('getWorkflowRun & listWorkflowRuns', () => {
    it('getWorkflowRun fetches single run by ID', async () => {
      const mockRun = { id: 'run-99', status: 'completed' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRun,
      } as Response);

      const result = await getWorkflowRun('run-99');
      expect(global.fetch).toHaveBeenCalledWith('/api/runs/run-99', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockRun);
    });

    it('listWorkflowRuns fetches all runs list', async () => {
      const mockList = [{ id: 'run-1' }, { id: 'run-2' }];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockList,
      } as Response);

      const result = await listWorkflowRuns();
      expect(global.fetch).toHaveBeenCalledWith('/api/runs', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockList);
    });
  });

  describe('cancelWorkflowRun & refineWorkflowRun', () => {
    it('cancelWorkflowRun sends POST to cancel endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'cancelled' }),
      } as Response);

      const result = await cancelWorkflowRun('run-cancel-1');
      expect(global.fetch).toHaveBeenCalledWith('/api/runs/run-cancel-1/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual({ status: 'cancelled' });
    });

    it('refineWorkflowRun sends POST with options', async () => {
      const mockRefineRes = { id: 'run-refine-1', status: 'queued', revisionCount: 2 };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRefineRes,
      } as Response);

      const options = {
        instructions: 'Add null checks',
        selectedSuggestions: ['Fix edge case', 'Add unit test'],
      };

      const result = await refineWorkflowRun('run-refine-1', options);
      expect(global.fetch).toHaveBeenCalledWith('/api/runs/run-refine-1/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      expect(result).toEqual(mockRefineRes);
    });

    it('refineWorkflowRun defaults to empty object when options are omitted', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'run-1', status: 'queued', revisionCount: 1 }),
      } as Response);

      await refineWorkflowRun('run-1');
      expect(global.fetch).toHaveBeenCalledWith('/api/runs/run-1/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    });
  });

  describe('getPatchDownloadUrl', () => {
    it('returns base patch download URL without revision', () => {
      expect(getPatchDownloadUrl('run-xyz')).toBe('/api/runs/run-xyz/patch');
    });

    it('returns patch download URL with revision query param', () => {
      expect(getPatchDownloadUrl('run-xyz', 3)).toBe('/api/runs/run-xyz/patch?revision=3');
      expect(getPatchDownloadUrl('run-xyz', 0)).toBe('/api/runs/run-xyz/patch?revision=0');
    });
  });

  describe('deleteWorkflowRun & clearAllWorkflowRuns', () => {
    it('deleteWorkflowRun returns success on OK response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await deleteWorkflowRun('run-del-1');
      expect(global.fetch).toHaveBeenCalledWith('/api/runs/run-del-1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual({ success: true });
    });

    it('deleteWorkflowRun returns { success: false } on error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Database error' }),
      } as Response);

      const result = await deleteWorkflowRun('run-del-error');
      expect(result).toEqual({ success: false });
    });

    it('clearAllWorkflowRuns returns success on OK response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await clearAllWorkflowRuns();
      expect(global.fetch).toHaveBeenCalledWith('/api/runs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual({ success: true });
    });

    it('clearAllWorkflowRuns returns { success: false } on network rejection', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      const result = await clearAllWorkflowRuns();
      expect(result).toEqual({ success: false });
    });
  });

  describe('request error handling', () => {
    it('throws ApiError with server error message and details when available', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid URL', details: { repoUrl: ['Required'] } }),
      } as Response);

      await expect(fetchPublicConfig()).rejects.toThrow(ApiError);
      await expect(fetchPublicConfig()).rejects.toMatchObject({
        message: 'Invalid URL',
        status: 400,
        details: { repoUrl: ['Required'] },
      });
    });

    it('throws ApiError with HTTP error status when response is not JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('Not JSON');
        },
      } as unknown as Response);

      await expect(fetchPublicConfig()).rejects.toMatchObject({
        message: 'HTTP error 502',
        status: 502,
      });
    });
  });
});
