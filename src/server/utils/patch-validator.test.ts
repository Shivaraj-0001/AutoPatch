import { describe, it, expect } from 'vitest';
import {
  validatePatch,
  formatPatchForDownload,
  extractModifiedFiles,
} from './patch-validator';

describe('patch-validator', () => {
  const validDiff = `diff --git a/src/index.ts b/src/index.ts
index e69de29..49b61e0 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
 export function hello() {
+  console.log("world");
   return true;
 }`;

  it('validates a correct unified diff', () => {
    const result = validatePatch(validDiff);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.fileCount).toBe(1);
    expect(result.modifiedFiles).toEqual(['src/index.ts']);
  });

  it('fails on empty patch', () => {
    const result = validatePatch('');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Patch is empty');
  });

  it('detects path traversal attempts', () => {
    const malicious = `diff --git a/../../etc/passwd b/../../etc/passwd
--- a/../../etc/passwd
+++ b/../../etc/passwd
@@ -1,1 +1,1 @@
+root:x:0:0`;
    const result = validatePatch(malicious);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('path traversal'))).toBe(true);
  });

  it('detects absolute paths in headers', () => {
    const posixAbs = `--- /etc/passwd\n+++ /etc/passwd\n@@ -1 +1 @@\n+root`;
    expect(validatePatch(posixAbs).valid).toBe(false);
    expect(validatePatch(posixAbs).errors).toContain('Patch contains absolute paths');

    const winAbs = `--- C:\\Windows\\System32\\cmd.exe\n+++ C:\\Windows\\System32\\cmd.exe\n@@ -1 +1 @@\n+test`;
    expect(validatePatch(winAbs).valid).toBe(false);
    expect(validatePatch(winAbs).errors).toContain('Patch contains absolute paths');
  });

  it('warns about sensitive paths like .env', () => {
    const sensitive = `diff --git a/.env b/.env
--- a/.env
+++ b/.env
@@ -1,1 +1,1 @@
+SECRET_KEY=12345`;
    const result = validatePatch(sensitive);
    expect(result.warnings.some((w) => w.includes('.env'))).toBe(true);
  });

  it('extracts modified files accurately', () => {
    const multiDiff = `diff --git a/src/a.ts b/src/a.ts
--- a/src/a.ts
+++ b/src/a.ts
@@ -1 +1 @@
+a
diff --git a/src/b.ts b/src/b.ts
--- a/src/b.ts
+++ b/src/b.ts
@@ -1 +1 @@
+b`;
    const files = extractModifiedFiles(multiDiff);
    expect(files).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('does not false-positive on traversal sequences or .env inside patch body content', () => {
    const codeWithDots = `diff --git a/src/utils.ts b/src/utils.ts
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1,2 +1,4 @@
+// references ../components/button
+import { Button } from '../components/button';
+const envName = '.env';
 export const test = true;`;
    const result = validatePatch(codeWithDots);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('.env'))).toBe(false);
  });

  it('detects absolute paths in diff --git headers', () => {
    const diffWithAbs = `diff --git a/C:\\Windows\\system.ini b/C:\\Windows\\system.ini
--- a/system.ini
+++ b/system.ini
@@ -1 +1 @@
+bad`;
    const result = validatePatch(diffWithAbs);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Patch contains absolute paths');
  });

  it('counts distinct modified files when headers or hunks repeat', () => {
    const repeated = `diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1 +1 @@
+first hunk
diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -10 +10 @@
+second hunk`;
    const result = validatePatch(repeated);
    expect(result.fileCount).toBe(1);
    expect(result.modifiedFiles).toEqual(['src/index.ts']);
  });

  it('formats patch with header for download', () => {
    const formatted = formatPatchForDownload(validDiff, 'acme/tools', 42);
    expect(formatted).toContain('AutoPatch Generated Patch');
    expect(formatted).toContain('Repository: acme/tools');
    expect(formatted).toContain('Issue: #42');
    expect(formatted).toContain(validDiff);
  });
});


