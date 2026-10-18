import dotenv from 'dotenv';
import type { PublicConfig } from '@/lib/types';

dotenv.config();

function parsePositiveInt(val: string | undefined, fallback: number): number {
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  get port(): number {
    return parsePositiveInt(process.env.PORT, 3001);
  },

  
  ai: {
    get provider(): string {
      return process.env.AI_PROVIDER || 'groq';
    },
    get baseUrl(): string {
      return process.env.AI_BASE_URL || '';
    },
    get apiKeys(): string[] {
      return (process.env.AI_API_KEYS || '')
        .split(/[:,\n]/)
        .map((k) => k.trim())
        .filter(Boolean);
    },
    get model(): string {
      return process.env.AI_MODEL || '';
    },
  },
  
  github: {
    get token(): string {
      return process.env.GITHUB_TOKEN || '';
    },
  },
  
  get maxRevisionAttempts(): number {
    return parsePositiveInt(process.env.MAX_REVISION_ATTEMPTS, 2);
  },
  get scoutMaxFiles(): number {
    return parsePositiveInt(process.env.SCOUT_MAX_FILES, 60);
  },

  
  get isAiConfigured(): boolean {
    return !!(this.ai.baseUrl && this.ai.apiKeys.length > 0 && this.ai.model);
  },
  
  get isGithubTokenConfigured(): boolean {
    return !!this.github.token;
  },
};

/**
 * Returns a sanitized public configuration object without exposing secrets.
 */
export function getPublicConfig(): PublicConfig {
  return {
    aiProvider: config.ai.provider,
    aiModel: config.ai.model || null,
    aiConfigured: config.isAiConfigured,
    githubTokenConfigured: config.isGithubTokenConfigured,
    maxRevisionAttempts: config.maxRevisionAttempts,
    scoutMaxFiles: config.scoutMaxFiles,
  };
}

