import { describe, it, expect } from 'vitest';
import { GET as healthGet, dynamic } from './route';

describe('GET /api/health', () => {
  it('is configured as dynamic route', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('returns ok status, timestamp, version, and uptime', async () => {
    const res = await healthGet();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.service).toBe('autopatch');
    expect(data.version).toBe('1.0.0');
    expect(typeof data.timestamp).toBe('string');
    expect(new Date(data.timestamp).getTime()).not.toBeNaN();
    expect(typeof data.uptime).toBe('number');
    expect(data.uptime).toBeGreaterThanOrEqual(0);

    // Verify cache control header
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });
});
