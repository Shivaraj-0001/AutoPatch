import { z } from 'zod';

// ─── Issue Analyst Output ────────────────────────────────────────────────────

export const AcceptanceCriterionSchema = z.object({
  id: z.string(),
  description: z.string(),
  inferred: z.boolean().default(false),
});

export const IssueAnalysisSchema = z.object({
  summary: z.string(),
  problemStatement: z.string(),
  expectedBehavior: z.string(),
  acceptanceCriteria: z.array(AcceptanceCriterionSchema),
  constraints: z.array(z.string()),
  ambiguities: z.array(z.string()),
  verificationRequirements: z.array(z.string()),
});

export type IssueAnalysis = z.infer<typeof IssueAnalysisSchema>;

// ─── Repository Scout Output ────────────────────────────────────────────────

export const RelevantFileSchema = z.object({
  path: z.string(),
  reason: z.string(),
  inspected: z.boolean().default(false),
  lineNumbers: z.array(z.number()).optional(),
  symbols: z.array(z.string()).optional(),
});

export const RepositoryContextSchema = z.object({
  repositoryOverview: z.string(),
  relevantFiles: z.array(RelevantFileSchema),
  symbolReferences: z.array(z.object({
    symbol: z.string(),
    file: z.string(),
    description: z.string(),
  })).default([]),
  dependencyNotes: z.array(z.string()).default([]),
  existingTests: z.array(z.object({
    path: z.string(),
    description: z.string(),
  })).default([]),
  missingContext: z.array(z.string()).default([]),
  suggestedInspections: z.array(z.string()).default([]),
});

export type RepositoryContext = z.infer<typeof RepositoryContextSchema>;

// ─── Implementation Planner Output ──────────────────────────────────────────

export const PlannedChangeSchema = z.object({
  file: z.string(),
  action: z.enum(['modify', 'create', 'delete']),
  description: z.string(),
  relatedCriteria: z.array(z.string()).default([]),
});

export const ImplementationPlanSchema = z.object({
  implementationStrategy: z.string(),
  plannedChanges: z.array(PlannedChangeSchema),
  testPlan: z.array(z.object({
    file: z.string(),
    description: z.string(),
    type: z.enum(['unit', 'integration', 'e2e']).default('unit'),
  })).default([]),
  risks: z.array(z.object({
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    mitigation: z.string(),
  })).default([]),
  assumptions: z.array(z.string()).default([]),
  acceptanceCriterionMapping: z.array(z.object({
    criterionId: z.string(),
    plannedChanges: z.array(z.string()),
  })).default([]),
});

export type ImplementationPlan = z.infer<typeof ImplementationPlanSchema>;

// ─── Coding Agent Output ────────────────────────────────────────────────────

export const FileChangeSchema = z.object({
  path: z.string(),
  action: z.enum(['modify', 'create', 'delete']),
  originalContent: z.string().optional(),
  newContent: z.string().optional(),
  diff: z.string().optional(),
});

export const CodingProposalSchema = z.object({
  changeSummary: z.string(),
  filesChanged: z.array(FileChangeSchema),
  patch: z.string(),
  testsAdded: z.array(z.object({
    path: z.string(),
    description: z.string(),
    content: z.string(),
  })).default([]),
  assumptions: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
});

export type CodingProposal = z.infer<typeof CodingProposalSchema>;

// ─── Review Agent Output ────────────────────────────────────────────────────

export const ReviewFindingSchema = z.object({
  severity: z.enum(['critical', 'major', 'minor', 'suggestion']),
  category: z.enum([
    'correctness', 'logic', 'edge-case', 'convention', 'security',
    'performance', 'testing', 'documentation', 'scope', 'other'
  ]),
  description: z.string(),
  filePath: z.string().optional(),
  lineRange: z.string().optional(),
  evidence: z.string().optional(),
  suggestedFix: z.string().optional(),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
});

export const AcceptanceCriterionResultSchema = z.object({
  criterionId: z.string(),
  status: z.enum([
    'satisfied',
    'partially-satisfied',
    'not-satisfied',
    'unable-to-verify',
  ]),
  explanation: z.string(),
});

export const ReviewReportSchema = z.object({
  overallAssessment: z.string(),
  findings: z.array(ReviewFindingSchema),
  acceptanceCriterionResults: z.array(AcceptanceCriterionResultSchema).default([]),
  testAssessment: z.string().default(''),
  requiredChanges: z.array(z.string()).default([]),
  optionalSuggestions: z.array(z.string()).default([]),
  revisionRequired: z.boolean(),
});

export type ReviewReport = z.infer<typeof ReviewReportSchema>;
export type ReviewFinding = z.infer<typeof ReviewFindingSchema>;

/**
 * Agent output schemas mapped by agent name.
 */
export const AGENT_OUTPUT_SCHEMAS = {
  'issue-analyst': IssueAnalysisSchema,
  'repository-scout': RepositoryContextSchema,
  'implementation-planner': ImplementationPlanSchema,
  'coding-agent': CodingProposalSchema,
  'review-agent': ReviewReportSchema,
} as const;

export type AgentOutputSchemaMap = {
  'issue-analyst': IssueAnalysis;
  'repository-scout': RepositoryContext;
  'implementation-planner': ImplementationPlan;
  'coding-agent': CodingProposal;
  'review-agent': ReviewReport;
};

/**
 * Validates untyped agent output data using the corresponding agent's Zod schema.
 */
export function validateAgentOutput<K extends keyof typeof AGENT_OUTPUT_SCHEMAS>(
  agentName: K,
  data: unknown
) {
  return AGENT_OUTPUT_SCHEMAS[agentName].safeParse(data);
}

