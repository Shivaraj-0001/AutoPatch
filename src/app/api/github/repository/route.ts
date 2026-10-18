import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubUrl } from '@/server/utils/url-parser';
import * as githubService from '@/server/services/github';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoUrl = searchParams.get('url');

    if (!repoUrl) {
      return NextResponse.json({ error: 'url query parameter is required' }, { status: 400 });
    }

    const urlParsed = parseGitHubUrl(repoUrl);
    if (!urlParsed) {
      return NextResponse.json({ error: 'Invalid GitHub repository URL' }, { status: 400 });
    }

    const repo = await githubService.getRepository(urlParsed.owner, urlParsed.repo);
    return NextResponse.json(repo);
  } catch (error) {
    if (error instanceof githubService.GitHubApiError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'GITHUB_ERROR',
        },
        { status: error.statusCode >= 500 ? 502 : error.statusCode },
      );
    }
    console.error('GitHub repo fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch repository' }, { status: 500 });
  }
}
