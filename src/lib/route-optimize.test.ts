import { expect, test, describe } from "vitest";
import { formatDuration, estimateTimes } from "./route-optimize";

describe("estimateTimes", () => {
  test("calculates times correctly for 0 km", () => {
    const result = estimateTimes(0);
    expect(result.roadKm).toBe(0);
    expect(result.driveMinutes).toBe(0);
    expect(result.walkMinutes).toBe(0);
  });

  test("calculates times correctly for 10 km", () => {
    const result = estimateTimes(10);
    expect(result.roadKm).toBeCloseTo(13);
    expect(result.driveMinutes).toBeCloseTo(12);
    expect(result.walkMinutes).toBeCloseTo(162.5);
  });

  test("calculates times correctly for 100 km", () => {
    const result = estimateTimes(100);
    expect(result.roadKm).toBeCloseTo(130);
    expect(result.driveMinutes).toBeCloseTo(120);
    expect(result.walkMinutes).toBeCloseTo(1625);
  });
});

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
