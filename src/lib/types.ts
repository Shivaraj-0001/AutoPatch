/**
 * Specialist agents participating in the autonomous contribution workflow.
 */
export type AgentName =
  | 'issue-analyst'
  | 'repository-scout'
  | 'implementation-planner'
  | 'coding-agent'
  | 'review-agent';

export const AGENT_NAMES: readonly AgentName[] = [
  'issue-analyst',
  'repository-scout',
  'implementation-planner',
  'coding-agent',
  'review-agent',
] as const;

/**
 * Type guard for AgentName strings.
 */
export function isAgentName(value: unknown): value is AgentName {
  return typeof value === 'string' && (AGENT_NAMES as readonly string[]).includes(value);
}

/**
 * Execution status of an overall workflow run.
 */
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export const RUN_STATUSES: readonly RunStatus[] = [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;

/**
 * Type guard for RunStatus strings.
 */
export function isRunStatus(value: unknown): value is RunStatus {
  return typeof value === 'string' && (RUN_STATUSES as readonly string[]).includes(value);
}

/**
 * Individual agent execution lifecycle status.
 */
export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface RunHistoryItem {
  id: string;
  repository: string;
  issueNumber: number;
  issueTitle: string | null;
  status: RunStatus;
  currentAgent: string | null;
  createdAt: string;
  updatedAt: string;
  revisionCount?: number;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  htmlUrl: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  labels: {
    name: string;
    color: string;
    description?: string;
  }[];
  createdAt: string;
  updatedAt?: string;
  comments?: {
    author: string;
    body: string;
    createdAt: string;
  }[];
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  inferred: boolean;
}

export interface IssueAnalysis {
  summary: string;
  problemStatement: string;
  expectedBehavior: string;
  acceptanceCriteria: AcceptanceCriterion[];
  constraints: string[];
  ambiguities: string[];
  verificationRequirements: string[];
}

export interface RelevantFile {
  path: string;
  reason: string;
  inspected: boolean;
  lineNumbers?: number[];
  symbols?: string[];
}

export interface RepositoryContext {
  repositoryOverview: string;
  relevantFiles: RelevantFile[];
  symbolReferences: {
    symbol: string;
    file: string;
    description: string;
  }[];
  dependencyNotes: string[];
  existingTests: {
    path: string;
    description: string;
  }[];
  missingContext: string[];
  suggestedInspections: string[];
}

export interface PlannedChange {
  file: string;
  action: 'modify' | 'create' | 'delete';
  description: string;
  relatedCriteria: string[];
}

export interface TestPlanItem {
  file: string;
  description: string;
  type?: 'unit' | 'integration' | 'e2e' | string;
}

export interface RiskItem {
  description: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface AcceptanceCriterionMapping {
  criterionId: string;
  plannedChanges: string[];
}

export interface ImplementationPlan {
  implementationStrategy: string;
  plannedChanges: PlannedChange[];
  testPlan: TestPlanItem[] | string;
  risks?: RiskItem[];
  risksAndMitigations?: {
    risk: string;
    mitigation: string;
  }[];
  assumptions?: string[];
  acceptanceCriterionMapping?: AcceptanceCriterionMapping[];
  rollbackConsiderations?: string[];
}

export interface FileChange {
  path: string;
  action: 'modify' | 'create' | 'delete';
  originalContent?: string;
  newContent?: string;
  diff?: string;
}

export interface CodingProposal {
  patch: string;
  changeSummary: string;
  filesChanged?: FileChange[];
  filesModified?: string[];
  testsAdded?: {
    path: string;
    description: string;
    content: string;
  }[];
  assumptions?: string[];
  limitations?: string[];
  testCode?: string;
  potentialEdgeCases?: string[];
  attemptNumber?: number;
}

export interface ReviewFinding {
  severity: 'critical' | 'major' | 'minor' | 'suggestion';
  category:
    | 'correctness'
    | 'logic'
    | 'edge-case'
    | 'convention'
    | 'security'
    | 'performance'
    | 'testing'
    | 'documentation'
    | 'scope'
    | 'other';
  file?: string;
  filePath?: string;
  lineRange?: { start: number; end: number } | string;
  description: string;
  evidence?: string;
  suggestedFix?: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface AcceptanceCriterionResult {
  criterionId: string;
  status: 'satisfied' | 'partially-satisfied' | 'not-satisfied' | 'unable-to-verify';
  explanation: string;
}

export interface ReviewReport {
  overallAssessment: string;
  findings: ReviewFinding[];
  acceptanceCriterionResults: AcceptanceCriterionResult[];
  testAssessment: string;
  requiredChanges: string[];
  optionalSuggestions: string[];
  revisionRequired: boolean;
}

export interface AgentExecution {
  id: string;
  runId: string;
  agentName: AgentName;
  status: AgentStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  duration?: number | null;
  durationMs?: number | null;
  inputArtifactReferences: string[];
  outputArtifact: unknown | null;
  error: string | null;
  model?: string | null;
  modelUsed?: string | null;
  provider?: string | null;
  providerUsed?: string | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
}

export interface RevisionRecord {
  attempt: number;
  revision: number;
  timestamp: string;
  codingProposal: CodingProposal;
  reviewReport?: ReviewReport;
  summary?: string;
  instructions?: string;
}

export interface WorkflowRun {
  id: string;
  status: RunStatus;
  repository: {
    owner: string;
    repo: string;
    fullName: string;
    defaultBranch: string;
    description?: string;
  };
  issueNumber: number;
  issue: GitHubIssue | null;
  additionalInstructions?: string;
  targetBranch?: string;
  currentAgent: AgentName | null;
  agentExecutions: AgentExecution[];
  issueSpecification: IssueAnalysis | null;
  repositoryContext: RepositoryContext | null;
  implementationPlan: ImplementationPlan | null;
  codingProposal: CodingProposal | null;
  reviewReport: ReviewReport | null;
  revisionCount: number;
  revisionHistory?: RevisionRecord[];
  maxRevisions?: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  fetchedFileCount?: number;
  fetchedFilePaths?: string[];
}

export interface WorkflowEvent {
  id: string;
  runId: string;
  timestamp: string;
  eventType: string;
  agentName?: AgentName;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface PublicConfig {
  aiProvider: string;
  aiModel: string | null;
  aiConfigured: boolean;
  githubTokenConfigured: boolean;
  maxRevisionAttempts: number;
  scoutMaxFiles?: number;
}

/**
 * Standard API response wrapper for client-server communication.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

