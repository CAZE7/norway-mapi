import { describe, it, expect } from "vitest";
import { auroraVisibleAt } from "./weather";

describe("auroraVisibleAt", () => {
  it("should require 0.5 Kp for latitudes >= 67", () => {
    // Exactly 67
    expect(auroraVisibleAt(67, 0)).toEqual({ visible: false, needed: 0.5 });
    expect(auroraVisibleAt(67, 0.5)).toEqual({ visible: true, needed: 0.5 });
    expect(auroraVisibleAt(67, 1)).toEqual({ visible: true, needed: 0.5 });

    // Above 67 (e.g., 70)
    expect(auroraVisibleAt(70, 0)).toEqual({ visible: false, needed: 0.5 });
    expect(auroraVisibleAt(70, 0.5)).toEqual({ visible: true, needed: 0.5 });
  });

  it("should calculate correct required Kp for latitudes < 67", () => {
    // 65 lat -> needed = (67 - 65) / 2 = 1
    expect(auroraVisibleAt(65, 0.5)).toEqual({ visible: false, needed: 1 });
    expect(auroraVisibleAt(65, 1)).toEqual({ visible: true, needed: 1 });

    // 59 lat -> needed = (67 - 59) / 2 = 4
    expect(auroraVisibleAt(59, 3)).toEqual({ visible: false, needed: 4 });
    expect(auroraVisibleAt(59, 4)).toEqual({ visible: true, needed: 4 });
    expect(auroraVisibleAt(59, 5)).toEqual({ visible: true, needed: 4 });

    // 50 lat -> needed = (67 - 50) / 2 = 8.5
    expect(auroraVisibleAt(50, 8)).toEqual({ visible: false, needed: 8.5 });
    expect(auroraVisibleAt(50, 8.5)).toEqual({ visible: true, needed: 8.5 });
    expect(auroraVisibleAt(50, 9)).toEqual({ visible: true, needed: 8.5 });
  });
});
