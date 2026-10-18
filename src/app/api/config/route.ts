import { NextResponse } from 'next/server';
import { config } from '@/server/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    aiProvider: config.ai.provider,
    aiModel: config.ai.model || null,
    aiConfigured: config.isAiConfigured,
    githubTokenConfigured: config.isGithubTokenConfigured,
    maxRevisionAttempts: config.maxRevisionAttempts,
    scoutMaxFiles: config.scoutMaxFiles,
  });
}
