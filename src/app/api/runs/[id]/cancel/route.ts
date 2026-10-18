import { NextRequest, NextResponse } from 'next/server';
import * as orchestrator from '@/server/services/orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const success = orchestrator.cancelRun(id);
  if (!success) {
    return NextResponse.json(
      { error: 'Cannot cancel this run (not running or not found)' },
      { status: 400 },
    );
  }
  return NextResponse.json({ status: 'cancelled' });
}
