/**
 * Custom error classes for API error handling
 */

// Base API error class
export class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

// 400 Bad Request
export class BadRequestError extends ApiError {
  constructor(message = 'Bad request') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

// 401 Unauthorized
export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

// 403 Forbidden
export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

// 404 Not Found
export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

// 409 Conflict
export class ConflictError extends ApiError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

// 422 Unprocessable Entity
export class ValidationError extends ApiError {
  errors?: Record<string, string[]>;
  
  constructor(message = 'Validation failed', errors?: Record<string, string[]>) {
    super(message, 422);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// 429 Too Many Requests
export class RateLimitError extends ApiError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

// 500 Internal Server Error
export class InternalServerError extends ApiError {
  constructor(message = 'Internal server error') {
    super(message, 500);
    this.name = 'InternalServerError';
  }
}

// Helper function to handle API errors
export function handleApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new ApiError(error.message);
  }
  
  return new ApiError('Unknown error occurred');
}

// Helper function to format error responses
export function formatErrorResponse(error: unknown) {
  const apiError = handleApiError(error);
  
  return {
    error: {
      message: apiError.message,
      statusCode: apiError.statusCode,
      name: apiError.name,
      ...(apiError instanceof ValidationError && apiError.errors 
        ? { errors: apiError.errors } 
        : {})
    }
  };
} 