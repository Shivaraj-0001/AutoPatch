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

    it('GET /api/runs returns array of runs', async () => {
      const res = await runsGet();
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('GET /api/runs/[id] returns 404 for non-existent run', async () => {
      const req = new NextRequest('http://localhost:3000/api/runs/non-existent-id');
      const res = await runGet(req, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await res.json();
      expect(res.status).toBe(404);
      expect(data).toHaveProperty('error');
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
