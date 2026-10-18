import { config } from '../config';
import type { GitHubIssue, RepositoryInfo } from '../schemas/workflow';

const GITHUB_API = 'https://api.github.com';
const MAX_FILE_SIZE = 100_000; // 100KB per file
const MAX_TOTAL_CONTEXT = 2_000_000; // 2MB total (accommodates 60+ files)
const MAX_DIR_ENTRIES = 200;
const MAX_TREE_DEPTH = 5;

interface GitHubApiOptions {
  signal?: AbortSignal;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'AutoPatch/1.0',
  };
  if (config.github.token) {
    headers.Authorization = `Bearer ${config.github.token}`;
  }
  return headers;
}

async function githubFetch(path: string, options?: GitHubApiOptions): Promise<Response> {
  const url = `${GITHUB_API}${path}`;
  const response = await fetch(url, {
    headers: getHeaders(),
    signal: options?.signal,
  });

  if (response.status === 403) {
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    if (rateLimitRemaining === '0') {
      const resetTime = response.headers.get('x-ratelimit-reset');
      const resetDate = resetTime ? new Date(parseInt(resetTime, 10) * 1000) : null;
      throw new GitHubApiError(
        `GitHub API rate limit exceeded. ${resetDate ? `Resets at ${resetDate.toISOString()}` : 'Try again later.'}${!config.github.token ? ' Consider adding a GITHUB_TOKEN for higher limits.' : ''}`,
        403,
      );
    }
  }

  if (response.status === 404) {
    throw new GitHubApiError('Resource not found. Ensure the repository is public and the path is correct.', 404);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new GitHubApiError(
      `GitHub API error: ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 200)}` : ''}`,
      response.status,
    );
  }

  return response;
}

export class GitHubApiError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

// ─── File Content Cache ─────────────────────────────────────────────────────

const fileCache = new Map<string, { content: string; fetchedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): string | null {
  const entry = fileCache.get(key);
  if (entry && Date.now() - entry.fetchedAt < CACHE_TTL) {
    return entry.content;
  }
  fileCache.delete(key);
  return null;
}

function setCache(key: string, content: string): void {
  fileCache.set(key, { content, fetchedAt: Date.now() });
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getRepository(
  owner: string,
  repo: string,
  options?: GitHubApiOptions,
): Promise<RepositoryInfo> {
  const response = await githubFetch(`/repos/${owner}/${repo}`, options);
  const data = await response.json() as Record<string, unknown>;

  return {
    owner,
    repo,
    fullName: data.full_name as string,
    description: (data.description as string) || '',
    defaultBranch: (data.default_branch as string) || 'main',
    language: (data.language as string) || null,
    stars: (data.stargazers_count as number) || 0,
    htmlUrl: data.html_url as string,
  };
}

export async function getIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  options?: GitHubApiOptions,
): Promise<GitHubIssue> {
  const response = await githubFetch(`/repos/${owner}/${repo}/issues/${issueNumber}`, options);
  const data = await response.json() as Record<string, unknown>;

  // Check if it's actually a pull request
  if (data.pull_request) {
    throw new GitHubApiError(
      `#${issueNumber} is a pull request, not an issue. Please provide an issue number.`,
      422,
    );
  }

  const user = data.user as Record<string, unknown> | null;
  const labels = (data.labels as Array<Record<string, unknown>>) || [];

  return {
    number: data.number as number,
    title: data.title as string,
    body: (data.body as string) || '',
    state: data.state as string,
    labels: labels.map((l) => (l.name as string) || ''),
    author: (user?.login as string) || 'unknown',
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    htmlUrl: data.html_url as string,
    isPullRequest: false,
    comments: [],
  };
}

export async function getIssueComments(
  owner: string,
  repo: string,
  issueNumber: number,
  maxComments = 10,
  options?: GitHubApiOptions,
): Promise<Array<{ author: string; body: string; createdAt: string }>> {
  try {
    const response = await githubFetch(
      `/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=${maxComments}`,
      options,
    );
    const data = await response.json() as Array<Record<string, unknown>>;
    return data.map((c) => ({
      author: ((c.user as Record<string, unknown>)?.login as string) || 'unknown',
      body: (c.body as string) || '',
      createdAt: c.created_at as string,
    }));
  } catch {
    return [];
  }
}

export interface DirectoryEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
}

export async function getDirectoryContents(
  owner: string,
  repo: string,
  path = '',
  options?: GitHubApiOptions,
): Promise<DirectoryEntry[]> {
  const response = await githubFetch(
    `/repos/${owner}/${repo}/contents/${path}`,
    options,
  );
  const data = await response.json() as Array<Record<string, unknown>>;

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .slice(0, MAX_DIR_ENTRIES)
    .map((entry) => ({
      name: entry.name as string,
      path: entry.path as string,
      type: (entry.type === 'dir' ? 'dir' : 'file') as 'file' | 'dir',
      size: (entry.size as number) || 0,
    }));
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  options?: GitHubApiOptions,
): Promise<string | null> {
  const cacheKey = `${owner}/${repo}/${path}`;
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  try {
    const response = await githubFetch(
      `/repos/${owner}/${repo}/contents/${path}`,
      options,
    );
    const data = await response.json() as Record<string, unknown>;

    if (data.type !== 'file') return null;
    if ((data.size as number) > MAX_FILE_SIZE) return null;

    // Check encoding
    if (data.encoding === 'base64' && data.content) {
      const content = Buffer.from(data.content as string, 'base64').toString('utf-8');

      // Skip binary files
      if (content.includes('\0')) return null;

      setCache(cacheKey, content);
      return content;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Build a bounded file tree representation for the repository.
 */
export async function buildFileTree(
  owner: string,
  repo: string,
  maxDepth = MAX_TREE_DEPTH,
  options?: GitHubApiOptions,
  branch = 'HEAD',
): Promise<string> {
  const skipDirs = new Set([
    'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
    'vendor', '.cache', 'coverage', '.idea', '.vscode', 'target',
  ]);

  // Attempt 1: Fast single-request Git Trees API (recursive=1)
  try {
    const response = await githubFetch(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, options);
    const data = (await response.json()) as { tree?: Array<{ path: string; type: string }> };

    if (Array.isArray(data.tree) && data.tree.length > 0) {
      const paths = data.tree
        .filter((item) => {
          const parts = item.path.split('/');
          return !parts.some((p) => skipDirs.has(p));
        })
        .map((item) => (item.type === 'tree' ? `${item.path}/` : item.path))
        .filter((p) => p.split('/').length <= maxDepth + 1)
        .slice(0, 600);

      if (paths.length > 0) {
        return paths.join('\n');
      }
    }
  } catch {
    // Fall back to directory traversal if git tree fails
  }

  const lines: string[] = [];

  async function traverse(path: string, depth: number, prefix: string): Promise<void> {
    if (depth > maxDepth) {
      lines.push(`${prefix}...`);
      return;
    }

    try {
      const entries = await getDirectoryContents(owner, repo, path, options);
      const sorted = entries.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      for (const entry of sorted) {
        if (entry.type === 'dir' && skipDirs.has(entry.name)) {
          lines.push(`${prefix}${entry.name}/ (skipped)`);
          continue;
        }

        if (entry.type === 'dir') {
          lines.push(`${prefix}${entry.name}/`);
          await traverse(entry.path, depth + 1, prefix + '  ');
        } else {
          lines.push(`${prefix}${entry.name}`);
        }
      }
    } catch {
      lines.push(`${prefix}(unable to read)`);
    }
  }

  await traverse('', 0, '');
  return lines.join('\n');
}

/**
 * Fetch multiple files with total size limiting.
 */
export async function fetchMultipleFiles(
  owner: string,
  repo: string,
  paths: string[],
  options?: GitHubApiOptions,
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  let totalSize = 0;

  for (const path of paths) {
    if (totalSize >= MAX_TOTAL_CONTEXT) break;

    const content = await getFileContent(owner, repo, path, options);
    if (content !== null) {
      const size = Buffer.byteLength(content, 'utf-8');
      if (totalSize + size <= MAX_TOTAL_CONTEXT) {
        files[path] = content;
        totalSize += size;
      }
    }
  }

  return files;
}
