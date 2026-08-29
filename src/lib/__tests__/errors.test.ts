/**
 * Unit tests for error handling utilities
 */
import { describe, it, expect } from "vitest";
import {
  AppError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  handleSupabaseError,
  getUserErrorMessage,
} from "../errors";

describe("Error Classes", () => {
  describe("AppError", () => {
    it("should create an error with code and status", () => {
      const error = new AppError("Test error", "TEST_ERROR", 400);
      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("AppError");
    });

    it("should accept optional details", () => {
      const details = { field: "email" };
      const error = new AppError("Test error", "TEST_ERROR", 400, details);
      expect(error.details).toEqual(details);
    });
  });

  describe("NetworkError", () => {
    it("should create a network error with default message", () => {
      const error = new NetworkError();
      expect(error.code).toBe("NETWORK_ERROR");
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe("Network error occurred");
    });

    it("should accept custom message", () => {
      const error = new NetworkError("Custom network error");
      expect(error.message).toBe("Custom network error");
    });
  });

  describe("ValidationError", () => {
    it("should create a validation error", () => {
      const error = new ValidationError("Invalid input");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
    });
  });

  describe("AuthenticationError", () => {
    it("should create an authentication error", () => {
      const error = new AuthenticationError("Invalid credentials");
      expect(error.code).toBe("AUTHENTICATION_ERROR");
      expect(error.statusCode).toBe(401);
    });
  });

  describe("AuthorizationError", () => {
    it("should create an authorization error", () => {
      const error = new AuthorizationError("Access denied");
      expect(error.code).toBe("AUTHORIZATION_ERROR");
      expect(error.statusCode).toBe(403);
    });
  });

  describe("NotFoundError", () => {
    it("should create a not found error", () => {
      const error = new NotFoundError("Resource not found");
      expect(error.code).toBe("NOT_FOUND_ERROR");
      expect(error.statusCode).toBe(404);
    });
  });

  describe("ConflictError", () => {
    it("should create a conflict error", () => {
      const error = new ConflictError("Duplicate entry");
      expect(error.code).toBe("CONFLICT_ERROR");
      expect(error.statusCode).toBe(409);
    });
  });

  describe("RateLimitError", () => {
    it("should create a rate limit error", () => {
      const error = new RateLimitError("Too many requests");
      expect(error.code).toBe("RATE_LIMIT_ERROR");
      expect(error.statusCode).toBe(429);
    });
  });
});

describe("handleSupabaseError", () => {
  it("should handle unique violation error (23505)", () => {
    const error = { code: "23505", message: "duplicate key value" };
    const result = handleSupabaseError(error);
    expect(result).toBeInstanceOf(ConflictError);
    expect(result.message).toContain("already exists");
  });

  it("should handle foreign key violation error (23503)", () => {
    const error = { code: "23503", message: "foreign key violation" };
    const result = handleSupabaseError(error);
    expect(result).toBeInstanceOf(ValidationError);
  });

  it("should handle not null violation error (23502)", () => {
    const error = { code: "23502", message: "null value violation" };
    const result = handleSupabaseError(error);
    expect(result).toBeInstanceOf(ValidationError);
  });

  it("should handle not found error (PGRST116)", () => {
    const error = { code: "PGRST116", message: "not found" };
    const result = handleSupabaseError(error);
    expect(result).toBeInstanceOf(NotFoundError);
  });

  it("should handle unauthorized error (PGRST301)", () => {
    const error = { code: "PGRST301", message: "unauthorized" };
    const result = handleSupabaseError(error);
    expect(result).toBeInstanceOf(AuthenticationError);
  });

  it("should handle 401 status", () => {
    const error = { status: 401, message: "unauthorized" };
    const result = handleSupabaseError(error);
    expect(result).toBeInstanceOf(AuthenticationError);
  });

  it("should handle 403 status", () => {
    const error = { status: 403, message: "forbidden" };
    const result = handleSupabaseError(error);
    expect(result).toBeInstanceOf(AuthenticationError);
  });

  it("should handle 404 status", () => {
    const error = { status: 404, message: "not found" };
    const result = handleSupabaseError(error);
    expect(result).toBeInstanceOf(NotFoundError);
  });

  it("should handle 409 status", () => {
    const error = { status: 409, message: "conflict" };
    const result = handleSupabaseError(error);
    expect(result).toBeInstanceOf(ConflictError);
  });

  it("should handle 400 status", () => {
    const error = { status: 400, message: "bad request" };
    const result = handleSupabaseError(error);
    expect(result).toBeInstanceOf(ValidationError);
  });

  it("should default to network error for unknown errors", () => {
    const error = { message: "unknown error" };
    const result = handleSupabaseError(error);
    expect(result).toBeInstanceOf(NetworkError);
  });

  it("should handle null error", () => {
    const result = handleSupabaseError(null);
    expect(result).toBeInstanceOf(NetworkError);
    expect(result.message).toBe("Unknown error occurred");
  });
});

describe("getUserErrorMessage", () => {
  it("should return user-friendly message for network error", () => {
    const error = new NetworkError();
    const message = getUserErrorMessage(error);
    expect(message).toContain("internet connection");
  });

  it("should return user-friendly message for validation error", () => {
    const error = new ValidationError("Invalid email");
    const message = getUserErrorMessage(error);
    expect(message).toBe("Invalid email"); // Returns custom message
  });

  it("should return user-friendly message for authentication error", () => {
    const error = new AuthenticationError();
    const message = getUserErrorMessage(error);
    expect(message).toContain("log in");
  });

  it("should return user-friendly message for authorization error", () => {
    const error = new AuthorizationError();
    const message = getUserErrorMessage(error);
    expect(message).toContain("permission");
  });

  it("should return user-friendly message for not found error", () => {
    const error = new NotFoundError();
    const message = getUserErrorMessage(error);
    expect(message).toContain("not found");
  });

  it("should return user-friendly message for conflict error", () => {
    const error = new ConflictError("Duplicate email");
    const message = getUserErrorMessage(error);
    expect(message).toBe("Duplicate email"); // Returns custom message
  });

  it("should return user-friendly message for rate limit error", () => {
    const error = new RateLimitError();
    const message = getUserErrorMessage(error);
    expect(message).toContain("Too many requests");
  });

  it("should return generic message for unknown error", () => {
    const error = new Error("Unknown error");
    const message = getUserErrorMessage(error);
    expect(message).toContain("unexpected error");
  });

  it("should return custom message for validation error", () => {
    const error = new ValidationError("Email is required");
    const message = getUserErrorMessage(error);
    expect(message).toBe("Email is required");
  });
});
