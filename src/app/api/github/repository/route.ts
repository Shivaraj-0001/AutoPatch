import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubUrl } from '@/server/utils/url-parser';
import * as githubService from '@/server/services/github';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoUrl = searchParams.get('url');
    const ownerParam = searchParams.get('owner');
    const repoParam = searchParams.get('repo');

    let owner: string;
    let repo: string;

    if (ownerParam && repoParam) {
      owner = ownerParam.trim();
      repo = repoParam.trim();
    } else if (repoUrl) {
      const urlParsed = parseGitHubUrl(repoUrl);
      if (!urlParsed) {
        return NextResponse.json({ error: 'Invalid GitHub repository URL' }, { status: 400 });
      }
      owner = urlParsed.owner;
      repo = urlParsed.repo;
    } else {
      return NextResponse.json(
        { error: 'url query parameter or owner and repo parameters are required' },
        { status: 400 },
      );
    }

    const repoData = await githubService.getRepository(owner, repo);
    return NextResponse.json(repoData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
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
