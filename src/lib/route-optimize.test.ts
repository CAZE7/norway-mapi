import { expect, test, describe } from "bun:test";
import { formatDuration } from "./route-optimize";

describe("formatDuration", () => {
  test("handles invalid or non-positive values", () => {
    expect(formatDuration(-10)).toBe("–");
    expect(formatDuration(0)).toBe("–");
    expect(formatDuration(NaN)).toBe("–");
    expect(formatDuration(Infinity)).toBe("–");
    expect(formatDuration(-Infinity)).toBe("–");
  });

  test("formats minutes correctly (less than 60)", () => {
    expect(formatDuration(1)).toBe("1 min");
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(59)).toBe("59 min");
    expect(formatDuration(59.4)).toBe("59 min");
  });

  test("formats hours and minutes correctly (between 1 and 24 hours)", () => {
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(90)).toBe("1 h 30 min");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(125)).toBe("2 h 5 min");
    expect(formatDuration(1439)).toBe("23 h 59 min");
  });

  test("formats days and hours correctly (24 hours or more)", () => {
    expect(formatDuration(1440)).toBe("1 T"); // exactly 24 hours
    expect(formatDuration(1500)).toBe("1 T 1 h"); // 25 hours
    expect(formatDuration(2880)).toBe("2 T"); // exactly 48 hours
    expect(formatDuration(2940)).toBe("2 T 1 h"); // 49 hours
  });
});
