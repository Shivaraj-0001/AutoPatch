import dotenv from 'dotenv';
dotenv.config();

export const config = {
  get port(): number {
    return parseInt(process.env.PORT || '3001', 10);
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
    return parseInt(process.env.MAX_REVISION_ATTEMPTS || '2', 10);
  },
  get scoutMaxFiles(): number {
    return parseInt(process.env.SCOUT_MAX_FILES || '60', 10);
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
export function getPublicConfig() {
  return {
    aiProvider: config.ai.provider,
    aiModel: config.ai.model || null,
    aiConfigured: config.isAiConfigured,
    githubTokenConfigured: config.isGithubTokenConfigured,
    maxRevisionAttempts: config.maxRevisionAttempts,
    scoutMaxFiles: config.scoutMaxFiles,
  };
}

