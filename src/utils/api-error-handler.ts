import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger/index' // Automatically selects appropriate logger;

export class ApiError extends Error {
  readonly statusCode: number;
  readonly details?: any;

  constructor(message: string, statusCode = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', details?: any) {
    super(message, 400, details);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', details?: any) {
    super(message, 401, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', details?: any) {
    super(message, 403, details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Not Found', details?: any) {
    super(message, 404, details);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ApiError {
  constructor(message = 'Validation Error', details?: any) {
    super(message, 422, details);
    this.name = 'ValidationError';
  }
}

export interface ApiErrorResponse {
  error: {
    message: string;
    code: string;
    details?: any;
  };
}

/**
 * Handles API errors and returns an appropriate response
 */
export function handleApiError(
  error: unknown,
  req?: NextRequest
): NextResponse<ApiErrorResponse> {
  // Default to internal server error
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'internal_server_error';
  let details: any = undefined;

  // Process the error
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.name.replace('Error', '').toLowerCase();
    details = error.details;
  } else if (error instanceof Error) {
    message = error.message;
  }

  // Log the error (with different levels based on status code)
  const logData = {
    context: 'API',
    data: {
      url: req?.url,
      method: req?.method,
      statusCode,
      details,
    },
  };

  if (statusCode >= 500) {
    logger.error(`API Error: ${message}`, error instanceof Error ? error : undefined, logData);
  } else if (statusCode >= 400) {
    logger.warn(`API Error: ${message}`, logData);
  }

  // Create and return the error response
  return NextResponse.json(
    {
      error: {
        message,
        code,
        ...(details && { details }),
      },
    },
    { status: statusCode }
  );
}

/**
 * Higher-order function for wrapping API route handlers with error handling
 */
export function withErrorHandling<T>(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      return handleApiError(error, req);
    }
  };
} 