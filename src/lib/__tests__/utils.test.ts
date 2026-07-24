import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn utility", () => {
  it("merges simple classes", () => {
    expect(cn("class1", "class2")).toBe("class1 class2");
  });

  it("handles conditional classes", () => {
    expect(cn("class1", { class2: true, class3: false })).toBe("class1 class2");
  });

  it("merges tailwind classes correctly", () => {
    // p-2 and p-4 conflict, twMerge should keep the latter
    expect(cn("p-2", "p-4")).toBe("p-4");
    // text-red-500 and text-blue-500 conflict
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles arrays of classes", () => {
    expect(cn(["class1", "class2"], "class3")).toBe("class1 class2 class3");
  });

  it("handles falsy values gracefully", () => {
    expect(cn("class1", null, undefined, false, 0, "")).toBe("class1");
  });

  it("handles complex combinations", () => {
    expect(
      cn(
        "base-class p-2",
        { "text-white": true, "text-black": false },
        ["flex", "items-center"],
        "p-4", // Overrides p-2
      ),
    ).toBe("base-class text-white flex items-center p-4");
  });
});
