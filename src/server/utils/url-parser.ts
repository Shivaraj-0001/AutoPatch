/**
 * Parse a GitHub URL into owner, repo, and optional issue number or branch components.
 * Supports formats:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo/issues/123
 *   https://github.com/owner/repo/pull/123
 *   https://github.com/owner/repo/tree/branch-name
 */
export function parseGitHubUrl(url: string): {
  owner: string;
  repo: string;
  issueNumber?: number;
  branch?: string;
} | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'github.com') {
      return null;
    }

    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) {
      return null;
    }

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, '');

    // Validate owner and repo names
    if (!isValidGitHubName(owner) || !isValidGitHubName(repo)) {
      return null;
    }

    // Standard repository URL: /owner/repo or /owner/repo/
    if (parts.length === 2) {
      return { owner, repo };
    }

    // Issues and PR URLs: /owner/repo/issues/123 or /owner/repo/pull/123
    if (parts.length === 4 && (parts[2] === 'issues' || parts[2] === 'pull')) {
      if (!/^\+?0*[1-9]\d*$/.test(parts[3])) {
        return null;
      }
      const num = parseInt(parts[3], 10);
      if (!isNaN(num) && num > 0) {
        return { owner, repo, issueNumber: num };
      }
      return null;
    }

    // Tree / branch URLs: /owner/repo/tree/main or /owner/repo/tree/feature/test
    if (parts.length >= 4 && parts[2] === 'tree') {
      const branch = parts.slice(3).join('/');
      return { owner, repo, branch };
    }

    // Reject non-repository subpaths (e.g. /settings, /actions, incomplete /issues)
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse shorthand repository reference (e.g. "owner/repo" or "owner/repo#123").
 */
export function parseShorthandRepo(input: string): {
  owner: string;
  repo: string;
  issueNumber?: number;
} | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)(?:#\+?0*([1-9]\d*))?$/);
  if (!match) return null;
  const [, owner, rawRepo, issueStr] = match;
  const repo = rawRepo.replace(/\.git$/, '');
  const issueNumber = issueStr ? parseInt(issueStr, 10) : undefined;
  return { owner, repo, issueNumber };
}

/**
 * Parse a GitHub issue URL or standalone issue number.
 * Supports positive integers with optional '+' or leading zeros (e.g. "42", "+42", "007", "#007").
 */
export function parseIssueInput(input: string): number | null {
  const trimmed = input.trim();

  // Direct number: positive integer with optional '+' or leading zeros
  if (/^\+?0*[1-9]\d*$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num > 0) {
      return num;
    }
  }

  // URL with issue number or pull number
  try {
    const parsed = parseGitHubUrl(trimmed);
    if (parsed?.issueNumber) {
      return parsed.issueNumber;
    }
  } catch {
    // not a URL
  }

  // Shorthand owner/repo#123 format
  const shorthand = parseShorthandRepo(trimmed);
  if (shorthand?.issueNumber) {
    return shorthand.issueNumber;
  }

  // #123 format with optional '+' or leading zeros
  const hashMatch = trimmed.match(/^#\+?0*([1-9]\d*)$/);
  if (hashMatch) {
    const n = parseInt(hashMatch[1], 10);
    if (n > 0) return n;
  }

  return null;
}


export function isValidGitHubName(name: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(name) && name.length <= 100;
}

/**
 * Build a normalized repository URL from owner and repo.
 */
export function buildRepoUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}`;
}

/**
 * Format a canonical issue reference string (e.g. "owner/repo#123").
 */
export function formatIssueIdentifier(
  owner: string,
  repo: string,
  issueNumber: number,
): string {
  return `${owner}/${repo}#${issueNumber}`;
}

