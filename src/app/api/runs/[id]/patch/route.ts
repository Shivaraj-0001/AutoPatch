import { NextRequest, NextResponse } from 'next/server';
import * as orchestrator from '@/server/services/orchestrator';
import { formatPatchForDownload } from '@/server/utils/patch-validator';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const run = orchestrator.getRun(id);
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  let patch = run.codingProposal?.patch;
  let revNum: number | undefined;

  const { searchParams } = new URL(request.url);
  const revisionQuery = searchParams.get('revision');

  if (revisionQuery) {
    const requestedRev = parseInt(revisionQuery, 10);
    const matchedRev = run.revisionHistory?.find(
      (r, idx) =>
        r.revision === requestedRev ||
        r.attempt === requestedRev - 1 ||
        r.attempt === requestedRev ||
        idx + 1 === requestedRev,
    );
    if (matchedRev?.codingProposal?.patch) {
      patch = matchedRev.codingProposal.patch;
      revNum = requestedRev;
    }
  }

  if (!patch) {
    return NextResponse.json({ error: 'No patch available for this run' }, { status: 404 });
  }

  const patchFormatted = formatPatchForDownload(
    patch,
    run.repository.fullName,
    run.issueNumber,
  );

  const revSuffix = revNum ? `-rev${revNum}` : '';
  const filename = `${run.repository.repo}-issue-${run.issueNumber}${revSuffix}.patch`;

  return new Response(patchFormatted, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
