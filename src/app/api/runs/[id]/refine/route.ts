import { NextRequest, NextResponse } from 'next/server';
import * as orchestrator from '@/server/services/orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const run = orchestrator.getRun(id);
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    if (run.status === 'running') {
      return NextResponse.json({ error: 'Run is currently running' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const { instructions, selectedSuggestions } = body || {};

    const updatedRun = await orchestrator.refineRun(id, {
      instructions,
      selectedSuggestions,
    });

    return NextResponse.json({
      id: updatedRun.id,
      status: updatedRun.status,
      revisionCount: updatedRun.revisionCount,
    });
  } catch (error) {
    console.error('Refinement error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to refine run' },
      { status: 500 },
    );
  }
}
