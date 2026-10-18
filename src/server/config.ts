import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  
  ai: {
    provider: process.env.AI_PROVIDER || 'groq',
    baseUrl: process.env.AI_BASE_URL || '',
    get apiKeys(): string[] {
      return (process.env.AI_API_KEYS || '')
        .split(':')
        .map((k) => k.trim())
        .filter(Boolean);
    },
    model: process.env.AI_MODEL || '',
  },
  
  github: {
    token: process.env.GITHUB_TOKEN || '',
  },
  
  maxRevisionAttempts: parseInt(process.env.MAX_REVISION_ATTEMPTS || '2', 10),
  scoutMaxFiles: parseInt(process.env.SCOUT_MAX_FILES || '60', 10),
  
  get isAiConfigured(): boolean {
    return !!(this.ai.baseUrl && this.ai.apiKeys.length > 0 && this.ai.model);
  },
  
  get isGithubTokenConfigured(): boolean {
    return !!this.github.token;
  },
};
