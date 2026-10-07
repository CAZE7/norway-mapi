import { describe, it, expect } from "vitest";
import { googleMapsRoute, navLinksFor } from "./nav-links";

describe("navLinksFor", () => {
  it("returns exactly 6 navigation links", () => {
    const links = navLinksFor(50, 10, "Test Location");
    expect(links).toHaveLength(6);
    const expectedLabels = [
      "Google Maps",
      "Apple Maps",
      "Waze",
      "Organic Maps",
      "OpenStreetMap",
      "geo:",
    ];
    expect(links.map((l) => l.label)).toEqual(expectedLabels);
  });

  it("interpolates positive and negative coordinates correctly", () => {
    const links = navLinksFor(52.520008, -13.404954, "Berlin");

    // Check Google Maps
    const gmaps = links.find((l) => l.label === "Google Maps");
    expect(gmaps?.href).toContain("destination=52.520008,-13.404954");

    // Check OpenStreetMap (which uses different param names)
    const osm = links.find((l) => l.label === "OpenStreetMap");
    expect(osm?.href).toContain("mlat=52.520008&mlon=-13.404954");
    expect(osm?.href).toContain("#map=13/52.520008/-13.404954");
  });

  it("correctly URI encodes the name parameter", () => {
    const links = navLinksFor(10, 20, "Café & Bar (Test)");
    const encodedName = encodeURIComponent("Café & Bar (Test)");

    // Check Google Maps
    const gmaps = links.find((l) => l.label === "Google Maps");
    expect(gmaps?.href).toContain(`destination_place_id=${encodedName}`);

    // Check Apple Maps
    const amaps = links.find((l) => l.label === "Apple Maps");
    expect(amaps?.href).toContain(`q=${encodedName}`);
  });
});

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
