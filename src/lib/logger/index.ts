'use client';

import { LogLevel, LogOptions, ILogger } from './types';
import { BrowserLogger } from './browser-logger';

// Simple client-side logger
export const logger: ILogger = new BrowserLogger(); 