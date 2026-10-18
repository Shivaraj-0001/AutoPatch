/**
 * Sliding window in-memory rate limiter with prune and reset capabilities.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    public readonly maxRequests: number,
    public readonly windowMs: number,
  ) {
    if (maxRequests <= 0 || !Number.isFinite(maxRequests)) {
      throw new Error('maxRequests must be a positive number');
    }
    if (windowMs <= 0 || !Number.isFinite(windowMs)) {
      throw new Error('windowMs must be a positive number');
    }
  }

  /**
   * Helper factory creating a rate limiter with a 1-minute window.
   */
  static perMinute(maxRequests: number): RateLimiter {
    return new RateLimiter(maxRequests, 60_000);
  }

  /**
   * Helper factory creating a rate limiter with a 1-second window.
   */
  static perSecond(maxRequests: number): RateLimiter {
    return new RateLimiter(maxRequests, 1_000);
  }


  check(key: string): RateLimitResult {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // Remove expired timestamps
    const valid = timestamps.filter((t) => now - t < this.windowMs);

    if (valid.length >= this.maxRequests) {
      this.requests.set(key, valid);
      const oldest = valid[0];
      const retryAfterMs = Math.max(0, this.windowMs - (now - oldest));
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs,
      };
    }

    valid.push(now);
    this.requests.set(key, valid);

    // Periodic cleanup of stale entries if map exceeds 1000 keys
    if (this.requests.size > 1000) {
      this.prune(now);
    }

    return {
      allowed: true,
      remaining: this.maxRequests - valid.length,
    };
  }

  getRemaining(key: string): number {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const valid = timestamps.filter((t) => now - t < this.windowMs);
    return Math.max(0, this.maxRequests - valid.length);
  }

  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }

  prune(now: number = Date.now()): void {
    for (const [key, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter((t) => now - t < this.windowMs);
      if (valid.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, valid);
      }
    }
  }
}
