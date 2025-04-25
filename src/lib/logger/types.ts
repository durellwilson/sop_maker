export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogOptions {
  context?: string;
  data?: Record<string, any>;
}

export interface ILogger {
  debug(message: string, options?: LogOptions): void;
  info(message: string, options?: LogOptions): void;
  warn(message: string, options?: LogOptions): void;
  error(message: string, error?: Error, options?: LogOptions): void;
  db(message: string, error?: Error, details?: Record<string, any>): void;
  firebase(message: string, error?: Error, details?: Record<string, any>): void;
  auth(message: string, error?: Error, details?: Record<string, any>): void;
}

// Shared formatter utility
export const formatMessage = (level: LogLevel, message: string, options?: LogOptions): string => {
  const timestamp = new Date().toISOString();
  const context = options?.context ? `[${options.context}]` : '';
  return `${timestamp} ${level.toUpperCase()} ${context} ${message}`;
}; 