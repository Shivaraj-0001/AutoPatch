import { z } from 'zod';
import type {
  IssueAnalysis,
  RepositoryContext,
  ImplementationPlan,
  CodingProposal,
  ReviewReport,
} from './agent-outputs';

// ─── Workflow State Types ───────────────────────────────────────────────────

export type AgentName =
  | 'issue-analyst'
  | 'repository-scout'
  | 'implementation-planner'
  | 'coding-agent'
  | 'review-agent';

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type RunStatus =
  | 'created'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentExecution {
  id: string;
  runId: string;
  agentName: AgentName;
  status: AgentStatus;
  inputArtifactReferences: string[];
  outputArtifact: unknown | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  model: string | null;
  provider: string | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
  retryCount: number;
  duration: number | null;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: string;
  labels: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  isPullRequest: boolean;
  comments: Array<{
    author: string;
    body: string;
    createdAt: string;
  }>;
}

export interface RepositoryInfo {
  owner: string;
  repo: string;
  fullName: string;
  description: string;
  defaultBranch: string;
  language: string | null;
  stars: number;
  htmlUrl: string;
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
  repository: RepositoryInfo;
  issueNumber: number;
  issue: GitHubIssue | null;
  status: RunStatus;
  currentAgent: AgentName | null;
  createdAt: string;
  updatedAt: string;
  additionalInstructions?: string;
  targetBranch?: string;

  // Agent outputs
  issueSpecification: IssueAnalysis | null;
  repositoryContext: RepositoryContext | null;
  implementationPlan: ImplementationPlan | null;
  codingProposal: CodingProposal | null;
  reviewReport: ReviewReport | null;

  // Revision tracking
  revisionCount: number;
  revisionHistory: RevisionRecord[];
  maxRevisions?: number;

  // Agent executions
  agentExecutions: AgentExecution[];

  // Error
  error: string | null;

  // Source files fetched from GitHub
  fetchedFiles: Record<string, string>;
}

// ─── Workflow Events ────────────────────────────────────────────────────────

export type WorkflowEventType =
  | 'run.created'
  | 'agent.started'
  | 'agent.progress'
  | 'agent.completed'
  | 'agent.failed'
  | 'artifact.created'
  | 'review.finding'
  | 'revision.started'
  | 'run.completed'
  | 'run.failed'
  | 'run.cancelled';

export interface WorkflowEvent {
  id: string;
  runId: string;
  timestamp: string;
  eventType: WorkflowEventType;
  agentName?: AgentName;
  message: string;
  metadata?: Record<string, unknown>;
}
