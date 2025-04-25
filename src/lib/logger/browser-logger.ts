'use client';

import { nextEnv } from '@/utils/env';
import { ILogger, LogOptions, formatMessage } from './types';

// Browser-specific logger implementation
export class BrowserLogger implements ILogger {
  private isProduction = nextEnv.isProd;

  debug(message: string, options?: LogOptions): void {
    if (this.isProduction) return;
    
    const formattedMessage = formatMessage('debug', message, options);
    console.debug(formattedMessage);
    
    if (options?.data) {
      console.debug(options.data);
    }
  }

  info(message: string, options?: LogOptions): void {
    const formattedMessage = formatMessage('info', message, options);
    console.info(formattedMessage);
    
    if (options?.data) {
      console.info(options.data);
    }
  }

  warn(message: string, options?: LogOptions): void {
    const formattedMessage = formatMessage('warn', message, options);
    console.warn(formattedMessage);
    
    if (options?.data) {
      console.warn(options.data);
    }
  }

  error(message: string, error?: Error, options?: LogOptions): void {
    const formattedMessage = formatMessage('error', message, options);
    console.error(formattedMessage);
    
    if (error) {
      console.error(error);
    }
    
    if (options?.data) {
      console.error(options.data);
    }
    
    // In production, send to error tracking service if available
    if (this.isProduction) {
      // Example: Send to error tracking service
      // errorTrackingService.captureException(error);
    }
  }

  db(message: string, error?: Error, details?: Record<string, any>): void {
    this.log('db', message, error, details);
  }

  firebase(message: string, error?: Error, details?: Record<string, any>): void {
    this.log('firebase', message, error, details);
  }

  auth(message: string, error?: Error, details?: Record<string, any>): void {
    this.log('auth', message, error, details);
  }

  private log(category: string, message: string, error?: Error, details?: Record<string, any>): void {
    const options: LogOptions = {
      context: category.toUpperCase(),
      data: details
    };

    if (error) {
      this.error(message, error, options);
    } else {
      this.info(message, options);
    }
  }
} 