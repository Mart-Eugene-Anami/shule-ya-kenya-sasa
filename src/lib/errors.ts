/**
 * Custom Error Classes for Better Error Handling
 * 
 * Provides structured error types for different error scenarios:
 * - NetworkError: API/Network failures
 * - ValidationError: Input validation failures
 * - AuthenticationError: Auth-related failures
 * - AuthorizationError: Permission-related failures
 * - NotFoundError: Resource not found
 * - ConflictError: Resource conflicts (duplicate, etc.)
 * - RateLimitError: Rate limiting exceeded
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NetworkError extends AppError {
  constructor(message: string = "Network error occurred", details?: any) {
    super(message, "NETWORK_ERROR", 503, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed", details?: any) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed", details?: any) {
    super(message, "AUTHENTICATION_ERROR", 401, details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Authorization failed", details?: any) {
    super(message, "AUTHORIZATION_ERROR", 403, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found", details?: any) {
    super(message, "NOT_FOUND_ERROR", 404, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict", details?: any) {
    super(message, "CONFLICT_ERROR", 409, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded", details?: any) {
    super(message, "RATE_LIMIT_ERROR", 429, details);
  }
}

/**
 * Utility function to handle Supabase errors and convert to AppError
 */
export function handleSupabaseError(error: any): AppError {
  if (!error) return new NetworkError("Unknown error occurred");

  const message = error.message || "An error occurred";
  const code = error.code;
  const status = error.status;

  // Handle specific Supabase error codes
  switch (code) {
    case '23505': // Unique violation
      return new ConflictError("A record with this information already exists", { originalError: error });
    case '23503': // Foreign key violation
      return new ValidationError("Referenced record does not exist", { originalError: error });
    case '23502': // Not null violation
      return new ValidationError("Required field is missing", { originalError: error });
    case 'PGRST116': // Not found
      return new NotFoundError("Resource not found", { originalError: error });
    case 'PGRST301': // Unauthorized
      return new AuthenticationError("Authentication required", { originalError: error });
  }

  // Handle by HTTP status
  if (status === 401 || status === 403) {
    return new AuthenticationError(message, { originalError: error });
  }
  if (status === 404) {
    return new NotFoundError(message, { originalError: error });
  }
  if (status === 409) {
    return new ConflictError(message, { originalError: error });
  }
  if (status === 400) {
    return new ValidationError(message, { originalError: error });
  }

  // Default to network error
  return new NetworkError(message, { originalError: error });
}

/**
 * Utility function to get user-friendly error message
 */
export function getUserErrorMessage(error: AppError | Error): string {
  if (error instanceof AppError) {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return "Unable to connect to the server. Please check your internet connection.";
      case 'VALIDATION_ERROR':
        return error.message || "Please check your input and try again.";
      case 'AUTHENTICATION_ERROR':
        return "Please log in to continue.";
      case 'AUTHORIZATION_ERROR':
        return "You don't have permission to perform this action.";
      case 'NOT_FOUND_ERROR':
        return "The requested resource was not found.";
      case 'CONFLICT_ERROR':
        return error.message || "This action conflicts with existing data.";
      case 'RATE_LIMIT_ERROR':
        return "Too many requests. Please wait and try again.";
      default:
        return error.message || "An unexpected error occurred.";
    }
  }
  return "An unexpected error occurred. Please try again.";
}
