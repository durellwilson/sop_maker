import { NextApiResponse } from 'next';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ErrorEvent {
  message: string;
  stack?: string;
  componentStack?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

class AppMonitoring {
  private static instance: AppMonitoring;
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorEvent[] = [];
  private readonly METRICS_THRESHOLD = 1000;
  private readonly ERROR_THRESHOLD = 100;

  private constructor() {
    // Initialize error boundary listener
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    }
  }

  static getInstance(): AppMonitoring {
    if (!AppMonitoring.instance) {
      AppMonitoring.instance = new AppMonitoring();
    }
    return AppMonitoring.instance;
  }

  // Track performance metrics
  trackMetric(metric: Omit<PerformanceMetric, 'timestamp'>) {
    const fullMetric = {
      ...metric,
      timestamp: new Date().toISOString(),
    };

    this.metrics.push(fullMetric);

    // Flush if we have too many metrics
    if (this.metrics.length > this.METRICS_THRESHOLD) {
      this.flushMetrics();
    }

    // Alert if metric is concerning
    this.checkMetricThresholds(fullMetric);
  }

  // Track errors
  trackError(error: Omit<ErrorEvent, 'timestamp'>) {
    const fullError = {
      ...error,
      timestamp: new Date().toISOString(),
    };

    this.errors.push(fullError);

    // Flush if we have too many errors
    if (this.errors.length > this.ERROR_THRESHOLD) {
      this.flushErrors();
    }

    // Alert if error rate is concerning
    this.checkErrorThresholds();
  }

  // Handle unhandled promise rejections
  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    this.trackError({
      message: 'Unhandled Promise Rejection',
      stack: event.reason?.stack,
      metadata: {
        reason: event.reason,
      },
    });
  };

  // Check if metrics exceed thresholds
  private checkMetricThresholds(metric: PerformanceMetric) {
    const thresholds: Record<string, number> = {
      'page-load': 3000, // 3 seconds
      'api-response': 1000, // 1 second
      'database-query': 500, // 500ms
    };

    if (thresholds[metric.name] && metric.value > thresholds[metric.name]) {
      console.warn(`Performance threshold exceeded for ${metric.name}: ${metric.value}ms`);
      // You could send this to your monitoring service
    }
  }

  // Check error rates
  private checkErrorThresholds() {
    const recentErrors = this.errors.filter(
      error => new Date().getTime() - new Date(error.timestamp).getTime() < 60000
    );

    if (recentErrors.length > 10) {
      console.error(`High error rate detected: ${recentErrors.length} errors in the last minute`);
      // You could send this to your monitoring service
    }
  }

  // Flush metrics to your monitoring service
  private async flushMetrics() {
    try {
      await fetch('/api/monitoring/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.metrics),
      });
      this.metrics = [];
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  // Flush errors to your monitoring service
  private async flushErrors() {
    try {
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.errors),
      });
      this.errors = [];
    } catch (error) {
      console.error('Failed to flush errors:', error);
    }
  }
}

// API response time middleware
export const trackApiResponse = (handler: Function) => async (req: any, res: NextApiResponse) => {
  const start = Date.now();
  
  try {
    await handler(req, res);
  } finally {
    const duration = Date.now() - start;
    AppMonitoring.getInstance().trackMetric({
      name: 'api-response',
      value: duration,
      metadata: {
        path: req.url,
        method: req.method,
        status: res.statusCode,
      },
    });
  }
};

// Database query time tracking
export const trackDatabaseQuery = async <T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();
  
  try {
    return await queryFn();
  } finally {
    const duration = Date.now() - start;
    AppMonitoring.getInstance().trackMetric({
      name: 'database-query',
      value: duration,
      metadata: {
        queryName,
      },
    });
  }
};

export const monitoring = AppMonitoring.getInstance(); 