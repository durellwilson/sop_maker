'use client';

import { useEffect, useState } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { logger } from '@/lib/logger/index';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

function ErrorFallback({ error, resetErrorBoundary }: { 
  error: Error; 
  resetErrorBoundary: () => void;
}) {
  useEffect(() => {
    logger.error('React component error:', error, { context: 'ErrorBoundary' });
  }, [error]);

  return (
    <div className="p-6 rounded-lg bg-red-50 border border-red-200">
      <h2 className="text-xl font-semibold text-red-800 mb-2">Something went wrong</h2>
      <p className="text-red-700 mb-4">
        We've encountered an error and our team has been notified.
      </p>
      <div className="mb-4">
        <details className="cursor-pointer">
          <summary className="text-sm font-medium text-red-800">Technical details</summary>
          <pre className="mt-2 text-xs p-4 bg-red-100 rounded overflow-auto">
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
        </details>
      </div>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

export function GlobalErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={fallback ? () => <>{fallback}</> : ErrorFallback}
      onError={(error, info) => {
        logger.error('Uncaught error in component:', error, {
          context: 'GlobalErrorBoundary', 
          data: { componentStack: info.componentStack }
        });
      }}
      onReset={() => {
        // Reset application state here if needed
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}

export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: React.ReactNode
) {
  const displayName = Component.displayName || Component.name || 'Component';
  
  function WithErrorBoundary(props: T) {
    return (
      <ReactErrorBoundary
        FallbackComponent={fallback ? () => <>{fallback}</> : ErrorFallback}
        onError={(error) => {
          logger.error(`Error in ${displayName}:`, error, { context: 'ComponentErrorBoundary' });
        }}
      >
        <Component {...props} />
      </ReactErrorBoundary>
    );
  }
  
  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return WithErrorBoundary;
} 