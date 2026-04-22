/**
 * rate-limiter.util.ts
 * 
 * Simple in-memory token bucket rate limiter.
 * Prevents exceeding API quotas by throttling outbound requests.
 * No external dependencies required.
 */

export interface RateLimiterOptions {
  /** Number of tokens (requests) allowed per interval (default: 10) */
  tokensPerInterval?: number;
  /** Interval duration in milliseconds (default: 60000 = 1 minute) */
  intervalMs?: number;
}

/**
 * Token bucket rate limiter.
 * Tokens refill at `tokensPerInterval` per `intervalMs`.
 * Each `acquire()` call consumes one token.
 * 
 * @example
 * ```ts
 * const limiter = new RateLimiter({ tokensPerInterval: 15, intervalMs: 60000 });
 * 
 * if (!limiter.acquire()) {
 *   throw new Error('Rate limit exceeded');
 * }
 * // proceed with API call
 * ```
 */
export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly intervalMs: number;
  private lastRefillTime: number;

  constructor(options?: RateLimiterOptions) {
    this.maxTokens = options?.tokensPerInterval ?? 10;
    this.intervalMs = options?.intervalMs ?? 60_000;
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
  }

  /**
   * Attempts to acquire a token for making a request.
   * @returns `true` if a token was available and consumed, `false` if rate-limited.
   */
  acquire(): boolean {
    this.refill();

    if (this.tokens > 0) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Returns the number of tokens currently available.
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Returns the estimated wait time in milliseconds until a token becomes available.
   * Returns 0 if tokens are already available.
   */
  getWaitTimeMs(): number {
    this.refill();

    if (this.tokens > 0) {
      return 0;
    }

    // Calculate time until next token refill
    const elapsed = Date.now() - this.lastRefillTime;
    const timePerToken = this.intervalMs / this.maxTokens;
    return Math.max(0, Math.ceil(timePerToken - elapsed));
  }

  /**
   * Refills tokens based on elapsed time since last refill.
   * Uses fractional token accumulation for smooth rate limiting.
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;

    if (elapsed <= 0) return;

    // Calculate how many tokens to add based on elapsed time
    const tokensToAdd = (elapsed / this.intervalMs) * this.maxTokens;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }
}
