import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useIsMobile } from "../use-mobile";

const MOBILE_BREAKPOINT = 768;

describe("useIsMobile", () => {
  let addEventListenerSpy: any;
  let removeEventListenerSpy: any;

  beforeEach(() => {
    addEventListenerSpy = vi.fn();
    removeEventListenerSpy = vi.fn();

    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when initial window width is below breakpoint", () => {
    vi.stubGlobal("innerWidth", 500);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
    vi.unstubAllGlobals();
  });

  it("returns false when initial window width is above or equal to breakpoint", () => {
    vi.stubGlobal("innerWidth", 1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    vi.unstubAllGlobals();
  });

  it("updates state correctly when media query triggers change event", () => {
    vi.stubGlobal("innerWidth", 1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate resizing window and triggering change event
    vi.stubGlobal("innerWidth", 500);
    act(() => {
      // The onChange function registered with addEventListener ignores the Event object
      // and relies on window.innerWidth
      const changeHandler = addEventListenerSpy.mock.calls[0][1];
      changeHandler(new Event("change"));
    });

    expect(result.current).toBe(true);
    vi.unstubAllGlobals();
  });

  it("cleans up event listener on unmount", () => {
    const { unmount } = renderHook(() => useIsMobile());
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
