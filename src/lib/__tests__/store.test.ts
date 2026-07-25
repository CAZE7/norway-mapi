import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../store";

describe("useAppStore toggleCategory", () => {
  beforeEach(() => {
    // Reset state before each test
    useAppStore.setState({ categories: [] });
  });

  it("adds a category when it is not present in the list", () => {
    expect(useAppStore.getState().categories).toEqual([]);

    useAppStore.getState().toggleCategory("natur");

    expect(useAppStore.getState().categories).toEqual(["natur"]);
  });

  it("removes a category when it is already in the list", () => {
    useAppStore.setState({ categories: ["natur", "kultur"] });
    expect(useAppStore.getState().categories).toEqual(["natur", "kultur"]);

    useAppStore.getState().toggleCategory("natur");

    expect(useAppStore.getState().categories).toEqual(["kultur"]);
  });

  it("handles multiple toggles correctly", () => {
    expect(useAppStore.getState().categories).toEqual([]);

    useAppStore.getState().toggleCategory("natur");
    expect(useAppStore.getState().categories).toEqual(["natur"]);

    useAppStore.getState().toggleCategory("kultur");
    expect(useAppStore.getState().categories).toEqual(["natur", "kultur"]);

    useAppStore.getState().toggleCategory("natur");
    expect(useAppStore.getState().categories).toEqual(["kultur"]);
  });
});
