import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as issuePost, dynamic as issueDynamic } from './issue/route';
import { GET as repoGet, dynamic as repoDynamic } from './repository/route';
import * as githubService from '@/server/services/github';

describe('GitHub API Routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/github/issue', () => {
    it('is configured as dynamic route', () => {
      expect(issueDynamic).toBe('force-dynamic');
    });

    it('returns 400 when body is invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/github/issue', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const res = await issuePost(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid request');
      expect(data).toHaveProperty('details');
    });

    it('returns 400 when repoUrl is a github URL without owner and repository', async () => {
      const req = new NextRequest('http://localhost:3000/api/github/issue', {
        method: 'POST',
        body: JSON.stringify({
          repoUrl: 'https://github.com',
          issueNumber: 42,
        }),
      });
      const res = await issuePost(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid GitHub repository URL');
    });

    it('fetches issue and comments successfully', async () => {
      const mockIssue = {
        number: 42,
        title: 'Fix issue',
        body: 'Details',
        state: 'open',
        htmlUrl: 'https://github.com/facebook/react/issues/42',
        author: 'dan',
        labels: ['bug'],
        createdAt: new Date().toISOString(),
        comments: [] as any[],
      };
      const mockComments = [
        {
          id: 1,
          author: 'sophie',
          body: 'Working on this',
          createdAt: new Date().toISOString(),
        },
      ];

      vi.spyOn(githubService, 'getIssue').mockResolvedValue(mockIssue as any);
      vi.spyOn(githubService, 'getIssueComments').mockResolvedValue(mockComments as any);

      const req = new NextRequest('http://localhost:3000/api/github/issue', {
        method: 'POST',
        body: JSON.stringify({
          repoUrl: 'https://github.com/facebook/react',
          issueNumber: 42,
        }),
      });
      const res = await issuePost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.issue.number).toBe(42);
      expect(data.issue.comments).toHaveLength(1);
      expect(data.repository).toEqual({
        owner: 'facebook',
        repo: 'react',
      });
    });

    it('handles GitHubApiError properly', async () => {
      vi.spyOn(githubService, 'getIssue').mockRejectedValue(
        new githubService.GitHubApiError('Issue not found', 404),
      );

      const req = new NextRequest('http://localhost:3000/api/github/issue', {
        method: 'POST',
        body: JSON.stringify({
          repoUrl: 'https://github.com/facebook/react',
          issueNumber: 999999,
        }),
      });
      const res = await issuePost(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe('GITHUB_ERROR');
      expect(data.error).toBe('Issue not found');
    });

    it('maps 500+ GitHub errors to 502 Bad Gateway', async () => {
      vi.spyOn(githubService, 'getIssue').mockRejectedValue(
        new githubService.GitHubApiError('GitHub is down', 503),
      );

      const req = new NextRequest('http://localhost:3000/api/github/issue', {
        method: 'POST',
        body: JSON.stringify({
          repoUrl: 'https://github.com/facebook/react',
          issueNumber: 42,
        }),
      });
      const res = await issuePost(req);
      const data = await res.json();

      expect(res.status).toBe(502);
      expect(data.code).toBe('GITHUB_ERROR');
    });
  });

  describe('GET /api/github/repository', () => {
    it('is configured as dynamic route', () => {
      expect(repoDynamic).toBe('force-dynamic');
    });

    it('returns 400 when url query parameter is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/github/repository');
      const res = await repoGet(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('url query parameter is required');
    });

    it('returns 400 when url query parameter is not a valid GitHub URL', async () => {
      const req = new NextRequest('http://localhost:3000/api/github/repository?url=invalid-url');
      const res = await repoGet(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid GitHub repository URL');
    });

    it('fetches repository details successfully', async () => {
      const mockRepo = {
        owner: 'facebook',
        repo: 'react',
        fullName: 'facebook/react',
        defaultBranch: 'main',
        description: 'React library',
        language: 'JavaScript',
        stars: 200000,
        forks: 40000,
        openIssues: 500,
      };

      vi.spyOn(githubService, 'getRepository').mockResolvedValue(mockRepo as any);

      const req = new NextRequest('http://localhost:3000/api/github/repository?url=https://github.com/facebook/react');
      const res = await repoGet(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.fullName).toBe('facebook/react');
      expect(data.stars).toBe(200000);
    });

    it('handles GitHubApiError properly for repository endpoint', async () => {
      vi.spyOn(githubService, 'getRepository').mockRejectedValue(
        new githubService.GitHubApiError('Repository not found', 404),
      );

      const req = new NextRequest('http://localhost:3000/api/github/repository?url=https://github.com/facebook/nonexistent');
      const res = await repoGet(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe('GITHUB_ERROR');
      expect(data.error).toBe('Repository not found');
    });
  });
});
