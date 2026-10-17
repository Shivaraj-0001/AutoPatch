import { describe, it, expect } from 'vitest';
import {
  IssueAnalysisSchema,
  RepositoryContextSchema,
  ImplementationPlanSchema,
  CodingProposalSchema,
  ReviewReportSchema,
} from './agent-outputs';

describe('agent-outputs schemas', () => {
  const sampleIssueAnalysis = {
    summary: 'Fix email validation bug for consecutive dots',
    problemStatement: 'The email validator incorrectly permits addresses with consecutive dots.',
    expectedBehavior: 'Addresses with consecutive dots should be rejected.',
    acceptanceCriteria: [
      { id: 'AC-1', description: 'Reject emails containing ".."', inferred: false },
    ],
    constraints: ['Maintain RFC 5322 compliance'],
    ambiguities: [],
    verificationRequirements: ['Add unit tests for consecutive dots'],
  };

  const sampleRepoContext = {
    repositoryOverview: 'TypeScript utility library for validation.',
    relevantFiles: [
      { path: 'src/email.ts', reason: 'Contains validateEmail logic', inspected: true },
    ],
    symbolReferences: [],
    dependencyNotes: [],
    existingTests: [],
    missingContext: [],
    suggestedInspections: [],
  };

  const sampleImplementationPlan = {
    implementationStrategy: 'Update regex check to disallow consecutive dots.',
    plannedChanges: [
      { file: 'src/email.ts', action: 'modify' as const, description: 'Add consecutive dot guard', relatedCriteria: ['AC-1'] },
    ],
    testPlan: [],
    risks: [],
    assumptions: [],
    acceptanceCriterionMapping: [],
  };

  const sampleCodingProposal = {
    changeSummary: 'Disallow consecutive dots in email validation regex',
    filesChanged: [
      { path: 'src/email.ts', action: 'modify' as const, diff: '@@ -1,3 +1,3 @@' },
    ],
    patch: 'diff --git a/src/email.ts b/src/email.ts\n--- a/src/email.ts\n+++ b/src/email.ts\n@@ -1,1 +1,1 @@\n',
    testsAdded: [],
    assumptions: [],
    limitations: [],
  };

  const sampleReviewReport = {
    overallAssessment: 'The patch correctly fixes the issue and passes validation.',
    findings: [
      {
        severity: 'minor' as const,
        category: 'testing' as const,
        description: 'Consider adding test cases with unicode domains',
        confidence: 'high' as const,
      },
    ],
    acceptanceCriterionResults: [
      { criterionId: 'AC-1', status: 'satisfied' as const, explanation: 'Properly checked' },
    ],
    testAssessment: 'Tests adequately cover the regression.',
    requiredChanges: [],
    optionalSuggestions: ['Add unicode test cases'],
    revisionRequired: false,
  };

  it('validates demo issue analysis fixture', () => {
    const parsed = IssueAnalysisSchema.safeParse(sampleIssueAnalysis);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.acceptanceCriteria.length).toBeGreaterThan(0);
      expect(parsed.data.summary).toBeDefined();
    }
  });

  it('validates demo repository context fixture', () => {
    const parsed = RepositoryContextSchema.safeParse(sampleRepoContext);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.relevantFiles.length).toBeGreaterThan(0);
    }
  });

  it('validates demo implementation plan fixture', () => {
    const parsed = ImplementationPlanSchema.safeParse(sampleImplementationPlan);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.plannedChanges.length).toBeGreaterThan(0);
    }
  });

  it('validates demo coding proposal fixture', () => {
    const parsed = CodingProposalSchema.safeParse(sampleCodingProposal);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.patch).toBeDefined();
    }
  });

  it('validates demo review report fixture', () => {
    const parsed = ReviewReportSchema.safeParse(sampleReviewReport);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.findings.length).toBeGreaterThan(0);
    }
  });

  it('rejects invalid issue analysis', () => {
    const invalid = {
      summary: '', // requires min 10
      problemStatement: 'too short',
    };
    const parsed = IssueAnalysisSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});
