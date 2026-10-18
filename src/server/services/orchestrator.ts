import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import type {
  WorkflowRun,
  AgentExecution,
  WorkflowEvent,
  AgentName,
  RunStatus,
} from '../schemas/workflow';
import { IssueAnalystAgent } from '../agents/issue-analyst';
import { RepositoryScoutAgent } from '../agents/repository-scout';
import { ImplementationPlannerAgent } from '../agents/implementation-planner';
import { CodingAgentImpl } from '../agents/coding-agent';
import { ReviewAgentImpl } from '../agents/review-agent';
import * as github from './github';
import { validatePatch } from '../utils/patch-validator';

// ─── Persistent Run Store ───────────────────────────────────────────────────

const DATA_DIR = path.resolve(process.cwd(), '.data');
const RUNS_FILE = path.join(DATA_DIR, 'runs.json');

const runs = new Map<string, WorkflowRun>();
const eventSubscribers = new Map<string, Set<(event: WorkflowEvent) => void>>();
const cancelledRuns = new Set<string>();

function loadRunsFromDisk(): void {
  try {
    if (fs.existsSync(RUNS_FILE)) {
      const data = fs.readFileSync(RUNS_FILE, 'utf-8');
      const loaded: WorkflowRun[] = JSON.parse(data);
      if (Array.isArray(loaded)) {
        for (const run of loaded) {
          if (run && run.id) {
            runs.set(run.id, run);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not load runs from disk cache:', err);
  }
}

let saveDebounceTimer: NodeJS.Timeout | null = null;
export function persistRunsToDisk(): void {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(RUNS_FILE, JSON.stringify(Array.from(runs.values()), null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to persist runs to disk:', err);
    }
  }, 300);
  if (saveDebounceTimer?.unref) {
    saveDebounceTimer.unref();
  }
}

// Initial disk load
loadRunsFromDisk();

export function getRun(id: string): WorkflowRun | undefined {
  return runs.get(id);
}

export function getAllRuns(): WorkflowRun[] {
  return Array.from(runs.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function deleteRun(id: string): boolean {
  const deleted = runs.delete(id);
  if (deleted) persistRunsToDisk();
  return deleted;
}

export function clearAllRuns(): void {
  runs.clear();
  persistRunsToDisk();
}

export function cancelRun(id: string): boolean {
  const run = runs.get(id);
  if (!run || run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
    return false;
  }
  cancelledRuns.add(id);
  run.status = 'cancelled';
  run.updatedAt = new Date().toISOString();
  persistRunsToDisk();
  emitEvent(id, 'run.cancelled', 'Workflow cancelled by user');
  return true;
}

export function subscribeToEvents(
  runId: string,
  callback: (event: WorkflowEvent) => void,
): () => void {
  if (!eventSubscribers.has(runId)) {
    eventSubscribers.set(runId, new Set());
  }
  eventSubscribers.get(runId)!.add(callback);

  // Return unsubscribe function
  return () => {
    eventSubscribers.get(runId)?.delete(callback);
  };
}

function emitEvent(
  runId: string,
  eventType: WorkflowEvent['eventType'],
  message: string,
  agentName?: AgentName,
  metadata?: Record<string, unknown>,
): WorkflowEvent {
  const event: WorkflowEvent = {
    id: uuidv4(),
    runId,
    timestamp: new Date().toISOString(),
    eventType,
    agentName,
    message,
    metadata,
  };

  const subscribers = eventSubscribers.get(runId);
  if (subscribers) {
    for (const cb of subscribers) {
      try { cb(event); } catch { /* ignore subscriber errors */ }
    }
  }

  persistRunsToDisk();
  return event;
}

function isCancelled(runId: string): boolean {
  return cancelledRuns.has(runId);
}

// ─── Agent Execution Helper ────────────────────────────────────────────────

function createAgentExecution(runId: string, agentName: AgentName): AgentExecution {
  return {
    id: uuidv4(),
    runId,
    agentName,
    status: 'pending',
    inputArtifactReferences: [],
    outputArtifact: null,
    error: null,
    startedAt: null,
    completedAt: null,
    model: null,
    provider: null,
    usage: null,
    retryCount: 0,
    duration: null,
  };
}

function selectRelevantSourceFiles(
  fetchedFiles: Record<string, string>,
  relevantFiles?: Array<{ path: string }>,
  maxTotalChars = 40000,
): Record<string, string> {
  const selected: Record<string, string> = {};
  let totalChars = 0;

  const excludePatterns = [
    /\.md$/i, /\.markdown$/i, /\.html$/i, /\.json$/i,
    /package-lock\.json$/i, /yarn\.lock$/i, /pnpm-lock\.yaml$/i,
    /license/i, /changelog/i,
  ];

  const priorityPaths = (relevantFiles || []).map((f) => f.path);
  const candidatePaths = [
    ...priorityPaths,
    ...Object.keys(fetchedFiles).filter((p) => !priorityPaths.includes(p)),
  ];

  for (const path of candidatePaths) {
    const content = fetchedFiles[path];
    if (!content) continue;

    if (excludePatterns.some((pat) => pat.test(path))) {
      continue;
    }

    if (totalChars + content.length <= maxTotalChars) {
      selected[path] = content;
      totalChars += content.length;
    } else {
      const remaining = maxTotalChars - totalChars;
      if (remaining > 1000) {
        selected[path] = content.slice(0, remaining) + '\n// ... [truncated for context limit]';
        totalChars = maxTotalChars;
      }
      break;
    }
  }

  if (Object.keys(selected).length === 0) {
    for (const [path, content] of Object.entries(fetchedFiles)) {
      if (totalChars + content.length <= maxTotalChars) {
        selected[path] = content;
        totalChars += content.length;
      }
    }
  }

  return selected;
}

// ─── Workflow Orchestration ─────────────────────────────────────────────────

export async function startRun(params: {
  owner: string;
  repo: string;
  issueNumber: number;
  additionalInstructions?: string;
  targetBranch?: string;
}): Promise<WorkflowRun> {
  const runId = uuidv4();
  const now = new Date().toISOString();

  const run: WorkflowRun = {
    id: runId,
    repository: {
      owner: params.owner,
      repo: params.repo,
      fullName: `${params.owner}/${params.repo}`,
      description: '',
      defaultBranch: 'main',
      language: null,
      stars: 0,
      htmlUrl: `https://github.com/${params.owner}/${params.repo}`,
    },
    issueNumber: params.issueNumber,
    issue: null,
    status: 'created',
    currentAgent: null,
    createdAt: now,
    updatedAt: now,
    additionalInstructions: params.additionalInstructions,
    targetBranch: params.targetBranch,
    issueSpecification: null,
    repositoryContext: null,
    implementationPlan: null,
    codingProposal: null,
    reviewReport: null,
    revisionCount: 0,
    maxRevisions: config.maxRevisionAttempts,
    revisionHistory: [],
    agentExecutions: [],
    error: null,
    fetchedFiles: {},
  };

  runs.set(runId, run);
  emitEvent(runId, 'run.created', 'Workflow run created');

  // Start execution asynchronously
  executeWorkflow(run).catch((err) => {
    console.error(`Workflow ${runId} failed:`, err);
    run.status = 'failed';
    run.error = (err as Error).message;
    run.updatedAt = new Date().toISOString();
    emitEvent(runId, 'run.failed', `Workflow failed: ${(err as Error).message}`);
  });

  return run;
}

async function executeWorkflow(run: WorkflowRun): Promise<void> {
  const { owner, repo } = run.repository;
  run.status = 'running';
  run.updatedAt = new Date().toISOString();

  try {
    // ─── Step 0: Fetch repo metadata + issue ────────────────────────
    emitEvent(run.id, 'agent.progress', 'Fetching repository metadata...', undefined);

    const repoInfo = await github.getRepository(owner, repo);
    run.repository = repoInfo;

    const fetchedIssue = await github.getIssue(owner, repo, run.issueNumber);
    const comments = await github.getIssueComments(owner, repo, run.issueNumber, 5);
    fetchedIssue.comments = comments;
    const issue = fetchedIssue;
    run.issue = issue;

    run.updatedAt = new Date().toISOString();

    emitEvent(run.id, 'agent.progress', `Issue #${run.issueNumber}: ${issue.title}`, undefined, {
      issue: { title: issue.title, state: issue.state },
    });

    if (isCancelled(run.id)) return;

    // ─── Step 1: Issue Analyst ──────────────────────────────────────
    const analystExec = createAgentExecution(run.id, 'issue-analyst');
    run.agentExecutions.push(analystExec);
    run.currentAgent = 'issue-analyst';

    analystExec.status = 'running';
    analystExec.startedAt = new Date().toISOString();
    analystExec.inputArtifactReferences = ['issue'];
    emitEvent(run.id, 'agent.started', 'Analyzing issue...', 'issue-analyst');

    const analyst = new IssueAnalystAgent();
    const analystResult = await analyst.execute({
      title: issue.title,
      body: issue.body,
      labels: issue.labels,
      comments: issue.comments,
      repoLanguage: repoInfo.language,
    });

    run.issueSpecification = analystResult.output;
    analystExec.outputArtifact = analystResult.output;
    analystExec.model = analystResult.model;
    analystExec.provider = analystResult.provider;
    analystExec.usage = analystResult.usage;
    analystExec.status = 'completed';
    analystExec.completedAt = new Date().toISOString();
    analystExec.duration = Date.now() - new Date(analystExec.startedAt).getTime();
    run.updatedAt = new Date().toISOString();

    emitEvent(run.id, 'agent.completed', 'Issue analysis complete', 'issue-analyst', {
      criteriaCount: analystResult.output.acceptanceCriteria.length,
    });
    emitEvent(run.id, 'artifact.created', 'Issue specification created', 'issue-analyst');

    if (isCancelled(run.id)) return;

    // ─── Step 2: Repository Scout ───────────────────────────────────
    const scoutExec = createAgentExecution(run.id, 'repository-scout');
    run.agentExecutions.push(scoutExec);
    run.currentAgent = 'repository-scout';

    scoutExec.status = 'running';
    scoutExec.startedAt = new Date().toISOString();
    scoutExec.inputArtifactReferences = ['issueSpecification'];
    emitEvent(run.id, 'agent.started', 'Scouting repository...', 'repository-scout');

    // Fetch file tree
    emitEvent(run.id, 'agent.progress', 'Fetching repository file tree...', 'repository-scout');
    const fileTree = await github.buildFileTree(owner, repo);

    // Fetch initial files (README, package.json, etc.)
    const initialFiles: string[] = [];
    const rootEntries = await github.getDirectoryContents(owner, repo);
    for (const entry of rootEntries) {
      const lowerName = entry.name.toLowerCase();
      if (
        lowerName === 'readme.md' ||
        lowerName === 'package.json' ||
        lowerName === 'cargo.toml' ||
        lowerName === 'pyproject.toml' ||
        lowerName === 'go.mod' ||
        lowerName === 'pom.xml' ||
        lowerName === 'requirements.txt'
      ) {
        initialFiles.push(entry.path);
      }
    }

    const inspectedFiles = await github.fetchMultipleFiles(owner, repo, initialFiles);
    Object.assign(run.fetchedFiles, inspectedFiles);

    const scout = new RepositoryScoutAgent();
    const scoutResult = await scout.execute({
      issueSpecification: run.issueSpecification,
      repoOverview: {
        fullName: repoInfo.fullName,
        description: repoInfo.description,
        language: repoInfo.language,
        defaultBranch: repoInfo.defaultBranch,
      },
      fileTree,
      inspectedFiles,
    });

    run.repositoryContext = scoutResult.output;
    scoutExec.outputArtifact = scoutResult.output;
    scoutExec.model = scoutResult.model;
    scoutExec.provider = scoutResult.provider;
    scoutExec.usage = scoutResult.usage;
    scoutExec.status = 'completed';
    scoutExec.completedAt = new Date().toISOString();
    scoutExec.duration = Date.now() - new Date(scoutExec.startedAt).getTime();
    run.updatedAt = new Date().toISOString();

    emitEvent(run.id, 'agent.completed', 'Repository scouting complete', 'repository-scout', {
      filesIdentified: scoutResult.output.relevantFiles.length,
    });
    emitEvent(run.id, 'artifact.created', 'Repository context created', 'repository-scout');

    if (isCancelled(run.id)) return;

    // ─── Fetch additional relevant files ────────────────────────────
    const maxScoutFiles = config.scoutMaxFiles || 60;
    const additionalPaths = scoutResult.output.relevantFiles
      .filter((f) => !inspectedFiles[f.path])
      .map((f) => f.path)
      .slice(0, maxScoutFiles);

    if (additionalPaths.length > 0) {
      emitEvent(run.id, 'agent.progress', `Fetching ${additionalPaths.length} additional files...`, 'repository-scout');
      const additionalFiles = await github.fetchMultipleFiles(owner, repo, additionalPaths);
      Object.assign(run.fetchedFiles, additionalFiles);
    }

    // Also fetch suggested inspections
    const suggestedPaths = scoutResult.output.suggestedInspections
      .filter((p) => !run.fetchedFiles[p])
      .slice(0, 15);
    if (suggestedPaths.length > 0) {
      const suggestedFiles = await github.fetchMultipleFiles(owner, repo, suggestedPaths);
      Object.assign(run.fetchedFiles, suggestedFiles);
    }

    // ─── Step 3: Implementation Planner ─────────────────────────────
    const plannerExec = createAgentExecution(run.id, 'implementation-planner');
    run.agentExecutions.push(plannerExec);
    run.currentAgent = 'implementation-planner';

    plannerExec.status = 'running';
    plannerExec.startedAt = new Date().toISOString();
    plannerExec.inputArtifactReferences = ['issueSpecification', 'repositoryContext'];
    emitEvent(run.id, 'agent.started', 'Planning implementation...', 'implementation-planner');

    const focusedSourceFiles = selectRelevantSourceFiles(
      run.fetchedFiles,
      scoutResult.output.relevantFiles,
      12000,
    );

    const planner = new ImplementationPlannerAgent();
    const plannerResult = await planner.execute({
      issueSpecification: run.issueSpecification,
      repositoryContext: run.repositoryContext,
      sourceFiles: focusedSourceFiles,
      repoLanguage: repoInfo.language,
    });

    run.implementationPlan = plannerResult.output;
    plannerExec.outputArtifact = plannerResult.output;
    plannerExec.model = plannerResult.model;
    plannerExec.provider = plannerResult.provider;
    plannerExec.usage = plannerResult.usage;
    plannerExec.status = 'completed';
    plannerExec.completedAt = new Date().toISOString();
    plannerExec.duration = Date.now() - new Date(plannerExec.startedAt).getTime();
    run.updatedAt = new Date().toISOString();

    emitEvent(run.id, 'agent.completed', 'Implementation plan created', 'implementation-planner', {
      changesPlanned: plannerResult.output.plannedChanges.length,
    });
    emitEvent(run.id, 'artifact.created', 'Implementation plan created', 'implementation-planner');

    if (isCancelled(run.id)) return;

    // ─── Step 4 & 5: Code + Review (with revision loop) ─────────────
    const maxRevisions = config.maxRevisionAttempts;
    run.maxRevisions = maxRevisions;
    let revisionAttempt = 0;

    while (revisionAttempt < maxRevisions) {
      if (isCancelled(run.id)) return;

      // ─── Coding Agent ─────────────────────────────────────────────
      const codingExec = createAgentExecution(run.id, 'coding-agent');
      run.agentExecutions.push(codingExec);
      run.currentAgent = 'coding-agent';

      codingExec.status = 'running';
      codingExec.startedAt = new Date().toISOString();
      codingExec.inputArtifactReferences = ['issueSpecification', 'implementationPlan', 'sourceFiles'];

      if (revisionAttempt > 0) {
        emitEvent(run.id, 'revision.started', `Starting revision attempt ${revisionAttempt + 1}/${maxRevisions}`, 'coding-agent');
      }
      emitEvent(run.id, 'agent.started', revisionAttempt > 0 ? 'Revising code...' : 'Generating code...', 'coding-agent');


      const codingSourceFiles = selectRelevantSourceFiles(
        run.fetchedFiles,
        [
          ...run.implementationPlan.plannedChanges.map((c) => ({ path: c.file })),
          ...scoutResult.output.relevantFiles,
        ],
        8500,
      );

      const coder = new CodingAgentImpl();
      const codingResult = await coder.execute({
        issueSpecification: run.issueSpecification,
        implementationPlan: run.implementationPlan,
        sourceFiles: codingSourceFiles,
        repoLanguage: repoInfo.language,
        previousPatch: revisionAttempt > 0 ? run.codingProposal?.patch : undefined,
        reviewFindings: revisionAttempt > 0 ? run.reviewReport ?? undefined : undefined,
      });

      run.codingProposal = codingResult.output;
      codingExec.outputArtifact = codingResult.output;
      codingExec.model = codingResult.model;
      codingExec.provider = codingResult.provider;
      codingExec.usage = codingResult.usage;
      codingExec.status = 'completed';
      codingExec.completedAt = new Date().toISOString();
      codingExec.duration = Date.now() - new Date(codingExec.startedAt).getTime();
      run.updatedAt = new Date().toISOString();

      // Validate the patch
      const validation = validatePatch(codingResult.output.patch);
      emitEvent(run.id, 'agent.completed', 'Code generation complete', 'coding-agent', {
        filesChanged: codingResult.output.filesChanged.length,
        patchValid: validation.valid,
        patchWarnings: validation.warnings,
      });
      emitEvent(run.id, 'artifact.created', 'Coding proposal created', 'coding-agent');

      if (isCancelled(run.id)) return;

      // On revision cycle == max revision, after coding agent is done, do not review again.
      // Do not mention about the skipped review in the ui.
      if (revisionAttempt > 0 && revisionAttempt + 1 >= maxRevisions) {
        run.revisionHistory.push({
          attempt: revisionAttempt,
          revision: revisionAttempt + 1,
          timestamp: new Date().toISOString(),
          codingProposal: run.codingProposal,
          summary: `Feedback loop refinement #${revisionAttempt}`,
        });
        run.revisionCount = revisionAttempt + 1;
        break;
      }

      // ─── Review Agent ─────────────────────────────────────────────
      const reviewExec = createAgentExecution(run.id, 'review-agent');
      run.agentExecutions.push(reviewExec);
      run.currentAgent = 'review-agent';

      reviewExec.status = 'running';
      reviewExec.startedAt = new Date().toISOString();
      reviewExec.inputArtifactReferences = ['issueSpecification', 'implementationPlan', 'codingProposal'];
      emitEvent(run.id, 'agent.started', 'Reviewing patch...', 'review-agent');


      const reviewer = new ReviewAgentImpl();
      const reviewResult = await reviewer.execute({
        issueSpecification: run.issueSpecification,
        implementationPlan: run.implementationPlan,
        codingProposal: run.codingProposal,
        sourceFiles: codingSourceFiles,
        revisionAttempt,
        maxRevisions,
      });

      run.reviewReport = reviewResult.output;
      reviewExec.outputArtifact = reviewResult.output;
      reviewExec.model = reviewResult.model;
      reviewExec.provider = reviewResult.provider;
      reviewExec.usage = reviewResult.usage;
      reviewExec.status = 'completed';
      reviewExec.completedAt = new Date().toISOString();
      reviewExec.duration = Date.now() - new Date(reviewExec.startedAt).getTime();
      run.updatedAt = new Date().toISOString();

      // Emit individual findings
      for (const finding of reviewResult.output.findings) {
        emitEvent(run.id, 'review.finding', finding.description, 'review-agent', {
          severity: finding.severity,
          category: finding.category,
          filePath: finding.filePath,
        });
      }

      emitEvent(run.id, 'agent.completed', 'Review complete', 'review-agent', {
        findingsCount: reviewResult.output.findings.length,
        revisionRequired: reviewResult.output.revisionRequired,
      });
      emitEvent(run.id, 'artifact.created', 'Review report created', 'review-agent');

      // Save revision history
      run.revisionHistory.push({
        attempt: revisionAttempt,
        revision: revisionAttempt + 1,
        timestamp: new Date().toISOString(),
        codingProposal: run.codingProposal,
        reviewReport: run.reviewReport,
        summary: revisionAttempt === 0 ? 'Initial implementation' : `Feedback loop refinement #${revisionAttempt}`,
      });
      run.revisionCount = revisionAttempt + 1;

      // Check if revision is needed
      const hasCriticalOrMajor = reviewResult.output.revisionRequired;
      const hasActionableSuggestions =
        (reviewResult.output.optionalSuggestions && reviewResult.output.optionalSuggestions.length > 0) ||
        reviewResult.output.findings.some(
          (f) =>
            (f.severity === 'minor' || f.severity === 'suggestion') &&
            (Boolean(f.suggestedFix) || f.category === 'convention'),
        );

      // Auto-refine if critical/major OR if there are actionable suggestions and we haven't refined yet
      const shouldRevise = hasCriticalOrMajor || (hasActionableSuggestions && revisionAttempt === 0);

      if (!shouldRevise || revisionAttempt >= maxRevisions - 1) {
        break;
      }

      if (!hasCriticalOrMajor && hasActionableSuggestions) {
        emitEvent(
          run.id,
          'revision.started',
          `Auto-refining patch to address ${reviewResult.output.optionalSuggestions.length + reviewResult.output.findings.length} reviewer suggestions and code quality improvements`,
          'coding-agent',
          { isRefinement: true },
        );
      }

      revisionAttempt++;
    }

    // ─── Complete ───────────────────────────────────────────────────
    run.status = 'completed';
    run.currentAgent = null;
    run.updatedAt = new Date().toISOString();
    emitEvent(run.id, 'run.completed', 'Workflow completed successfully', undefined, {
      totalRevisions: run.revisionCount,
    });

  } catch (error) {
    // Mark current agent as failed
    const currentExec = run.agentExecutions.find(
      (e) => e.status === 'running',
    );
    if (currentExec) {
      currentExec.status = 'failed';
      currentExec.error = (error as Error).message;
      currentExec.completedAt = new Date().toISOString();
      if (currentExec.startedAt) {
        currentExec.duration = Date.now() - new Date(currentExec.startedAt).getTime();
      }
      emitEvent(run.id, 'agent.failed', `${currentExec.agentName} failed: ${(error as Error).message}`, currentExec.agentName);
    }

    run.status = 'failed';
    run.error = (error as Error).message;
    run.currentAgent = null;
    run.updatedAt = new Date().toISOString();
    emitEvent(run.id, 'run.failed', `Workflow failed: ${(error as Error).message}`);
  }
}

/**
 * Triggers an interactive refinement pass on a completed run using review feedback and optional user instructions.
 */
export async function refineRun(
  runId: string,
  options?: { instructions?: string; selectedSuggestions?: string[] },
): Promise<WorkflowRun> {
  const run = runs.get(runId);
  if (!run) {
    throw new Error('Run not found');
  }

  if (run.status === 'running') {
    throw new Error('Run is currently in progress');
  }

  if (!run.codingProposal || !run.reviewReport || !run.issueSpecification || !run.implementationPlan) {
    throw new Error('Run does not have existing proposal and review to refine');
  }

  run.status = 'running';
  run.updatedAt = new Date().toISOString();
  emitEvent(
    runId,
    'revision.started',
    options?.instructions
      ? `Starting interactive patch refinement: ${options.instructions}`
      : 'Starting interactive patch refinement with review feedback',
    'coding-agent',
    { options },
  );

  // Execute refinement asynchronously
  executeRefinementPass(run, options).catch((err) => {
    console.error(`Refinement failed for run ${runId}:`, err);
    run.status = 'failed';
    run.error = (err as Error).message;
    run.updatedAt = new Date().toISOString();
    emitEvent(runId, 'run.failed', `Refinement failed: ${(err as Error).message}`);
  });

  return run;
}

async function executeRefinementPass(
  run: WorkflowRun,
  options?: { instructions?: string; selectedSuggestions?: string[] },
): Promise<void> {
  const { owner, repo } = run.repository;
  const repoInfo = await github.getRepository(owner, repo);

  const codingExec = createAgentExecution(run.id, 'coding-agent');
  run.agentExecutions.push(codingExec);
  run.currentAgent = 'coding-agent';

  codingExec.status = 'running';
  codingExec.startedAt = new Date().toISOString();
  codingExec.inputArtifactReferences = ['issueSpecification', 'implementationPlan', 'sourceFiles'];
  emitEvent(run.id, 'agent.started', 'Refining code with review feedback...', 'coding-agent');

  const codingSourceFiles = selectRelevantSourceFiles(
    run.fetchedFiles,
    [
      ...run.implementationPlan!.plannedChanges.map((c) => ({ path: c.file })),
      ...(run.repositoryContext?.relevantFiles || []),
    ],
    8500,
  );

  const coder = new CodingAgentImpl();
  const codingResult = await coder.execute({
    issueSpecification: run.issueSpecification!,
    implementationPlan: run.implementationPlan!,
    sourceFiles: codingSourceFiles,
    repoLanguage: repoInfo.language,
    previousPatch: run.codingProposal?.patch,
    reviewFindings: run.reviewReport || undefined,
    userInstructions: options?.instructions,
    isRefinement: true,
  });

  run.codingProposal = codingResult.output;
  codingExec.outputArtifact = codingResult.output;
  codingExec.model = codingResult.model;
  codingExec.provider = codingResult.provider;
  codingExec.usage = codingResult.usage;
  codingExec.status = 'completed';
  codingExec.completedAt = new Date().toISOString();
  codingExec.duration = Date.now() - new Date(codingExec.startedAt).getTime();
  run.updatedAt = new Date().toISOString();

  const validation = validatePatch(codingResult.output.patch);
  emitEvent(run.id, 'agent.completed', 'Refined code generation complete', 'coding-agent', {
    filesChanged: codingResult.output.filesChanged.length,
    patchValid: validation.valid,
    patchWarnings: validation.warnings,
  });
  emitEvent(run.id, 'artifact.created', 'Refined coding proposal created', 'coding-agent');

  if (isCancelled(run.id)) return;

  // Review Agent re-audits the refined patch
  const reviewExec = createAgentExecution(run.id, 'review-agent');
  run.agentExecutions.push(reviewExec);
  run.currentAgent = 'review-agent';

  reviewExec.status = 'running';
  reviewExec.startedAt = new Date().toISOString();
  reviewExec.inputArtifactReferences = ['issueSpecification', 'implementationPlan', 'codingProposal'];
  emitEvent(run.id, 'agent.started', 'Reviewing refined patch...', 'review-agent');

  const reviewer = new ReviewAgentImpl();
  const reviewResult = await reviewer.execute({
    issueSpecification: run.issueSpecification!,
    implementationPlan: run.implementationPlan!,
    codingProposal: run.codingProposal,
    sourceFiles: codingSourceFiles,
    revisionAttempt: run.revisionCount,
    maxRevisions: run.revisionCount + 1,
  });

  run.reviewReport = reviewResult.output;
  reviewExec.outputArtifact = reviewResult.output;
  reviewExec.model = reviewResult.model;
  reviewExec.provider = reviewResult.provider;
  reviewExec.usage = reviewResult.usage;
  reviewExec.status = 'completed';
  reviewExec.completedAt = new Date().toISOString();
  reviewExec.duration = Date.now() - new Date(reviewExec.startedAt).getTime();
  run.updatedAt = new Date().toISOString();

  for (const finding of reviewResult.output.findings) {
    emitEvent(run.id, 'review.finding', finding.description, 'review-agent', {
      severity: finding.severity,
      category: finding.category,
      filePath: finding.filePath,
    });
  }

  emitEvent(run.id, 'agent.completed', 'Review of refined patch complete', 'review-agent', {
    findingsCount: reviewResult.output.findings.length,
    revisionRequired: reviewResult.output.revisionRequired,
  });
  emitEvent(run.id, 'artifact.created', 'Review report updated', 'review-agent');

  const newRevisionNum = run.revisionCount + 1;
  run.revisionHistory.push({
    attempt: run.revisionCount,
    revision: newRevisionNum,
    timestamp: new Date().toISOString(),
    codingProposal: run.codingProposal,
    reviewReport: run.reviewReport,
    instructions: options?.instructions,
    summary: options?.instructions
      ? `User instruction refinement: ${options.instructions}`
      : `Review feedback refinement (Revision ${newRevisionNum})`,
  });
  run.revisionCount = newRevisionNum;

  run.status = 'completed';
  run.currentAgent = null;
  run.updatedAt = new Date().toISOString();
  emitEvent(run.id, 'run.completed', 'Refinement completed successfully', undefined, {
    totalRevisions: run.revisionCount,
  });
}

// Helper to strip sensitive data from run state for API responses & SSE
export function getSafeRunState(run: WorkflowRun | undefined) {
  if (!run) return null;
  const { fetchedFiles, ...safe } = run;
  return {
    ...safe,
    fetchedFileCount: Object.keys(fetchedFiles || {}).length,
    fetchedFilePaths: Object.keys(fetchedFiles || {}),
  };
}

