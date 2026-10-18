/**
 * Validate a generated patch for safety and correctness.
 */
export interface PatchValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fileCount: number;
  totalSize: number;
  modifiedFiles: string[];
}

export const MAX_PATCH_SIZE = 500_000; // 500KB
export const MAX_FILE_COUNT = 50;

/**
 * Extracts unique modified file paths from a unified diff patch.
 */
export function extractModifiedFiles(patch: string): string[] {
  const files = new Set<string>();
  const gitDiffRegex = /^diff --git a\/(.+?) b\/(.+?)$/gm;
  let match: RegExpExecArray | null;

  while ((match = gitDiffRegex.exec(patch)) !== null) {
    if (match[2]) {
      files.add(match[2]);
    }
  }

  if (files.size === 0) {
    const plusRegex = /^\+\+\+ (?:b\/)?(.+?)$/gm;
    while ((match = plusRegex.exec(patch)) !== null) {
      if (match[1] && match[1] !== '/dev/null') {
        files.add(match[1]);
      }
    }
  }

  return Array.from(files);
}

export function validatePatch(patch: string): PatchValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!patch || patch.trim().length === 0) {
    return {
      valid: false,
      errors: ['Patch is empty'],
      warnings: [],
      fileCount: 0,
      totalSize: 0,
      modifiedFiles: [],
    };
  }

  const totalSize = Buffer.byteLength(patch, 'utf-8');
  if (totalSize > MAX_PATCH_SIZE) {
    errors.push(`Patch exceeds maximum size of ${MAX_PATCH_SIZE} bytes (got ${totalSize})`);
  }

  const modifiedFiles = extractModifiedFiles(patch);

  // Parse diff headers for file counts
  const diffHeaders = patch.match(/^diff --git a\/.+ b\/.+$/gm) || [];
  const fileHeaders = patch.match(/^(\+\+\+|---) [ab]?\/.+$/gm) || [];
  let fileCount = diffHeaders.length || modifiedFiles.length || Math.ceil(fileHeaders.length / 2);

  if (fileCount === 0) {
    // Try alternate format
    const altHeaders = patch.match(/^(---|\+\+\+) .+$/gm) || [];
    fileCount = Math.ceil(altHeaders.length / 2);
  }

  if (fileCount > MAX_FILE_COUNT) {
    errors.push(`Patch modifies too many files (${fileCount}, max ${MAX_FILE_COUNT})`);
  }

  // Check for absolute paths (POSIX /path or Windows C:\path)
  const absolutePathPattern = /^[+-]{3}\s+(?:\/[^\/]|[a-zA-Z]:[/\\])/m;
  if (absolutePathPattern.test(patch)) {
    errors.push('Patch contains absolute paths');
  }

  // Check for path traversal sequences
  if (/(?:^|[/\\])\.\.[/\\]/.test(patch) || patch.includes('/../') || patch.includes('/..\\')) {
    errors.push('Patch contains path traversal sequences');
  }

  // Check for suspicious paths
  const suspiciousPaths = ['.env', '.git/', 'node_modules/', '.ssh/', '.aws/'];
  for (const sp of suspiciousPaths) {
    if (patch.includes(sp)) {
      warnings.push(`Patch references potentially sensitive path: ${sp}`);
    }
  }

  // Basic structure validation — should have at least one hunk
  if (!patch.includes('@@') && fileCount > 0) {
    warnings.push('Patch has file headers but no diff hunks');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fileCount: fileCount || 0,
    totalSize,
    modifiedFiles,
  };
}

/**
 * Generate a downloadable patch string from a coding proposal.
 */
export function formatPatchForDownload(patch: string, repoName: string, issueNumber: number): string {
  const header = [
    `# AutoPatch Generated Patch`,
    `# Repository: ${repoName}`,
    `# Issue: #${issueNumber}`,
    `# Generated: ${new Date().toISOString()}`,
    `# WARNING: This is an AI-generated patch. Review carefully before applying.`,
    ``,
  ].join('\n');

  return header + patch;
}
