'use client';

import React, { useState } from 'react';
import { RefreshCw, StopCircle, Plus, Sparkles, Code2, CheckCheck, FileText } from 'lucide-react';
import type { WorkflowRun, GitHubIssue, AgentName, PublicConfig } from '@/lib/types';
import { RepositoryIssueForm } from '@/components/workflow/RepositoryIssueForm';
import { IssueSummaryCard } from '@/components/workflow/IssueSummaryCard';
import { WorkflowTimeline } from '@/components/workflow/WorkflowTimeline';
import { DiffViewer } from '@/components/code/DiffViewer';
import { AcceptanceCriteriaChecklist } from '@/components/workflow/AcceptanceCriteriaChecklist';
import { ReviewFindingsList } from '@/components/review/ReviewFindingsList';
import { ImplementationPlanView } from '@/components/review/ImplementationPlanView';
import { FinalReport } from '@/components/review/FinalReport';
import { AgentDetailsModal } from '@/components/workflow/AgentDetailsModal';
import { Badge } from '@/components/common/Badge';
import { ErrorBanner } from '@/components/common/ErrorBanner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export interface WorkspacePageProps {
  run: WorkflowRun | null;
  isLoading: boolean;
  error: string | null;
  config?: PublicConfig | null;
  onStartRun: (params: {
    repoUrl: string;
    issueNumber: number;
    additionalInstructions?: string;
    targetBranch?: string;
  }) => void;
  onCancelRun: () => void;
  onRefineRun?: (options?: { instructions?: string; selectedSuggestions?: string[] }) => Promise<void>;
  onNewRun: () => void;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  run,
  isLoading,
  error,
  config: _config,
  onStartRun,
  onCancelRun,
  onRefineRun,
  onNewRun,
  className,
  id,
  style,
}) => {
  const [inspectedIssue, setInspectedIssue] = useState<{
    issue: GitHubIssue;
    repoUrl: string;
    issueNumber: number;
  } | null>(null);

  const [selectedAgentForModal, setSelectedAgentForModal] = useState<AgentName | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<'patch' | 'review' | 'plan'>('patch');

  const handleIssueLoaded = (data: { issue: GitHubIssue; repoUrl: string; issueNumber: number }) => {
    setInspectedIssue(data);
  };

  const getStatusBadge = (status: WorkflowRun['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="green">Workflow Completed</Badge>;
      case 'running':
        return (
          <Badge variant="cyan" icon={<RefreshCw size={12} className="animate-spin" />}>
            Autonomous Agents Working
          </Badge>
        );
      case 'failed':
        return <Badge variant="rose">Workflow Failed</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">Queued</Badge>;
    }
  };

  const hasResults = run && (run.codingProposal || run.reviewReport || run.implementationPlan);

  const modifiedFilesCount =
    run?.codingProposal?.filesModified?.length ||
    run?.codingProposal?.filesChanged?.length ||
    0;

  const reviewFindingsCount = run?.reviewReport?.findings?.length || 0;

  return (
    <div
      id={id}
      className={className}
      style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 20px', ...style }}
    >
      {(error || run?.error) && <ErrorBanner message={error || run!.error!} />}

      {!run ? (
        <>
          <RepositoryIssueForm
            onIssueLoaded={handleIssueLoaded}
            onStartRun={onStartRun}
            isLoading={isLoading}
          />

          {inspectedIssue && (
            <IssueSummaryCard
              issue={inspectedIssue.issue}
              repoFullName={inspectedIssue.repoUrl.replace('https://github.com/', '')}
            />
          )}

          {/* Clean minimal workflow pill strip */}
          {!inspectedIssue && (
            <div
              className="glass-panel"
              style={{
                padding: '20px 24px',
                textAlign: 'center',
                background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.03) 0%, rgba(17, 24, 39, 0.3) 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={16} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Autonomous Contribution Pipeline
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: '560px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
                Sequential agent workflow generating verified, production-ready git unified diff patches.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div
                  title="Issue Analyst Agent: Extracts requirements and acceptance criteria"
                  style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', fontSize: '0.75rem', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <span style={{ fontWeight: 700 }}>1</span> Analyst
                </div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>→</span>
                <div
                  title="Repository Scout Agent: Discovers target files and references"
                  style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.25)', fontSize: '0.75rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <span style={{ fontWeight: 700 }}>2</span> Scout
                </div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>→</span>
                <div
                  title="Implementation Planner Agent: Designs architectural strategy"
                  style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.25)', fontSize: '0.75rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <span style={{ fontWeight: 700 }}>3</span> Planner
                </div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>→</span>
                <div
                  title="Coding Agent: Generates minimal, verified patch changes"
                  style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <span style={{ fontWeight: 700 }}>4</span> Coder
                </div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>→</span>
                <div
                  title="Review Agent: Conducts adversarial code review and audits"
                  style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.25)', fontSize: '0.75rem', color: '#fb7185', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <span style={{ fontWeight: 700 }}>5</span> Reviewer
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Active run header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {getStatusBadge(run.status)}
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {`${run.repository.fullName} #${run.issueNumber}`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {run.status === 'running' && (
                <button
                  type="button"
                  onClick={onCancelRun}
                  className="btn btn-danger"
                  aria-label="Cancel active workflow run"
                  title="Cancel active autonomous run"
                  style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                >
                  <StopCircle size={14} />
                  <span>Cancel Run</span>
                </button>
              )}

              <button
                type="button"
                onClick={onNewRun}
                className="btn btn-secondary"
                aria-label="Start a new contribution workflow"
                title="Start another issue contribution workflow"
                style={{ fontSize: '0.8rem', padding: '5px 12px' }}
              >
                <Plus size={14} />
                <span>New Contribution</span>
              </button>
            </div>
          </div>

          {/* Issue summary card */}
          {run.issue && (
            <IssueSummaryCard
              issue={run.issue}
              repoFullName={run.repository.fullName}
              collapsible
              defaultOpen={run.status !== 'completed'}
            />
          )}

          {/* Workflow progress timeline */}
          <WorkflowTimeline run={run} onSelectAgent={(name) => setSelectedAgentForModal(name)} />

          {/* Segmented Result Tabs if artifacts are available */}
          {hasResults && (
            <div style={{ marginTop: '20px' }}>
              <div
                role="tablist"
                aria-label="Contribution run results"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '8px',
                  marginBottom: '16px',
                }}
              >
                <button
                  type="button"
                  role="tab"
                  id="tab-patch"
                  aria-selected={activeResultTab === 'patch'}
                  aria-controls="panel-patch"
                  aria-label="Generated Patch Results"
                  title="View generated unified diff patch and final report"
                  onClick={() => setActiveResultTab('patch')}
                  className={`btn ${activeResultTab === 'patch' ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{
                    fontSize: '0.825rem',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    borderBottom: activeResultTab === 'patch' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  }}
                >
                  <Code2 size={14} />
                  <span>Generated Patch</span>
                  {modifiedFilesCount > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.12)', padding: '1px 6px', borderRadius: '10px' }}>
                      {modifiedFilesCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  role="tab"
                  id="tab-review"
                  aria-selected={activeResultTab === 'review'}
                  aria-controls="panel-review"
                  aria-label="Review & Quality Audit"
                  title="View adversarial review findings and acceptance criteria checklist"
                  onClick={() => setActiveResultTab('review')}
                  className={`btn ${activeResultTab === 'review' ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{
                    fontSize: '0.825rem',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    borderBottom: activeResultTab === 'review' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  }}
                >
                  <CheckCheck size={14} />
                  <span>Review & Quality</span>
                  {reviewFindingsCount > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-rose)', background: 'rgba(244,63,94,0.12)', padding: '1px 6px', borderRadius: '10px' }}>
                      {reviewFindingsCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  role="tab"
                  id="tab-plan"
                  aria-selected={activeResultTab === 'plan'}
                  aria-controls="panel-plan"
                  aria-label="Architecture Plan View"
                  title="View architectural strategy and planned file modifications"
                  onClick={() => setActiveResultTab('plan')}
                  className={`btn ${activeResultTab === 'plan' ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{
                    fontSize: '0.825rem',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    borderBottom: activeResultTab === 'plan' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  }}
                >
                  <FileText size={14} />
                  <span>Architecture Plan</span>
                </button>
              </div>

              {/* Tab 1: Patch Diff & Summary */}
              {activeResultTab === 'patch' && (
                <div id="panel-patch" role="tabpanel" aria-labelledby="tab-patch" className="animate-fade-in">
                  {run.status === 'completed' && (
                    <ErrorBoundary fallbackTitle="Could not render Final Report">
                      <FinalReport run={run} onRefine={onRefineRun ? () => onRefineRun() : undefined} />
                    </ErrorBoundary>
                  )}

                  {run.codingProposal?.patch ? (
                    <ErrorBoundary fallbackTitle="Could not render Diff Viewer">
                      <DiffViewer
                        patch={run.codingProposal.patch}
                        filesModified={
                          run.codingProposal.filesModified ||
                          run.codingProposal.filesChanged?.map((f) => f.path) ||
                          []
                        }
                        runId={run.id}
                        repoName={run.repository.fullName}
                        issueNumber={run.issueNumber}
                        collapsible
                        defaultOpen={true}
                        revisionHistory={run.revisionHistory}
                        currentRevision={run.revisionCount}
                        changeSummary={run.codingProposal.changeSummary}
                      />
                    </ErrorBoundary>
                  ) : (
                    <div className="glass-panel" style={{ padding: '28px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Patch generation is in progress or pending...
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Review Findings & Acceptance Criteria */}
              {activeResultTab === 'review' && (
                <div id="panel-review" role="tabpanel" aria-labelledby="tab-review" className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {run.reviewReport ? (
                    <ErrorBoundary fallbackTitle="Could not render Review Findings">
                      <ReviewFindingsList
                        report={run.reviewReport}
                        runId={run.id}
                        revisionCount={run.revisionCount}
                        maxRevisions={run.maxRevisions}
                        isRunRunning={run.status === 'running'}
                        onRefine={onRefineRun}
                        collapsible
                        defaultOpen={true}
                        revisionHistory={run.revisionHistory}
                      />
                    </ErrorBoundary>
                  ) : (
                    <div className="glass-panel" style={{ padding: '28px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Review report will be available after coding is completed.
                    </div>
                  )}

                  {run.issueSpecification?.acceptanceCriteria && (
                    <ErrorBoundary fallbackTitle="Could not render Criteria Checklist">
                      <AcceptanceCriteriaChecklist
                        criteria={run.issueSpecification.acceptanceCriteria}
                        results={run.reviewReport?.acceptanceCriterionResults}
                        collapsible
                        defaultOpen={true}
                      />
                    </ErrorBoundary>
                  )}
                </div>
              )}

              {/* Tab 3: Implementation Plan */}
              {activeResultTab === 'plan' && (
                <div id="panel-plan" role="tabpanel" aria-labelledby="tab-plan" className="animate-fade-in">
                  {run.implementationPlan ? (
                    <ErrorBoundary fallbackTitle="Could not render Implementation Plan">
                      <ImplementationPlanView
                        plan={run.implementationPlan}
                        collapsible
                        defaultOpen={true}
                      />
                    </ErrorBoundary>
                  ) : (
                    <div className="glass-panel" style={{ padding: '28px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Implementation plan has not been generated yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Agent details modal */}
          <AgentDetailsModal
            run={run}
            agentName={selectedAgentForModal}
            onClose={() => setSelectedAgentForModal(null)}
          />
        </>
      )}
    </div>
  );
};
