import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as healthGet } from './health/route';
import { GET as configGet } from './config/route';
import { GET as runsGet, POST as runsPost, DELETE as runsDeleteAll } from './runs/route';
import { GET as runGet, DELETE as runDelete } from './runs/[id]/route';
import { POST as cancelPost } from './runs/[id]/cancel/route';
import { POST as refinePost } from './runs/[id]/refine/route';
import { GET as patchGet } from './runs/[id]/patch/route';
import { GET as eventsGet } from './runs/[id]/events/route';
import * as orchestrator from '@/server/services/orchestrator';

describe('Next.js API route handlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/health returns ok status and version', async () => {
    const res = await healthGet();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.version).toBe('1.0.0');
  });

  it('GET /api/config returns public config without secrets', async () => {
    const res = await configGet();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveProperty('aiProvider');
    expect(data).toHaveProperty('aiConfigured');
    expect(data).toHaveProperty('githubTokenConfigured');
    expect(data).toHaveProperty('scoutMaxFiles');
    expect(data.scoutMaxFiles).toBeGreaterThanOrEqual(60);
    expect(data).not.toHaveProperty('apiKey');
    expect(data).not.toHaveProperty('apiKeys');
  });

  describe('Runs API endpoints', () => {
    it('POST /api/runs validates invalid body', async () => {
      const req = new NextRequest('http://localhost:3000/api/runs', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const res = await runsPost(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('POST /api/runs validates invalid GitHub repoUrl', async () => {
      const req = new NextRequest('http://localhost:3000/api/runs', {
        method: 'POST',
        body: JSON.stringify({
          repoUrl: 'https://github.com',
          issueNumber: 42,
        }),
      });
      const res = await runsPost(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid GitHub repository URL');
    });

    it('GET /api/runs returns array of runs with Cache-Control headers', async () => {
      const res = await runsGet();
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(res.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate');
    });

    it('GET /api/runs/[id] returns safe state and Cache-Control headers for existing run', async () => {
      const mockRun = {
        id: 'mock-run-1',
        status: 'completed',
        repository: { owner: 'owner', repo: 'repo', fullName: 'owner/repo' },
        issueNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      vi.spyOn(orchestrator, 'getRun').mockReturnValue(mockRun as any);
      vi.spyOn(orchestrator, 'getSafeRunState').mockReturnValue({ ...mockRun, isSafe: true } as any);

      const req = new NextRequest('http://localhost:3000/api/runs/mock-run-1');
      const res = await runGet(req, { params: Promise.resolve({ id: 'mock-run-1' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe('mock-run-1');
      expect(res.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate');
    });

    it('POST /api/runs enforces rate limiting and sets Retry-After header', async () => {
      const ip = '192.168.1.100';
      const validPayload = {
        repoUrl: 'https://github.com/facebook/react',
        issueNumber: 123,
      };

      vi.spyOn(orchestrator, 'startRun').mockResolvedValue({
        id: 'rate-run-id',
        status: 'queued',
        createdAt: new Date().toISOString(),
      } as any);

      // Make 5 successful calls
      for (let i = 0; i < 5; i++) {
        const req = new NextRequest('http://localhost:3000/api/runs', {
          method: 'POST',
          headers: { 'x-forwarded-for': ip },
          body: JSON.stringify(validPayload),
        });
        const res = await runsPost(req);
        expect(res.status).toBe(201);
      }

      // 6th call should be rate limited
      const req = new NextRequest('http://localhost:3000/api/runs', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
        body: JSON.stringify(validPayload),
      });
      const res = await runsPost(req);
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBeDefined();
      const body = await res.json();
      expect(body.error).toContain('Too many requests');
    });

    it('POST /api/runs/[id]/cancel returns 200 when run is successfully cancelled', async () => {
      vi.spyOn(orchestrator, 'cancelRun').mockReturnValue(true);
      const req = new NextRequest('http://localhost:3000/api/runs/run-123/cancel', {
        method: 'POST',
      });
      const res = await cancelPost(req, { params: Promise.resolve({ id: 'run-123' }) });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.status).toBe('cancelled');
    });

    it('POST /api/runs/[id]/cancel returns 400 for non-existent run', async () => {
      const req = new NextRequest('http://localhost:3000/api/runs/non-existent-id/cancel', {
        method: 'POST',
      });
      const res = await cancelPost(req, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('Cannot cancel this run');
    });

    it('GET /api/runs/[id]/events returns 404 for non-existent run', async () => {
      const req = new NextRequest('http://localhost:3000/api/runs/non-existent-id/events');
      const res = await eventsGet(req, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await res.json();
      expect(res.status).toBe(404);
      expect(data).toHaveProperty('error');
    });

    it('POST /api/runs/[id]/refine validates invalid body schema', async () => {
      const mockRun = { id: 'run-to-refine', status: 'completed' };
      vi.spyOn(orchestrator, 'getRun').mockReturnValue(mockRun as any);

      const req = new NextRequest('http://localhost:3000/api/runs/run-to-refine/refine', {
        method: 'POST',
        body: JSON.stringify({ instructions: 'x'.repeat(2500) }), // exceeds max 2000
      });
      const res = await refinePost(req, { params: Promise.resolve({ id: 'run-to-refine' }) });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });

    it('POST /api/runs/[id]/refine rejects refinement if run is currently running', async () => {
      const mockRun = { id: 'run-running', status: 'running' };
      vi.spyOn(orchestrator, 'getRun').mockReturnValue(mockRun as any);

      const req = new NextRequest('http://localhost:3000/api/runs/run-running/refine', {
        method: 'POST',
        body: JSON.stringify({ instructions: 'Fix issue' }),
      });
      const res = await refinePost(req, { params: Promise.resolve({ id: 'run-running' }) });
      expect(res.status).toBe(409);
    });

    it('POST /api/runs/[id]/refine returns 404 for non-existent run', async () => {
      const req = new NextRequest('http://localhost:3000/api/runs/non-existent-id/refine', {
        method: 'POST',
        body: JSON.stringify({ instructions: 'Fix comment' }),
      });
      const res = await refinePost(req, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await res.json();
      expect(res.status).toBe(404);
      expect(data).toHaveProperty('error');
    });

    it('DELETE /api/runs/[id] handles deletion', async () => {
      const req = new NextRequest('http://localhost:3000/api/runs/test-id-123', {
        method: 'DELETE',
      });
      const res = await runDelete(req, { params: Promise.resolve({ id: 'test-id-123' }) });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toHaveProperty('success');
    });

    it('GET /api/runs/[id]/patch returns formatted patch and attachment headers', async () => {
      const mockRun = {
        id: 'patch-run-1',
        repository: { owner: 'owner', repo: 'my-repo', fullName: 'owner/my-repo' },
        issueNumber: 10,
        codingProposal: {
          patch: 'diff --git a/index.ts b/index.ts\n--- a/index.ts\n+++ b/index.ts\n@@ -1 +1 @@\n-1\n+2\n',
        },
      };
      vi.spyOn(orchestrator, 'getRun').mockReturnValue(mockRun as any);

      const req = new NextRequest('http://localhost:3000/api/runs/patch-run-1/patch');
      const res = await patchGet(req, { params: Promise.resolve({ id: 'patch-run-1' }) });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
      expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="my-repo-issue-10.patch"');
      expect(res.headers.get('Cache-Control')).toBe('private, no-cache');
      const text = await res.text();
      expect(text).toContain('AutoPatch Generated Patch');
    });

    it('GET /api/runs/[id]/patch returns 404 for non-existent run', async () => {
      const req = new NextRequest('http://localhost:3000/api/runs/non-existent-id/patch');
      const res = await patchGet(req, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await res.json();
      expect(res.status).toBe(404);
      expect(data).toHaveProperty('error');
    });

    it('DELETE /api/runs clears all runs', async () => {
      const res = await runsDeleteAll();
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toHaveProperty('success', true);
    });
  });
});
