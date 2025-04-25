import fs from 'fs';
import path from 'path';
import { nextEnv } from '@/utils/env';
import { ILogger, LogOptions, formatMessage } from './types';

// Server-specific logger implementation with file system access
export class ServerLogger implements ILogger {
  private isProduction = nextEnv.isProd;
  private debugDir: string;
  
  constructor() {
    this.debugDir = path.join(process.cwd(), 'debug');
    this.setupDebugDir();
  }
  
  private setupDebugDir(): void {
    if (!this.isProduction) {
      try {
        if (!fs.existsSync(this.debugDir)) {
          fs.mkdirSync(this.debugDir, { recursive: true });
        }
      } catch (err) {
        console.error('Failed to create debug directory:', err);
      }
    }
  }
  
  private writeToFile(level: string, formattedMessage: string, error?: Error, data?: any): void {
    if (!this.isProduction || level === 'error') {
      try {
        const logFilePath = path.join(this.debugDir, `${level}.log`);
        const logEntry = [
          formattedMessage,
          error ? `\nError: ${error.message}\nStack: ${error.stack}` : '',
          data ? `\nData: ${JSON.stringify(data, null, 2)}` : '',
          '\n---\n'
        ].join('');
        
        fs.appendFileSync(logFilePath, logEntry);
      } catch (err) {
        console.error('Failed to write to log file:', err);
      }
    }
  }

  debug(message: string, options?: LogOptions): void {
    if (this.isProduction) return;
    
    const formattedMessage = formatMessage('debug', message, options);
    console.debug(formattedMessage);
    
    if (options?.data) {
      console.debug(options.data);
    }
    
    this.writeToFile('debug', formattedMessage, undefined, options?.data);
  }

  info(message: string, options?: LogOptions): void {
    const formattedMessage = formatMessage('info', message, options);
    console.info(formattedMessage);
    
    if (options?.data) {
      console.info(options.data);
    }
    
    this.writeToFile('info', formattedMessage, undefined, options?.data);
  }

  warn(message: string, options?: LogOptions): void {
    const formattedMessage = formatMessage('warn', message, options);
    console.warn(formattedMessage);
    
    if (options?.data) {
      console.warn(options.data);
    }
    
    this.writeToFile('warn', formattedMessage, undefined, options?.data);
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
    
    this.writeToFile('error', formattedMessage, error, options?.data);
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

    // Always write specialized logs to their own file in development
    if (!this.isProduction) {
      try {
        const logFilePath = path.join(this.debugDir, `${category}.log`);
        const timestamp = new Date().toISOString();
        const logEntry = [
          `[${timestamp}] ${message}`,
          error ? `\nError: ${error.message}\nStack: ${error.stack}` : '',
          details ? `\nDetails: ${JSON.stringify(details, null, 2)}` : '',
          '\n---\n'
        ].join('');
        
        fs.appendFileSync(logFilePath, logEntry);
      } catch (err) {
        console.error(`Failed to write to ${category} log file:`, err);
      }
    }
  }
}

// For server-side use
export const serverLogger = new ServerLogger(); 