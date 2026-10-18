import { describe, it, expect } from 'vitest';
import { GET as configGet, dynamic } from './route';
import { GET as publicConfigGet, dynamic as publicDynamic } from './public/route';

describe('GET /api/config', () => {
  it('is configured as dynamic route', () => {
    expect(dynamic).toBe('force-dynamic');
    expect(publicDynamic).toBe('force-dynamic');
  });

  it('returns public configuration without exposing secret keys', async () => {
    const res = await configGet();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.service).toBe('autopatch');
    expect(data.version).toBe('1.0.0');
    expect(data).toHaveProperty('environment');
    expect(data).toHaveProperty('aiProvider');
    expect(data).toHaveProperty('aiConfigured');
    expect(data).toHaveProperty('githubTokenConfigured');
    expect(data).toHaveProperty('maxRevisionAttempts');
    expect(data).toHaveProperty('scoutMaxFiles');
    expect(data.scoutMaxFiles).toBeGreaterThanOrEqual(60);

    // Verify cache control header
    expect(res.headers.get('Cache-Control')).toContain('no-store');

    // Verify secrets are strictly stripped
    expect(data).not.toHaveProperty('apiKey');
    expect(data).not.toHaveProperty('apiKeys');
    expect(data).not.toHaveProperty('githubToken');
    expect(data).not.toHaveProperty('token');
  });

  it('GET /api/config/public delegates to config route', async () => {
    const res = await publicConfigGet();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.service).toBe('autopatch');
    expect(data).toHaveProperty('aiProvider');
    expect(data).toHaveProperty('aiConfigured');
  });
});
