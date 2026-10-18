import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from './rate-limiter';

describe('rate-limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests within limit', () => {
    const limiter = new RateLimiter(3, 10_000);
    expect(limiter.check('client-1')).toEqual({ allowed: true, remaining: 2 });
    expect(limiter.check('client-1')).toEqual({ allowed: true, remaining: 1 });
    expect(limiter.check('client-1')).toEqual({ allowed: true, remaining: 0 });
  });

  it('blocks requests exceeding limit and provides retryAfterMs', () => {
    const limiter = new RateLimiter(2, 5_000);
    limiter.check('ip-1');
    limiter.check('ip-1');

    const blocked = limiter.check('ip-1');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(5_000);
  });

  it('resets window after elapsed time', () => {
    const limiter = new RateLimiter(2, 5_000);
    limiter.check('ip-1');
    limiter.check('ip-1');
    expect(limiter.check('ip-1').allowed).toBe(false);

    vi.advanceTimersByTime(5_001);

    const fresh = limiter.check('ip-1');
    expect(fresh.allowed).toBe(true);
    expect(fresh.remaining).toBe(1);
  });

  it('tracks different keys independently', () => {
    const limiter = new RateLimiter(1, 10_000);
    expect(limiter.check('user-a').allowed).toBe(true);
    expect(limiter.check('user-a').allowed).toBe(false);
    expect(limiter.check('user-b').allowed).toBe(true);
  });

  it('calculates remaining requests via getRemaining', () => {
    const limiter = new RateLimiter(5, 10_000);
    expect(limiter.getRemaining('key-1')).toBe(5);
    limiter.check('key-1');
    limiter.check('key-1');
    expect(limiter.getRemaining('key-1')).toBe(3);
  });

  it('resets a specific key or all keys', () => {
    const limiter = new RateLimiter(2, 10_000);
    limiter.check('user-1');
    limiter.check('user-2');

    limiter.reset('user-1');
    expect(limiter.getRemaining('user-1')).toBe(2);
    expect(limiter.getRemaining('user-2')).toBe(1);

    limiter.reset();
    expect(limiter.getRemaining('user-2')).toBe(2);
  });

  it('prunes expired entries from cache', () => {
    const limiter = new RateLimiter(2, 5_000);
    limiter.check('old-client');
    vi.advanceTimersByTime(6_000);

    limiter.prune();
    expect(limiter.getRemaining('old-client')).toBe(2);
  });
});
