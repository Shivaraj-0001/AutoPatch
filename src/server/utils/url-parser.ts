/**
 * Parse a GitHub URL into owner and repo components.
 * Supports formats:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo/issues/123
 *   https://github.com/owner/repo.git
 */
export function parseGitHubUrl(url: string): {
  owner: string;
  repo: string;
  issueNumber?: number;
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
    let repo = parts[1].replace(/\.git$/, '');

    // Validate owner and repo names
    if (!isValidGitHubName(owner) || !isValidGitHubName(repo)) {
      return null;
    }

    let issueNumber: number | undefined;
    if (parts.length >= 4 && (parts[2] === 'issues' || parts[2] === 'pull')) {
      const num = parseInt(parts[3], 10);
      if (!isNaN(num) && num > 0) {
        issueNumber = num;
      }
    }

    return { owner, repo, issueNumber };
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
  const match = trimmed.match(/^([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)(?:#(\d+))?$/);
  if (!match) return null;
  const [, owner, rawRepo, issueStr] = match;
  const repo = rawRepo.replace(/\.git$/, '');
  const issueNumber = issueStr ? parseInt(issueStr, 10) : undefined;
  return { owner, repo, issueNumber };
}

/**
 * Parse a GitHub issue URL or standalone issue number.
 */
export function parseIssueInput(input: string): number | null {
  // Direct number
  const num = parseInt(input, 10);
  if (!isNaN(num) && num > 0 && String(num) === input.trim()) {
    return num;
  }

  // URL with issue number or pull number
  try {
    const parsed = parseGitHubUrl(input);
    if (parsed?.issueNumber) {
      return parsed.issueNumber;
    }
  } catch {
    // not a URL
  }

  // Shorthand owner/repo#123 format
  const shorthand = parseShorthandRepo(input);
  if (shorthand?.issueNumber) {
    return shorthand.issueNumber;
  }

  // #123 format
  const hashMatch = input.trim().match(/^#(\d+)$/);
  if (hashMatch) {
    const n = parseInt(hashMatch[1], 10);
    if (n > 0) return n;
  }

  return null;
}

function isValidGitHubName(name: string): boolean {
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

