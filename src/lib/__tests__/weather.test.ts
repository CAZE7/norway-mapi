import { describe, it, expect } from "vitest";
import { symbolEmoji } from "../weather";

describe("symbolEmoji", () => {
  it("returns ⛈️ for thunder", () => {
    expect(symbolEmoji("thunder")).toBe("⛈️");
    expect(symbolEmoji("THUNDERstorm")).toBe("⛈️");
  });

  it("returns 🌨️ for snow and sleet", () => {
    expect(symbolEmoji("snow")).toBe("🌨️");
    expect(symbolEmoji("sleet")).toBe("🌨️");
    expect(symbolEmoji("heavysnow")).toBe("🌨️");
  });

  it("returns 🌧️ for rain", () => {
    expect(symbolEmoji("rain")).toBe("🌧️");
    expect(symbolEmoji("lightRain")).toBe("🌧️");
  });

  it("returns 🌫️ for fog", () => {
    expect(symbolEmoji("fog")).toBe("🌫️");
  });

  it("returns ☀️ for clearsky", () => {
    expect(symbolEmoji("clearsky")).toBe("☀️");
    expect(symbolEmoji("clearsky_day")).toBe("☀️");
  });

  it("returns 🌤️ for fair", () => {
    expect(symbolEmoji("fair")).toBe("🌤️");
  });

  it("returns ⛅ for partlycloudy", () => {
    expect(symbolEmoji("partlycloudy")).toBe("⛅");
    expect(symbolEmoji("partlycloudy_night")).toBe("⛅");
  });

  it("returns ☁️ for cloudy", () => {
    expect(symbolEmoji("cloudy")).toBe("☁️");
  });

  it("returns 🌡️ as a fallback for unknown symbols", () => {
    expect(symbolEmoji("unknown")).toBe("🌡️");
    expect(symbolEmoji("")).toBe("🌡️");
    expect(symbolEmoji("random_string")).toBe("🌡️");
  });
});
