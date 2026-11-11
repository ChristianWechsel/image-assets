import { Cache } from "./cache.js";

describe("Cache", () => {
  describe("get", () => {
    it("returns undefined for a key that was never set", () => {
      const cache = new Cache<string, number>();

      expect(cache.get("missing")).toBeUndefined();
    });

    it("returns the value previously stored under the given key", () => {
      const cache = new Cache<string, number>();
      cache.set("width", 42);

      expect(cache.get("width")).toBe(42);
    });
  });

  describe("set", () => {
    it("overwrites the value stored under an existing key", () => {
      const cache = new Cache<string, number>();
      cache.set("width", 42);
      cache.set("width", 99);

      expect(cache.get("width")).toBe(99);
    });

    it("keeps values of different keys independent from each other", () => {
      const cache = new Cache<string, number>();
      cache.set("width", 42);
      cache.set("height", 24);

      expect(cache.get("width")).toBe(42);
      expect(cache.get("height")).toBe(24);
    });
  });

  describe("has", () => {
    it("returns false for a key that was never set", () => {
      const cache = new Cache<string, number>();

      expect(cache.has("missing")).toBe(false);
    });

    it("returns true for a key that was set", () => {
      const cache = new Cache<string, number>();
      cache.set("width", 42);

      expect(cache.has("width")).toBe(true);
    });
  });
});
