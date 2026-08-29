
/**
 * Request throttling and batching utilities to optimize API calls
 * when handling large numbers of concurrent users
 */

/**
 * Debounce function to prevent excessive API calls
 */
export function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function(this: any, ...args: Parameters<F>): void {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, waitFor);
  };
}

/**
 * Throttle function to limit frequency of function calls
 */
export function throttle<F extends (...args: any[]) => any>(func: F, limit: number) {
  let inThrottle: boolean = false;
  
  return function(this: any, ...args: Parameters<F>): void {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

type BatchItem<T> = {
  id: string;
  data: T;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
};

/**
 * Request batcher to combine multiple API calls into one batch request
 * This significantly reduces the number of network requests when many users
 * are making similar calls simultaneously
 */
export class RequestBatcher<T> {
  private batchSize: number;
  private maxWaitTimeMs: number;
  private queue: BatchItem<T>[] = [];
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private processBatch: (items: BatchItem<T>[]) => Promise<any>;
  
  constructor(
    processBatch: (items: BatchItem<T>[]) => Promise<any>, 
    batchSize: number = 10, 
    maxWaitTimeMs: number = 50
  ) {
    this.processBatch = processBatch;
    this.batchSize = batchSize;
    this.maxWaitTimeMs = maxWaitTimeMs;
  }
  
  public add(id: string, data: T): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ id, data, resolve, reject });
      this.scheduleProcessing();
    });
  }
  
  private scheduleProcessing(): void {
    if (this.queue.length >= this.batchSize) {
      // Process immediately if we've reached batch size
      this.processQueue();
    } else if (!this.timeout) {
      // Set a timeout to process after max wait time
      this.timeout = setTimeout(() => this.processQueue(), this.maxWaitTimeMs);
    }
  }
  
  private async processQueue(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      const results = await this.processBatch(batch);
      batch.forEach((item) => item.resolve(results[item.id] || null));
    } catch (error) {
      batch.forEach((item) => item.reject(error));
    }
    
    // Process any remaining items in the queue
    if (this.queue.length > 0) {
      this.scheduleProcessing();
    }
  }
}
