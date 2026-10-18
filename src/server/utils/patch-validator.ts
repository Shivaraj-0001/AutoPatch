/**
 * Validate a generated patch for safety and correctness.
 */
export interface PatchValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fileCount: number;
  totalSize: number;
}

const MAX_PATCH_SIZE = 500_000; // 500KB
const MAX_FILE_COUNT = 50;

export function validatePatch(patch: string): PatchValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let fileCount = 0;

  if (!patch || patch.trim().length === 0) {
    return { valid: false, errors: ['Patch is empty'], warnings: [], fileCount: 0, totalSize: 0 };
  }

  const totalSize = Buffer.byteLength(patch, 'utf-8');
  if (totalSize > MAX_PATCH_SIZE) {
    errors.push(`Patch exceeds maximum size of ${MAX_PATCH_SIZE} bytes (got ${totalSize})`);
  }

  // Parse diff headers
  const diffHeaders = patch.match(/^diff --git a\/.+ b\/.+$/gm) || [];
  const fileHeaders = patch.match(/^(\+\+\+|---) [ab]?\/.+$/gm) || [];
  fileCount = diffHeaders.length || Math.ceil(fileHeaders.length / 2);

  if (fileCount === 0) {
    // Try alternate format
    const altHeaders = patch.match(/^(---|\+\+\+) .+$/gm) || [];
    fileCount = Math.ceil(altHeaders.length / 2);
  }

  if (fileCount > MAX_FILE_COUNT) {
    errors.push(`Patch modifies too many files (${fileCount}, max ${MAX_FILE_COUNT})`);
  }

  // Check for absolute paths
  const absolutePathPattern = /^[+-]{3}\s+\/[^\/]/m;
  if (absolutePathPattern.test(patch)) {
    errors.push('Patch contains absolute paths');
  }

  // Check for path traversal
  if (patch.includes('/../') || patch.includes('/..\\')) {
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
