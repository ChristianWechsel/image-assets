import { existsSync, lstatSync, mkdirSync, readdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { Cache } from "../cache/cache.js";
import type { ImageIdUpload } from "../types/images.js";
import { ImageStorageDisk } from "./image-storage-disk.js";
import {
  createFakeStats,
  ImageStorageDiskTestDataFactory,
} from "./image-storage-disk.testdata.js";

jest.mock("fs");
jest.mock("fs/promises");
jest.mock("../cache/cache.js");

// readdirSync's last overload collapses to a Dirent-only return type; narrow it to the single signature actually used.
const mockReaddirSync = jest.mocked<(path: string) => string[]>(readdirSync);

describe("ImageStorageDisk", () => {
  const folder = "/images";
  const params: ImageIdUpload = {
    type: "DESKTOP",
    scale: "MAIN",
    filename: "banner.png",
    format: "png",
  };
  let cache: Cache<string, Buffer<ArrayBufferLike>>;

  beforeEach(() => {
    jest.mocked(existsSync).mockReset();
    jest.mocked(lstatSync).mockReset();
    mockReaddirSync.mockReset();
    jest.mocked(mkdirSync).mockReset();
    jest.mocked(readFile).mockReset();
    jest.mocked(writeFile).mockReset();
    cache = new Cache<string, Buffer<ArrayBufferLike>>();
  });

  describe("constructor", () => {
    it("creates the root storage folder recursively", () => {
      new ImageStorageDisk(cache, folder);

      expect(jest.mocked(mkdirSync)).toHaveBeenCalledWith(folder, {
        recursive: true,
      });
    });
  });

  describe("uploadImage", () => {
    it("creates the type/scale folder if it does not exist yet and writes the image", async () => {
      jest.mocked(existsSync).mockReturnValue(false);
      jest.mocked(writeFile).mockResolvedValue(undefined);
      const storage = new ImageStorageDisk(cache, folder);
      jest.mocked(mkdirSync).mockClear();
      const image = Buffer.from("png-bytes");

      await storage.uploadImage(image, params);

      const expectedFolder = join(folder, "DESKTOP", "MAIN");
      expect(jest.mocked(mkdirSync)).toHaveBeenCalledWith(expectedFolder, {
        recursive: true,
      });
      expect(jest.mocked(writeFile)).toHaveBeenCalledWith(
        join(expectedFolder, "banner.png"),
        image,
      );
    });

    it("renames file to resized image type", async () => {
      jest.mocked(existsSync).mockReturnValue(true);
      jest.mocked(writeFile).mockResolvedValue(undefined);
      jest.mocked(mkdirSync).mockClear();

      const storage = new ImageStorageDisk(cache, folder);
      const image = Buffer.from("png-bytes");

      await storage.uploadImage(image, {
        type: "DESKTOP",
        scale: "MAIN",
        filename: "banner.png",
        format: "avif",
      });

      expect(jest.mocked(writeFile)).toHaveBeenCalledWith(
        join(join(folder, "DESKTOP", "MAIN"), "banner.avif"),
        image,
      );
    });

    it.todo(
      "cache arbeitet mit getPath=> hat das Auswirkung auf rename des filenames?",
    );

    it("does not recreate the type/scale folder if it already exists", async () => {
      jest.mocked(existsSync).mockReturnValue(true);
      jest.mocked(writeFile).mockResolvedValue(undefined);
      const storage = new ImageStorageDisk(cache, folder);
      jest.mocked(mkdirSync).mockClear();
      const image = Buffer.from("png-bytes");

      await storage.uploadImage(image, params);

      expect(jest.mocked(mkdirSync)).not.toHaveBeenCalled();
    });

    it("caches the uploaded image under its storage path", async () => {
      jest.mocked(existsSync).mockReturnValue(true);
      jest.mocked(writeFile).mockResolvedValue(undefined);
      const storage = new ImageStorageDisk(cache, folder);
      const image = Buffer.from("png-bytes");

      await storage.uploadImage(image, params);

      expect(jest.mocked(cache.set)).toHaveBeenCalledWith(
        "/DESKTOP/MAIN/banner.png",
        image,
      );
    });
  });

  describe("downloadImage", () => {
    it("returns the cached image without reading from disk when present in the cache", async () => {
      const cachedImage = Buffer.from("cached-bytes");
      jest.mocked(cache.get).mockReturnValue(cachedImage);
      const storage = new ImageStorageDisk(cache, folder);

      const result = await storage.downloadImage(params);

      expect(result).toEqual({ image: cachedImage, fileName: "banner.png" });
      expect(jest.mocked(readFile)).not.toHaveBeenCalled();
    });

    it("reads the image from disk and caches it when not present in the cache", async () => {
      const diskImage = Buffer.from("disk-bytes");
      jest.mocked(cache.get).mockReturnValue(undefined);
      jest.mocked(readFile).mockResolvedValue(diskImage);
      const storage = new ImageStorageDisk(cache, folder);

      const result = await storage.downloadImage(params);

      expect(jest.mocked(readFile)).toHaveBeenCalledWith(
        join(folder, "DESKTOP", "MAIN", "banner.png"),
      );
      expect(result).toEqual({ image: diskImage, fileName: "banner.png" });
      expect(jest.mocked(cache.set)).toHaveBeenCalledWith(
        "/DESKTOP/MAIN/banner.png",
        diskImage,
      );
    });
  });

  describe("exists", () => {
    it("returns true without checking disk when the path is cached", async () => {
      jest.mocked(cache.has).mockReturnValue(true);
      const storage = new ImageStorageDisk(cache, folder);

      const result = await storage.exists(params);

      expect(result).toBe(true);
      expect(jest.mocked(existsSync)).not.toHaveBeenCalled();
    });

    it("delegates to the filesystem when the path is not cached", async () => {
      jest.mocked(cache.has).mockReturnValue(false);
      jest.mocked(existsSync).mockReturnValue(true);
      const storage = new ImageStorageDisk(cache, folder);

      const result = await storage.exists(params);

      expect(result).toBe(true);
      expect(jest.mocked(existsSync)).toHaveBeenCalledWith(
        join(folder, "DESKTOP", "MAIN", "banner.png"),
      );
    });

    it("returns false when the filesystem reports no such file", async () => {
      jest.mocked(cache.has).mockReturnValue(false);
      jest.mocked(existsSync).mockReturnValue(false);
      const storage = new ImageStorageDisk(cache, folder);

      const result = await storage.exists(params);

      expect(result).toBe(false);
    });
  });

  describe("initCache", () => {
    it("parses the on-disk folder structure and downloads every discovered image into the cache", async () => {
      const fixture =
        new ImageStorageDiskTestDataFactory().deviceImageDirectoryTree(folder);
      jest.mocked(cache.get).mockReturnValue(undefined);
      jest.mocked(readFile).mockResolvedValue(Buffer.from("disk-bytes"));
      mockReaddirSync.mockImplementation((path) => {
        const entries = fixture.listingByPath.get(path);
        if (!entries) {
          throw new Error(`Unexpected readdirSync call for path: ${path}`);
        }
        return entries.map((entry) => entry.name);
      });
      jest.mocked(lstatSync).mockImplementation((path) => {
        const isDirectory = fixture.isDirectoryByPath.get(path.toString());
        if (isDirectory === undefined) {
          throw new Error(
            `Unexpected lstatSync call for path: ${path.toString()}`,
          );
        }
        return createFakeStats(isDirectory);
      });
      const storage = new ImageStorageDisk(cache, folder);

      await storage.initCache();

      for (const entry of fixture.expectedParsedEntries) {
        expect(jest.mocked(cache.set)).toHaveBeenCalledWith(
          `/${entry.type}/${entry.scale}/${entry.filename}`,
          Buffer.from("disk-bytes"),
        );
      }
      expect(jest.mocked(cache.set)).toHaveBeenCalledTimes(
        fixture.expectedParsedEntries.length,
      );
    });
  });
});
