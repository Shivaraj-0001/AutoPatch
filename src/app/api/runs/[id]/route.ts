import { NextRequest, NextResponse } from 'next/server';
import * as orchestrator from '@/server/services/orchestrator';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const run = orchestrator.getRun(id);
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  const safeState = orchestrator.getSafeRunState(run);
  return NextResponse.json(safeState);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const success = orchestrator.deleteRun(id);
  return NextResponse.json({ success });
}
