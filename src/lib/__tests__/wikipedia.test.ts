import { describe, it, expect, vi } from "vitest";

vi.mock("@/data/image-cache.json", () => ({
  default: {
    oslo: {
      name: "Oslo",
      has_image: true,
      verified: true,
      url: "https://example.com/oslo.jpg",
      page: "https://example.com/oslo",
      license: "CC-BY",
      attribution_required: true,
    },
    bergen: {
      name: "Bergen",
      has_image: false,
      verified: false,
    },
    trondheim: {
      name: "Trondheim",
      has_image: true,
      verified: false,
    },
    stavanger: {
      name: "Stavanger",
      has_image: true,
      verified: true,
      thumbnail: "https://example.com/stavanger_thumb.jpg",
    },
  },
}));

import { checkLocalCache } from "../wikipedia";

describe("checkLocalCache", () => {
  it("should return hit: false for unknown places", () => {
    const result = checkLocalCache("Unknown Place");
    expect(result.hit).toBe(false);
    expect(result.value).toBeNull();
  });

  it("should return valid image object for verified places with an image", () => {
    const result = checkLocalCache("Oslo");
    expect(result.hit).toBe(true);
    expect(result.value).toEqual({
      thumbnail: "https://example.com/oslo.jpg",
      original: "https://example.com/oslo.jpg",
      pageUrl: "https://example.com/oslo",
      title: "Oslo",
      extract: "",
      lang: "commons",
      license: "CC-BY",
      source: "commons",
      attribution_required: true,
      verified: true,
    });
  });

  it("should use thumbnail if url is missing", () => {
    const result = checkLocalCache("Stavanger");
    expect(result.hit).toBe(true);
    expect(result.value).toMatchObject({
      thumbnail: "https://example.com/stavanger_thumb.jpg",
      original: "https://example.com/stavanger_thumb.jpg",
    });
  });

  it("should return hit: true and null value for places missing an image", () => {
    const result = checkLocalCache("Bergen");
    expect(result.hit).toBe(true);
    expect(result.value).toBeNull();
  });

  it("should return hit: true and null value for places with an image but not verified", () => {
    const result = checkLocalCache("Trondheim");
    expect(result.hit).toBe(true);
    expect(result.value).toBeNull();
  });

  it("should match by aliases when the primary name is unknown", () => {
    const result = checkLocalCache("Unknown Place", ["Oslo", "Bergen"]);
    expect(result.hit).toBe(true);
    expect(result.value?.title).toBe("Oslo");
  });

  it("should support case-insensitivity for finding cache entries", () => {
    const result = checkLocalCache("oSlO");
    expect(result.hit).toBe(true);
    expect(result.value?.title).toBe("Oslo");
  });
});
