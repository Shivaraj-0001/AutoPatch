import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as orchestrator from './orchestrator';

describe('Workflow execution and run management', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates, retrieves, and cancels workflow runs', async () => {
    const run = await orchestrator.startRun({
      owner: 'expressjs',
      repo: 'express',
      issueNumber: 5920,
      additionalInstructions: 'Ensure RFC compatibility and edge cases',
    });

    expect(run.id).toBeDefined();
    expect(['created', 'running']).toContain(run.status);
    expect(run.issueNumber).toBe(5920);
    expect(run.repository.owner).toBe('expressjs');

    const retrieved = orchestrator.getRun(run.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(run.id);

    const allRuns = orchestrator.getAllRuns();
    expect(allRuns.some((r) => r.id === run.id)).toBe(true);

    const cancelled = orchestrator.cancelRun(run.id);
    expect(cancelled).toBe(true);
    const afterCancel = orchestrator.getRun(run.id);
    expect(afterCancel?.status).toBe('cancelled');

    // Cancelling an already cancelled run should return false
    expect(orchestrator.cancelRun(run.id)).toBe(false);
  });

  it('handles event subscription and unsubscription lifecycle', async () => {
    const run = await orchestrator.startRun({
      owner: 'facebook',
      repo: 'react',
      issueNumber: 12345,
    });

    const events: any[] = [];
    const unsubscribe = orchestrator.subscribeToEvents(run.id, (event) => {
      events.push(event);
    });

    expect(typeof unsubscribe).toBe('function');

    // Cancel to trigger an event
    orchestrator.cancelRun(run.id);

    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.eventType === 'run.cancelled')).toBe(true);

    // Unsubscribe and verify no more events received
    unsubscribe();
    const eventCountBefore = events.length;
    orchestrator.cancelRun(run.id);
    expect(events.length).toBe(eventCountBefore);
  });

  it('deletes workflow runs and clears in-memory store', async () => {
    const run = await orchestrator.startRun({
      owner: 'nodejs',
      repo: 'node',
      issueNumber: 456,
    });

    expect(orchestrator.getRun(run.id)).toBeDefined();

    const deleted = orchestrator.deleteRun(run.id);
    expect(deleted).toBe(true);
    expect(orchestrator.getRun(run.id)).toBeUndefined();

    // Deleting non-existent returns false
    expect(orchestrator.deleteRun('non-existent-id-xyz')).toBe(false);

    // Clear all runs
    orchestrator.clearAllRuns();
    expect(orchestrator.getAllRuns()).toEqual([]);
  });
});
