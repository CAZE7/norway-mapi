import { expect, test, describe } from "vitest";
import { formatDuration, optimizeOrder, type Stop } from "./route-optimize";

describe("optimizeOrder", () => {
  test("returns original array for 0, 1, or 2 stops", () => {
    const stops0: Stop[] = [];
    const stops1: Stop[] = [{ id: "A", lat: 0, lng: 0 }];
    const stops2: Stop[] = [
      { id: "A", lat: 0, lng: 0 },
      { id: "B", lat: 1, lng: 1 },
    ];

    expect(optimizeOrder(stops0)).toEqual(stops0);
    expect(optimizeOrder(stops0)).not.toBe(stops0); // Should return a copy

    expect(optimizeOrder(stops1)).toEqual(stops1);
    expect(optimizeOrder(stops1)).not.toBe(stops1);

    expect(optimizeOrder(stops2)).toEqual(stops2);
    expect(optimizeOrder(stops2)).not.toBe(stops2);
  });

  test("optimizes 3 stops using nearest neighbor, keeping first stop as anchor", () => {
    const stops: Stop[] = [
      { id: "A", lat: 0, lng: 0 }, // Anchor
      { id: "B", lat: 0, lng: 2 }, // Furthest from A
      { id: "C", lat: 0, lng: 1 }, // Closer to A
    ];

    const optimized = optimizeOrder(stops);

    expect(optimized.length).toBe(3);
    // Should go A -> C -> B
    expect(optimized[0].id).toBe("A");
    expect(optimized[1].id).toBe("C");
    expect(optimized[2].id).toBe("B");
  });

  test("optimizes 4+ stops (nearest-neighbor + 2-opt)", () => {
    // A square: A (0,0), B (0,10), C (10,10), D (10,0)
    // If order is A -> C -> B -> D (crossing diagonals), 2-opt should untangle it
    const stops: Stop[] = [
      { id: "A", lat: 0, lng: 0 },
      { id: "C", lat: 10, lng: 10 },
      { id: "B", lat: 0, lng: 10 },
      { id: "D", lat: 10, lng: 0 },
    ];

    const optimized = optimizeOrder(stops);

    expect(optimized.length).toBe(4);
    expect(optimized[0].id).toBe("A"); // Anchor must be A

    // Check it contains exactly all original stops
    const originalIds = stops.map(s => s.id).sort();
    const optimizedIds = optimized.map(s => s.id).sort();
    expect(optimizedIds).toEqual(originalIds);

    // An optimized un-crossed path from A(0,0) could be:
    // A(0,0) -> B(0,10) -> C(10,10) -> D(10,0)
    // or A(0,0) -> D(10,0) -> C(10,10) -> B(0,10)
    // Both avoid crossing. Nearest neighbor starting from A will pick B or D.
    // Let's just check we don't have crossing (e.g. A->C).
    // Note: Due to nearest neighbor A(0,0) -> B(0,10) or D(10,0).
    // The closest from A is B or D (dist ~1111km). C is further (~1572km).
    expect(["B", "D"]).toContain(optimized[1].id);
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
