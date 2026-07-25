import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { saveCustomToStorage } from "../store";
import { CUSTOM_STORAGE_KEY, type Place } from "@/data/places";

describe("saveCustomToStorage", () => {
  const mockPlaces: Place[] = [
    {
      id: "1",
      name: "Test Place",
      region: "Test Region",
      category: "Test Category",
      description: "A test description",
      lat: 60.1,
      lng: 10.1,
      tier: "geheimtipp",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should save the list to localStorage", () => {
    const setItemSpy = vi.spyOn(window.localStorage, "setItem");

    saveCustomToStorage(mockPlaces);

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(setItemSpy).toHaveBeenCalledWith(CUSTOM_STORAGE_KEY, JSON.stringify(mockPlaces));
  });

  it("should gracefully handle quota exceeded error", () => {
    const setItemSpy = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    expect(() => saveCustomToStorage(mockPlaces)).not.toThrow();
    expect(setItemSpy).toHaveBeenCalledTimes(1);
  });

  it("should safely do nothing if window is undefined", () => {
    vi.stubGlobal("window", undefined);

    expect(() => saveCustomToStorage(mockPlaces)).not.toThrow();
  });
});
