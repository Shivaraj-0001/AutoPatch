import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getRepository,
  getIssue,
  getIssueComments,
  getDirectoryContents,
  getFileContent,
  buildFileTree,
  fetchMultipleFiles,
  GitHubApiError,
} from './github';

describe('github service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('getRepository fetches and maps repository information', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        full_name: 'test-owner/test-repo',
        description: 'A test repository',
        default_branch: 'main',
        language: 'TypeScript',
        stargazers_count: 42,
        html_url: 'https://github.com/test-owner/test-repo',
      }),
    } as unknown as Response);

    const repo = await getRepository('test-owner', 'test-repo');
    expect(repo).toEqual({
      owner: 'test-owner',
      repo: 'test-repo',
      fullName: 'test-owner/test-repo',
      description: 'A test repository',
      defaultBranch: 'main',
      language: 'TypeScript',
      stars: 42,
      htmlUrl: 'https://github.com/test-owner/test-repo',
    });
  });

  it('getIssue returns parsed issue details', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        number: 10,
        title: 'Fix typo in README',
        body: 'Please fix typo on line 5',
        state: 'open',
        labels: [{ name: 'bug' }],
        user: { login: 'contributor1' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/issues/10',
      }),
    } as unknown as Response);

    const issue = await getIssue('test-owner', 'test-repo', 10);
    expect(issue.number).toBe(10);
    expect(issue.title).toBe('Fix typo in README');
    expect(issue.labels).toEqual(['bug']);
    expect(issue.author).toBe('contributor1');
    expect(issue.isPullRequest).toBe(false);
  });

  it('getIssue rejects pull requests with 422 error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        number: 11,
        title: 'PR submission',
        pull_request: { url: 'https://api.github.com/repos/o/r/pulls/11' },
      }),
    } as unknown as Response);

    await expect(getIssue('test-owner', 'test-repo', 11)).rejects.toThrow(
      '#11 is a pull request, not an issue. Please provide an issue number.',
    );
  });

  it('handles rate limiting (403 with x-ratelimit-remaining: 0)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '1800000000',
      }),
    } as unknown as Response);

    await expect(getRepository('test-owner', 'test-repo')).rejects.toThrowError(
      /GitHub API rate limit exceeded/,
    );
  });

  it('handles 404 not found error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
    } as unknown as Response);

    await expect(getRepository('test-owner', 'test-repo')).rejects.toThrowError(
      /Resource not found/,
    );
  });

  it('getIssueComments returns mapped comments or empty array on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          user: { login: 'reviewer' },
          body: 'Looks good to me',
          created_at: '2026-01-02T10:00:00Z',
        },
      ],
    } as unknown as Response);

    const comments = await getIssueComments('test-owner', 'test-repo', 10);
    expect(comments).toEqual([
      { author: 'reviewer', body: 'Looks good to me', createdAt: '2026-01-02T10:00:00Z' },
    ]);

    // On network failure
    global.fetch = vi.fn().mockRejectedValue(new Error('Network disconnected'));
    const failedComments = await getIssueComments('test-owner', 'test-repo', 10);
    expect(failedComments).toEqual([]);
  });

  it('getDirectoryContents maps entries and filters type', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { name: 'src', path: 'src', type: 'dir', size: 0 },
        { name: 'README.md', path: 'README.md', type: 'file', size: 1024 },
      ],
    } as unknown as Response);

    const contents = await getDirectoryContents('test-owner', 'test-repo', '');
    expect(contents).toEqual([
      { name: 'src', path: 'src', type: 'dir', size: 0 },
      { name: 'README.md', path: 'README.md', type: 'file', size: 1024 },
    ]);
  });

  it('getFileContent fetches, base64-decodes text files, and uses cache', async () => {
    const rawContent = 'console.log("hello world");';
    const base64Content = Buffer.from(rawContent).toString('base64');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'file',
        size: rawContent.length,
        encoding: 'base64',
        content: base64Content,
      }),
    } as unknown as Response);

    const content1 = await getFileContent('test-owner', 'test-repo', 'src/index.ts');
    expect(content1).toBe(rawContent);

    // Call again - should return cached value without calling fetch again
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const callCount = fetchMock.mock.calls.length;
    const content2 = await getFileContent('test-owner', 'test-repo', 'src/index.ts');
    expect(content2).toBe(rawContent);
    expect(fetchMock.mock.calls.length).toBe(callCount);
  });

  it('getFileContent rejects binary content with null bytes', async () => {
    const binaryContent = 'GIF89a\x00\x00test';
    const base64Binary = Buffer.from(binaryContent).toString('base64');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'file',
        size: binaryContent.length,
        encoding: 'base64',
        content: base64Binary,
      }),
    } as unknown as Response);

    const content = await getFileContent('test-owner', 'test-repo', 'assets/image.gif');
    expect(content).toBeNull();
  });

  it('buildFileTree uses git recursive trees API when available', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        tree: [
          { path: 'src', type: 'tree' },
          { path: 'src/index.ts', type: 'blob' },
          { path: 'node_modules/pkg/index.js', type: 'blob' },
          { path: 'README.md', type: 'blob' },
        ],
      }),
    } as unknown as Response);

    const tree = await buildFileTree('test-owner', 'test-repo');
    expect(tree).toContain('src/');
    expect(tree).toContain('src/index.ts');
    expect(tree).toContain('README.md');
    expect(tree).not.toContain('node_modules');
  });

  it('fetchMultipleFiles batches file fetching within context limits', async () => {
    const file1 = 'export const a = 1;';
    const file2 = 'export const b = 2;';

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('file1.ts')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            type: 'file',
            size: file1.length,
            encoding: 'base64',
            content: Buffer.from(file1).toString('base64'),
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          type: 'file',
          size: file2.length,
          encoding: 'base64',
          content: Buffer.from(file2).toString('base64'),
        }),
      };
    });

    const result = await fetchMultipleFiles('test-owner', 'test-repo', ['file1.ts', 'file2.ts']);
    expect(result['file1.ts']).toBe(file1);
    expect(result['file2.ts']).toBe(file2);
  });
});
