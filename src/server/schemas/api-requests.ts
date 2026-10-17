import { z } from 'zod';

// ─── API Request Schemas ────────────────────────────────────────────────────

export const FetchIssueRequestSchema = z.object({
  repoUrl: z
    .string()
    .min(1, 'Repository URL is required')
    .refine((url) => {
      try {
        const parsed = new URL(url);
        return parsed.hostname === 'github.com';
      } catch {
        return false;
      }
    }, 'Must be a valid GitHub URL'),
  issueNumber: z
    .number()
    .int()
    .positive('Issue number must be a positive integer'),
});

export type FetchIssueRequest = z.infer<typeof FetchIssueRequestSchema>;

export const StartRunRequestSchema = z.object({
  repoUrl: z
    .string()
    .min(1, 'Repository URL is required')
    .refine((url) => {
      try {
        const parsed = new URL(url);
        return parsed.hostname === 'github.com';
      } catch {
        return false;
      }
    }, 'Must be a valid GitHub URL'),
  issueNumber: z
    .number()
    .int()
    .positive('Issue number must be a positive integer'),
  additionalInstructions: z.string().max(2000).optional(),
  targetBranch: z.string().max(200).optional(),
});

export type StartRunRequest = z.infer<typeof StartRunRequestSchema>;

// ─── API Error Response ─────────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
