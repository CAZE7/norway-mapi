import { expect, test, describe } from "vitest";
import { formatDuration, formatKm } from "./route-optimize";

describe("formatKm", () => {
  test("formats values less than 10 km with one decimal place", () => {
    expect(formatKm(0)).toBe("0.0 km");
    expect(formatKm(5)).toBe("5.0 km");
    expect(formatKm(5.123)).toBe("5.1 km");
    expect(formatKm(9.99)).toBe("10.0 km");
  });

  test("formats values 10 km or greater as integers with de-DE locale", () => {
    expect(formatKm(10)).toBe("10 km");
    expect(formatKm(10.4)).toBe("10 km");
    expect(formatKm(10.5)).toBe("11 km");
    expect(formatKm(1234.5)).toBe("1.235 km");
    expect(formatKm(1000000)).toBe("1.000.000 km");
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
