/**
 * Tests for the client-side login rate limiter.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isLockedOut,
  getRemainingLockoutSeconds,
  recordFailedAttempt,
  resetAttempts,
  attemptsRemaining,
} from "../loginRateLimit";

beforeEach(() => {
  localStorage.clear();
});

describe("loginRateLimit", () => {
  it("starts with 5 attempts remaining and not locked out", () => {
    expect(attemptsRemaining()).toBe(5);
    expect(isLockedOut()).toBe(false);
    expect(getRemainingLockoutSeconds()).toBe(0);
  });

  it("decrements attempts remaining on each failure", () => {
    recordFailedAttempt();
    expect(attemptsRemaining()).toBe(4);
    recordFailedAttempt();
    expect(attemptsRemaining()).toBe(3);
  });

  it("locks out after 5 failed attempts", () => {
    for (let i = 0; i < 4; i++) {
      expect(recordFailedAttempt()).toBe(false);
    }
    // 5th attempt triggers lockout
    expect(recordFailedAttempt()).toBe(true);
    expect(isLockedOut()).toBe(true);
    expect(attemptsRemaining()).toBe(0);
    expect(getRemainingLockoutSeconds()).toBeGreaterThan(0);
  });

  it("resets on successful login", () => {
    recordFailedAttempt();
    recordFailedAttempt();
    expect(attemptsRemaining()).toBe(3);

    resetAttempts();
    expect(attemptsRemaining()).toBe(5);
    expect(isLockedOut()).toBe(false);
  });

  it("unlocks after lockout duration expires", () => {
    // Lock out
    for (let i = 0; i < 5; i++) recordFailedAttempt();
    expect(isLockedOut()).toBe(true);

    // Simulate time passing by manipulating localStorage directly
    const state = JSON.parse(localStorage.getItem("login_rate_limit")!);
    state.lockedUntil = Date.now() - 1000; // expired 1s ago
    localStorage.setItem("login_rate_limit", JSON.stringify(state));

    expect(isLockedOut()).toBe(false);
    expect(attemptsRemaining()).toBe(5); // fully reset
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("login_rate_limit", "not-json");
    expect(attemptsRemaining()).toBe(5);
    expect(isLockedOut()).toBe(false);
  });
});
