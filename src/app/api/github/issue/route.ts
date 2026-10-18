import { NextRequest, NextResponse } from 'next/server';
import { FetchIssueRequestSchema } from '@/server/schemas/api-requests';
import { parseGitHubUrl } from '@/server/utils/url-parser';
import * as githubService from '@/server/services/github';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = FetchIssueRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { repoUrl, issueNumber } = parsed.data;
    const urlParsed = parseGitHubUrl(repoUrl);

    if (!urlParsed) {
      return NextResponse.json({ error: 'Invalid GitHub repository URL' }, { status: 400 });
    }

    const issue = await githubService.getIssue(urlParsed.owner, urlParsed.repo, issueNumber);
    const comments = await githubService.getIssueComments(urlParsed.owner, urlParsed.repo, issueNumber, 5);
    issue.comments = comments;

    return NextResponse.json(
      {
        issue,
        repository: {
          owner: urlParsed.owner,
          repo: urlParsed.repo,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    );
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
    console.error('GitHub issue fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch issue' }, { status: 500 });
  }
}
