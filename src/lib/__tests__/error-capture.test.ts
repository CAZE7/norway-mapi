import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { consumeLastCapturedError } from "../error-capture";

describe("error-capture", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Ensure initial state is clean. consumeLastCapturedError should return undefined.
    // However, it does read lastCapturedError, which is a module-level variable.
    // If it holds an error, we consume it to clear the state.
    while (consumeLastCapturedError() !== undefined) {
      // clear any leftover error
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns undefined when no error is captured", () => {
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("captures and consumes an error from an ErrorEvent", () => {
    const error = new Error("Test error");
    const event = new ErrorEvent("error", { error });
    globalThis.dispatchEvent(event);

    const capturedError = consumeLastCapturedError();
    expect(capturedError).toBe(error);

    // Consuming a second time should return undefined
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("captures and consumes an error from an ErrorEvent with no error property but fallback to event itself", () => {
    // If event.error is undefined, it records the event itself
    const event = new ErrorEvent("error");
    globalThis.dispatchEvent(event);

    const capturedError = consumeLastCapturedError();
    expect(capturedError).toBe(event);
  });

  it("captures and consumes an error from a PromiseRejectionEvent", () => {
    const reason = new Error("Test rejection reason");
    // Some environments don't have PromiseRejectionEvent constructor or we can mock it
    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, 'reason', { value: reason });
    globalThis.dispatchEvent(event);

    const capturedError = consumeLastCapturedError();
    expect(capturedError).toBe(reason);
  });

  it("returns undefined and drops the error if TTL is exceeded", () => {
    const error = new Error("Expired error");
    const event = new ErrorEvent("error", { error });
    globalThis.dispatchEvent(event);

    // Advance time by 5001ms (TTL_MS is 5000)
    vi.advanceTimersByTime(5001);

    const capturedError = consumeLastCapturedError();
    expect(capturedError).toBeUndefined();

    // The internal state should also be cleared, further calls are undefined
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("returns the error if TTL is not exceeded", () => {
    const error = new Error("Valid error");
    const event = new ErrorEvent("error", { error });
    globalThis.dispatchEvent(event);

    // Advance time by 4999ms (TTL_MS is 5000)
    vi.advanceTimersByTime(4999);

    const capturedError = consumeLastCapturedError();
    expect(capturedError).toBe(error);
  });
});
