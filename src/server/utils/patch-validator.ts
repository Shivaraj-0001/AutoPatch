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

function isAbsolutePath(filePath: string): boolean {
  return filePath.startsWith('/') || /^[a-zA-Z]:[/\\]/.test(filePath);
}

function hasPathTraversal(filePath: string): boolean {
  return (
    /(?:^|[/\\])\.\.(?:[/\\]|$)/.test(filePath) ||
    filePath.includes('/../') ||
    filePath.includes('\\..\\')
  );
}

function isSensitivePath(filePath: string): string | null {
  const sensitivePatterns = [
    { pattern: /(?:^|[/\\])\.env(?:\.|$)/, name: '.env' },
    { pattern: /(?:^|[/\\])\.git(?:[/\\]|$)/, name: '.git/' },
    { pattern: /(?:^|[/\\])node_modules(?:[/\\]|$)/, name: 'node_modules/' },
    { pattern: /(?:^|[/\\])\.ssh(?:[/\\]|$)/, name: '.ssh/' },
    { pattern: /(?:^|[/\\])\.aws(?:[/\\]|$)/, name: '.aws/' },
  ];

  for (const { pattern, name } of sensitivePatterns) {
    if (pattern.test(filePath)) {
      return name;
    }
  }
  return null;
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

  // Distinct file count derived from modified files (with fallback to diff headers)
  const diffHeaders = patch.match(/^diff --git a\/.+ b\/.+$/gm) || [];
  const fileCount = modifiedFiles.length || diffHeaders.length || 0;

  if (fileCount > MAX_FILE_COUNT) {
    errors.push(`Patch modifies too many files (${fileCount}, max ${MAX_FILE_COUNT})`);
  }

  // Check extracted file paths for traversal, absolute paths, and sensitive files
  for (const file of modifiedFiles) {
    if (isAbsolutePath(file)) {
      if (!errors.includes('Patch contains absolute paths')) {
        errors.push('Patch contains absolute paths');
      }
    }
    if (hasPathTraversal(file)) {
      if (!errors.includes('Patch contains path traversal sequences')) {
        errors.push('Patch contains path traversal sequences');
      }
    }
    const sensitive = isSensitivePath(file);
    if (sensitive) {
      const warnMsg = `Patch references potentially sensitive path: ${sensitive}`;
      if (!warnings.includes(warnMsg)) {
        warnings.push(warnMsg);
      }
    }
  }

  // Also check raw diff and file header lines for absolute paths and path traversals
  const headerLines = patch.match(/^(?:diff --git|---|\+\+\+)\s+.+$/gm) || [];
  for (const line of headerLines) {
    if (
      /^[+-]{3}\s+(?:\/[^\/]|[a-zA-Z]:[/\\])/.test(line) ||
      /^diff --git\s+(?:a\/)?(?:\/[^\/]|[a-zA-Z]:[/\\])/.test(line)
    ) {
      if (!errors.includes('Patch contains absolute paths')) {
        errors.push('Patch contains absolute paths');
      }
    }
    if (/(?:^|\s|[/\\])\.\.(?:[/\\]|\s|$)/.test(line)) {
      if (!errors.includes('Patch contains path traversal sequences')) {
        errors.push('Patch contains path traversal sequences');
      }
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
    fileCount,
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
