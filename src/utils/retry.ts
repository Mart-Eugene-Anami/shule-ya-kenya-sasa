/**
 * Retry utility for network operations with exponential backoff.
 * Improves reliability for flaky network connections.
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: any) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: (error: any) => {
    // Retry on network errors, timeouts, and rate limits
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || '';
    
    // Network errors
    if (errorMessage.includes('network') || 
        errorMessage.includes('timeout') || 
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('fetch failed')) {
      return true;
    }
    
    // Rate limiting
    if (errorMessage.includes('rate limit') || 
        errorMessage.includes('too many requests') ||
        errorCode === '429') {
      return true;
    }
    
    // Server errors (5xx)
    if (errorCode?.toString().startsWith('5')) {
      return true;
    }
    
    return false;
  },
};

/**
 * Execute an async operation with retry logic and exponential backoff.
 * 
 * @param operation - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the operation
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (!opts.retryableErrors(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === opts.maxAttempts) {
        throw error;
      }
      
      // Wait with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt (capped at maxDelayMs)
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Execute an async operation with retry logic and progress reporting.
 * 
 * @param operation - The async function to execute
 * @param onRetry - Callback called before each retry (attempt number, error)
 * @param options - Retry configuration options
 * @returns The result of the operation
 */
export async function withRetryProgress<T>(
  operation: () => Promise<T>,
  onRetry: (attempt: number, error: any) => void,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (!opts.retryableErrors(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === opts.maxAttempts) {
        throw error;
      }
      
      // Report retry
      onRetry(attempt, error);
      
      // Wait with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt (capped at maxDelayMs)
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }
  
  throw lastError;
}
