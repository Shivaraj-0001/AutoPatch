import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AgentDetailsModal } from './AgentDetailsModal';
import type { WorkflowRun, IssueAnalysis } from '../../lib/types';

describe('AgentDetailsModal Component', () => {
  const sampleIssueAnalysis: IssueAnalysis = {
    summary: 'Buffer overflow in packet header parser',
    problemStatement: 'Large packet lengths exceed the fixed buffer capacity.',
    expectedBehavior: 'Packet lengths exceeding limit should be cleanly rejected with an error.',
    acceptanceCriteria: [
      { id: 'AC-1', description: 'Reject lengths > 1024 bytes', inferred: false },
      { id: 'AC-2', description: 'Log a warning on rejection', inferred: true },
    ],
    constraints: ['Must maintain binary protocol compatibility'],
    ambiguities: [],
    verificationRequirements: ['Unit test parsing 2048-byte invalid packet'],
  };

  const mockRun: WorkflowRun = {
    id: 'run-modal-1',
    repository: {
      owner: 'acme',
      repo: 'network',
      fullName: 'acme/network',
      defaultBranch: 'main',
    },
    issueNumber: 101,
    issue: null,
    status: 'completed',
    currentAgent: null,
    issueSpecification: sampleIssueAnalysis,
    repositoryContext: null,
    implementationPlan: null,
    codingProposal: null,
    reviewReport: null,
    revisionCount: 0,
    maxRevisions: 2,
    error: null,
    createdAt: '2026-10-18T10:00:00.000Z',
    updatedAt: '2026-10-18T10:05:00.000Z',
    agentExecutions: [
      {
        id: 'exec-analyst',
        runId: 'run-modal-1',
        agentName: 'issue-analyst',
        status: 'completed',
        inputArtifactReferences: [],
        durationMs: 2500,
        modelUsed: 'gemini-2.5-pro',
        usage: { promptTokens: 400, completionTokens: 150, totalTokens: 550 },
        error: null,
        outputArtifact: sampleIssueAnalysis,
      },
      {
        id: 'exec-scout',
        runId: 'run-modal-1',
        agentName: 'repository-scout',
        status: 'completed',
        inputArtifactReferences: ['exec-analyst'],
        durationMs: 3100,
        modelUsed: 'gemini-2.5-flash',
        usage: { promptTokens: 800, completionTokens: 200, totalTokens: 1000 },
        error: null,
        outputArtifact: {
          repositoryOverview: 'Core packet parsing library.',
          relevantFiles: [{ path: 'src/parser.ts', reason: 'Header parsing logic', inspected: true }],
          symbolReferences: [],
          dependencyNotes: [],
          existingTests: [{ path: 'src/parser.test.ts', description: 'Parser tests' }],
          missingContext: [],
          suggestedInspections: [],
        },
      },
    ],
  };

  it('renders nothing when agentName is null', () => {
    const html = renderToString(
      <AgentDetailsModal run={mockRun} agentName={null} onClose={vi.fn()} />
    );
    expect(html).toBe('');
  });

  it('renders modal dialog with accessible roles and header for Issue Analyst', () => {
    const html = renderToString(
      <AgentDetailsModal run={mockRun} agentName="issue-analyst" onClose={vi.fn()} />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="agent-details-modal-title"');
    expect(html).toContain('Issue Analyst Output');
    expect(html).toContain('Formal specification &amp; extracted acceptance criteria');
    expect(html).toContain('aria-label="Close modal"');
    expect(html).toContain('Structured');
    expect(html).toContain('Raw JSON');
    expect(html).toContain('Copy JSON');
  });

  it('renders structured content for Issue Analyst', () => {
    const html = renderToString(
      <AgentDetailsModal run={mockRun} agentName="issue-analyst" onClose={vi.fn()} />
    );

    expect(html).toContain('Buffer overflow in packet header parser');
    expect(html).toContain('Large packet lengths exceed the fixed buffer capacity.');
    expect(html).toContain('AC-1');
    expect(html).toContain('Reject lengths &gt; 1024 bytes');
    expect(html).toContain('AC-2');
    expect(html).toContain('Inferred');
  });

  it('renders metadata pill bar with duration, model, and tokens', () => {
    const html = renderToString(
      <AgentDetailsModal run={mockRun} agentName="issue-analyst" onClose={vi.fn()} />
    );

    expect(html).toContain('2.5s runtime');
    expect(html).toContain('gemini-2.5-pro');
    expect(html).toContain('550 tokens');
  });

  it('renders modal for Repository Scout with target files', () => {
    const html = renderToString(
      <AgentDetailsModal run={mockRun} agentName="repository-scout" onClose={vi.fn()} />
    );

    expect(html).toContain('Repository Scout Output');
    expect(html).toContain('src/parser.ts');
    expect(html).toContain('Header parsing logic');
    expect(html).toContain('3.1s runtime');
    expect(html).toContain('gemini-2.5-flash');
  });

  it('renders fallback when no artifact has been produced for the agent', () => {
    const html = renderToString(
      <AgentDetailsModal run={mockRun} agentName="coding-agent" onClose={vi.fn()} />
    );

    expect(html).toContain('Coding Agent Output');
    expect(html).toContain('No artifact generated yet for this agent execution.');
  });

  it('renders execution revision switcher when multiple executions exist for the agent', () => {
    const runWithMultiplePasses: WorkflowRun = {
      ...mockRun,
      agentExecutions: [
        ...mockRun.agentExecutions,
        {
          id: 'exec-analyst-2',
          runId: 'run-modal-1',
          agentName: 'issue-analyst',
          status: 'completed',
          inputArtifactReferences: [],
          durationMs: 1800,
          modelUsed: 'gemini-2.5-pro',
          usage: { promptTokens: 300, completionTokens: 100, totalTokens: 400 },
          error: null,
          outputArtifact: {
            ...sampleIssueAnalysis,
            summary: 'Refined issue specification',
          },
        },
      ],
    };

    const html = renderToString(
      <AgentDetailsModal run={runWithMultiplePasses} agentName="issue-analyst" onClose={vi.fn()} />
    );

    expect(html).toContain('Execution Pass:');
    expect(html).toContain('Revision 1');
    expect(html).toContain('(Initial)');
    expect(html).toContain('Revision 2');
    expect(html).toContain('(Feedback Loop)');
    expect(html).toContain('Latest');
  });

  it('applies custom className, id, and style props to modal backdrop', () => {
    const html = renderToString(
      <AgentDetailsModal
        run={mockRun}
        agentName="issue-analyst"
        onClose={vi.fn()}
        id="custom-modal-backdrop"
        className="my-modal-custom-class"
        style={{ zIndex: 999 }}
      />
    );

    expect(html).toContain('id="custom-modal-backdrop"');
    expect(html).toContain('agent-details-modal-backdrop my-modal-custom-class');
    expect(html).toContain('z-index:999');
  });
});
