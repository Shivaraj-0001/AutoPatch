import { NextRequest, NextResponse } from 'next/server';
import { StartRunRequestSchema } from '@/server/schemas/api-requests';
import { parseGitHubUrl } from '@/server/utils/url-parser';
import { RateLimiter } from '@/server/utils/rate-limiter';
import * as orchestrator from '@/server/services/orchestrator';

export const dynamic = 'force-dynamic';

const runLimiter = new RateLimiter(5, 60_000); // 5 runs per minute

export async function POST(request: NextRequest) {
  try {
    const clientKey = request.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = runLimiter.check(clientKey);
    if (!rateCheck.allowed) {
      const retryAfterSeconds = Math.ceil((rateCheck.retryAfterMs || 1000) / 1000);
      return NextResponse.json(
        {
          error: 'Too many requests. Please wait before starting another run.',
          retryAfterMs: rateCheck.retryAfterMs,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
          },
        },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = StartRunRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { repoUrl, issueNumber, additionalInstructions, targetBranch } = parsed.data;
    const urlParsed = parseGitHubUrl(repoUrl);

    if (!urlParsed) {
      return NextResponse.json({ error: 'Invalid GitHub repository URL' }, { status: 400 });
    }

    const run = await orchestrator.startRun({
      owner: urlParsed.owner,
      repo: urlParsed.repo,
      issueNumber,
      additionalInstructions,
      targetBranch,
    });

    return NextResponse.json(
      {
        id: run.id,
        status: run.status,
        createdAt: run.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Run creation error:', error);
    return NextResponse.json({ error: 'Failed to start workflow run' }, { status: 500 });
  }
}

export async function GET() {
  const runs = orchestrator.getAllRuns();
  return NextResponse.json(
    runs.map((run) => ({
      id: run.id,
      repository: run.repository.fullName,
      issueNumber: run.issueNumber,
      issueTitle: run.issue?.title || null,
      status: run.status,
      currentAgent: run.currentAgent,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    })),
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}

export async function DELETE() {
  orchestrator.clearAllRuns();
  return NextResponse.json({ success: true });
}
