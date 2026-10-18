import type {
  PublicConfig,
  GitHubIssue,
  WorkflowRun,
} from './types';

const API_BASE = '/api';

export class ApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // not JSON
    }
    throw new ApiError(
      errorData.error || `HTTP error ${response.status}`,
      response.status,
      errorData.details,
    );
  }

  return response.json();
}

export async function fetchPublicConfig(signal?: AbortSignal): Promise<PublicConfig> {
  return request<PublicConfig>('/config', { signal });
}

export async function fetchIssueDetails(
  repoUrl: string,
  issueNumber: number,
): Promise<{ issue: GitHubIssue; repository: { owner: string; repo: string } }> {
  return request<{ issue: GitHubIssue; repository: { owner: string; repo: string } }>(
    '/github/issue',
    {
      method: 'POST',
      body: JSON.stringify({ repoUrl, issueNumber }),
    },
  );
}

export async function fetchRepoMetadata(
  target: string | { owner: string; repo: string },
): Promise<any> {
  if (typeof target === 'string') {
    return request(`/github/repository?url=${encodeURIComponent(target)}`);
  }
  return request(
    `/github/repository?owner=${encodeURIComponent(target.owner)}&repo=${encodeURIComponent(target.repo)}`,
  );
}

export async function startWorkflowRun(params: {
  repoUrl: string;
  issueNumber: number;
  additionalInstructions?: string;
  targetBranch?: string;
}): Promise<{ id: string; status: string; createdAt: string }> {
  return request<{ id: string; status: string; createdAt: string }>(
    '/runs',
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
  );
}

export async function getWorkflowRun(id: string, signal?: AbortSignal): Promise<WorkflowRun> {
  return request<WorkflowRun>(`/runs/${id}`, { signal });
}

export async function listWorkflowRuns(signal?: AbortSignal): Promise<
  Array<{
    id: string;
    repository: string;
    issueNumber: number;
    issueTitle: string | null;
    status: WorkflowRun['status'];
    currentAgent: string | null;
    createdAt: string;
    updatedAt: string;
  }>
> {
  return request('/runs', { signal });
}

export async function cancelWorkflowRun(id: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/runs/${id}/cancel`, {
    method: 'POST',
  });
}

export async function refineWorkflowRun(
  id: string,
  options?: { instructions?: string; selectedSuggestions?: string[] },
): Promise<{ id: string; status: string; revisionCount: number }> {
  return request<{ id: string; status: string; revisionCount: number }>(`/runs/${id}/refine`, {
    method: 'POST',
    body: JSON.stringify(options || {}),
  });
}

export function getPatchDownloadUrl(id: string, revision?: number): string {
  if (revision !== undefined) {
    return `${API_BASE}/runs/${id}/patch?revision=${revision}`;
  }
  return `${API_BASE}/runs/${id}/patch`;
}

export async function deleteWorkflowRun(id: string): Promise<{ success: boolean }> {
  try {
    return await request<{ success: boolean }>(`/runs/${id}`, {
      method: 'DELETE',
    });
  } catch {
    return { success: false };
  }
}

export async function clearAllWorkflowRuns(): Promise<{ success: boolean }> {
  try {
    return await request<{ success: boolean }>('/runs', {
      method: 'DELETE',
    });
  } catch {
    return { success: false };
  }
}
