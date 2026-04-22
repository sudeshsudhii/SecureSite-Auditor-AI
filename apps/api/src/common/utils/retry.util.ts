/**
 * retry.util.ts
 * 
 * Reusable exponential backoff retry utility.
 * Designed for API calls that may fail with transient errors (429, 503, 5xx).
 * Includes jitter to prevent thundering herd on shared quota.
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds before first retry (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay cap in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Optional callback invoked before each retry with attempt number and delay */
  onRetry?: (attempt: number, delayMs: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * Determines if an error is retryable based on its message or status code.
 * Only retries on rate-limit (429), server errors (5xx), and transient network issues.
 */
function isRetryableError(error: any): boolean {
  const message = (error?.message || '').toLowerCase();
  const status = error?.status || error?.statusCode || error?.response?.status;

  // Explicit 429 Too Many Requests
  if (status === 429 || message.includes('429') || message.includes('quota') || message.includes('rate limit')) {
    return true;
  }

  // Server errors (500-599)
  if (typeof status === 'number' && status >= 500 && status < 600) {
    return true;
  }

  // Transient network errors
  if (message.includes('econnreset') || message.includes('etimedout') || message.includes('socket hang up')) {
    return true;
  }

  return false;
}

/**
 * Executes an async function with exponential backoff retry logic.
 * 
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the successful function call
 * @throws The last error if all retries are exhausted
 * 
 * @example
 * ```ts
 * const result = await retryWithBackoff(
 *   () => geminiModel.generateContent(prompt),
 *   { maxRetries: 3, onRetry: (attempt, delay) => logger.warn(`Retry #${attempt} in ${delay}ms`) }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on the last attempt or non-retryable errors
      if (attempt === config.maxRetries || !isRetryableError(error)) {
        throw error;
      }

      // Calculate delay: exponential backoff with jitter
      // delay = min(baseDelay * 2^attempt + random_jitter, maxDelay)
      const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * config.baseDelayMs * 0.5; // 0-50% of base delay
      const delay = Math.min(exponentialDelay + jitter, config.maxDelayMs);

      // Notify caller about the retry
      if (options?.onRetry) {
        options.onRetry(attempt + 1, Math.round(delay), error);
      }

      await sleep(delay);
    }
  }

  // TypeScript safety — should never reach here
  throw lastError!;
}

/** Promise-based sleep utility */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
