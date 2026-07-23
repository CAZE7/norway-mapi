import { describe, it, expect } from "vitest";
import { googleMapsRoute } from "./nav-links";

describe("googleMapsRoute", () => {
  it("returns null if less than 2 stops are provided", () => {
    expect(googleMapsRoute([])).toBeNull();
    expect(googleMapsRoute([{ lat: 1, lng: 2 }])).toBeNull();
  });

  it("generates a URL with origin and destination for exactly 2 stops", () => {
    const stops = [
      { lat: 10, lng: 10 },
      { lat: 20, lng: 20 },
    ];
    const url = googleMapsRoute(stops);
    expect(url).not.toBeNull();
    const urlObj = new URL(url!);
    expect(urlObj.searchParams.get("origin")).toBe("10,10");
    expect(urlObj.searchParams.get("destination")).toBe("20,20");
    expect(urlObj.searchParams.has("waypoints")).toBe(false);
  });

  it("includes waypoints if more than 2 stops are provided", () => {
    const stops = [
      { lat: 10, lng: 10 },
      { lat: 15, lng: 15 },
      { lat: 20, lng: 20 },
    ];
    const url = googleMapsRoute(stops);
    expect(url).not.toBeNull();
    const urlObj = new URL(url!);
    expect(urlObj.searchParams.get("origin")).toBe("10,10");
    expect(urlObj.searchParams.get("destination")).toBe("20,20");
    expect(urlObj.searchParams.get("waypoints")).toBe("15,15");
  });

  it("handles exactly 9 waypoints (11 stops total)", () => {
    const stops = Array.from({ length: 11 }, (_, i) => ({
      lat: i,
      lng: i,
    }));
    const url = googleMapsRoute(stops);
    expect(url).not.toBeNull();
    const urlObj = new URL(url!);
    expect(urlObj.searchParams.get("origin")).toBe("0,0");
    expect(urlObj.searchParams.get("destination")).toBe("10,10");
    const waypoints = urlObj.searchParams.get("waypoints");
    expect(waypoints).not.toBeNull();
    const waypointParts = waypoints!.split("|");
    expect(waypointParts).toHaveLength(9);
    expect(waypointParts[0]).toBe("1,1");
    expect(waypointParts[8]).toBe("9,9");
  });

  it("truncates to maximum 9 waypoints if more than 11 stops are provided", () => {
    const stops = Array.from({ length: 15 }, (_, i) => ({
      lat: i,
      lng: i,
    }));
    const url = googleMapsRoute(stops);
    expect(url).not.toBeNull();
    const urlObj = new URL(url!);
    expect(urlObj.searchParams.get("origin")).toBe("0,0");
    expect(urlObj.searchParams.get("destination")).toBe("14,14");
    const waypoints = urlObj.searchParams.get("waypoints");
    expect(waypoints).not.toBeNull();
    const waypointParts = waypoints!.split("|");
    expect(waypointParts).toHaveLength(9);
    expect(waypointParts[0]).toBe("1,1");
    expect(waypointParts[8]).toBe("9,9");
  });
});
