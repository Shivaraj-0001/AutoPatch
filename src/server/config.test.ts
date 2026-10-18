import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { config, getPublicConfig } from './config';

describe('server config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('parses colon-separated API keys', () => {
    process.env.AI_API_KEYS = 'key1:key2:key3';
    expect(config.ai.apiKeys).toEqual(['key1', 'key2', 'key3']);
  });

  it('parses comma-separated or newline-separated API keys with trimming', () => {
    process.env.AI_API_KEYS = '  keyA, keyB \n keyC ';
    expect(config.ai.apiKeys).toEqual(['keyA', 'keyB', 'keyC']);
  });

  it('computes isAiConfigured status', () => {
    process.env.AI_BASE_URL = 'https://api.groq.com/openai/v1';
    process.env.AI_API_KEYS = 'gsk_test';
    process.env.AI_MODEL = 'qwen-2.5-coder';
    expect(config.isAiConfigured).toBe(true);

    process.env.AI_API_KEYS = '';
    expect(config.isAiConfigured).toBe(false);
  });

  it('computes isGithubTokenConfigured status', () => {
    process.env.GITHUB_TOKEN = 'ghp_secret';
    expect(config.isGithubTokenConfigured).toBe(true);

    delete process.env.GITHUB_TOKEN;
    expect(config.isGithubTokenConfigured).toBe(false);
  });

  it('getPublicConfig omits private credentials', () => {
    const pub = getPublicConfig();
    expect(pub).toHaveProperty('aiProvider');
    expect(pub).toHaveProperty('aiConfigured');
    expect(pub).toHaveProperty('githubTokenConfigured');
    expect(pub).not.toHaveProperty('token');
    expect(pub).not.toHaveProperty('apiKeys');
  });

  it('safely parses positive integers with fallbacks for numeric env variables', () => {
    process.env.PORT = '8080';
    process.env.MAX_REVISION_ATTEMPTS = '5';
    process.env.SCOUT_MAX_FILES = '100';

    expect(config.port).toBe(8080);
    expect(config.maxRevisionAttempts).toBe(5);
    expect(config.scoutMaxFiles).toBe(100);

    // Invalid or non-positive values should fallback gracefully
    process.env.PORT = 'not-a-number';
    process.env.MAX_REVISION_ATTEMPTS = '-3';
    process.env.SCOUT_MAX_FILES = '0';

    expect(config.port).toBe(3001);
    expect(config.maxRevisionAttempts).toBe(2);
    expect(config.scoutMaxFiles).toBe(60);
  });
});
