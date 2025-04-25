type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  level: LogLevel;
  prefix?: string;
  enableConsole?: boolean;
}

/**
 * Simple logging utility with level-based filtering
 */
class Logger {
  private level: LogLevel;
  private prefix: string;
  private enableConsole: boolean;
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  constructor(options: LoggerOptions) {
    this.level = options.level || 'info';
    this.prefix = options.prefix || 'SOP-Maker';
    this.enableConsole = options.enableConsole !== false;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.enableConsole && this.levels[level] >= this.levels[this.level];
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    return `[${this.prefix}] [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  /**
   * Create a child logger with a different prefix
   */
  child(prefix: string): Logger {
    return new Logger({
      level: this.level,
      prefix: `${this.prefix}:${prefix}`,
      enableConsole: this.enableConsole
    });
  }

  /**
   * Set the logging level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

// Get environment-appropriate log level
const getDefaultLogLevel = (): LogLevel => {
  if (typeof window === 'undefined') {
    // Server-side
    return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  } else {
    // Client-side
    return process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
  }
};

// Create default logger instance
export const logger = new Logger({ 
  level: getDefaultLogLevel(),
  prefix: 'SOP-Maker'
});

export default logger; 