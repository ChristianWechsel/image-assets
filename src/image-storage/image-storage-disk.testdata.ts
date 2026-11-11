import type { Stats } from "fs";
import { join } from "path";
import type { ImageParams } from "../types/images.js";

export type DirectoryEntry = { name: string; isDirectory: boolean };

export type ParsedListingEntry = Pick<ImageParams, "type" | "scale" | "filename">;

export type ImageStorageDiskDirectoryFixture = {
  rootFolder: string;
  listingByPath: Map<string, DirectoryEntry[]>;
  isDirectoryByPath: Map<string, boolean>;
  expectedParsedEntries: ParsedListingEntry[];
};

export function createFakeStats(isDirectory: boolean): Stats {
  const epoch = new Date(0);
  return {
    isFile: () => !isDirectory,
    isDirectory: () => isDirectory,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    dev: 0,
    ino: 0,
    mode: 0,
    nlink: 0,
    uid: 0,
    gid: 0,
    rdev: 0,
    size: 0,
    blksize: 0,
    blocks: 0,
    atimeMs: 0,
    mtimeMs: 0,
    ctimeMs: 0,
    birthtimeMs: 0,
    atime: epoch,
    mtime: epoch,
    ctime: epoch,
    birthtime: epoch,
    atimeInstant: undefined,
    mtimeInstant: undefined,
    ctimeInstant: undefined,
    birthtimeInstant: undefined,
  };
}

export class ImageStorageDiskTestDataFactory {
  deviceImageDirectoryTree(rootFolder: string): ImageStorageDiskDirectoryFixture {
    const desktopDir = join(rootFolder, "DESKTOP");
    const desktopMainDir = join(desktopDir, "MAIN");
    const desktopPreviewDir = join(desktopDir, "PREVIEW");
    const mobileDir = join(rootFolder, "MOBILE");
    const mobileOriginalDir = join(mobileDir, "ORIGINAL");

    const listingByPath = new Map<string, DirectoryEntry[]>([
      [
        rootFolder,
        [
          { name: "DESKTOP", isDirectory: true },
          { name: "MOBILE", isDirectory: true },
          { name: "notes.txt", isDirectory: false },
        ],
      ],
      [
        desktopDir,
        [
          { name: "MAIN", isDirectory: true },
          { name: "PREVIEW", isDirectory: true },
        ],
      ],
      [desktopMainDir, [{ name: "banner.png", isDirectory: false }]],
      [desktopPreviewDir, [{ name: "banner.png", isDirectory: false }]],
      [mobileDir, [{ name: "ORIGINAL", isDirectory: true }]],
      [mobileOriginalDir, [{ name: "photo.jpeg", isDirectory: false }]],
    ]);

    const isDirectoryByPath = new Map<string, boolean>([
      [desktopDir, true],
      [desktopMainDir, true],
      [desktopPreviewDir, true],
      [mobileDir, true],
      [mobileOriginalDir, true],
      [join(rootFolder, "notes.txt"), false],
      [join(desktopMainDir, "banner.png"), false],
      [join(desktopPreviewDir, "banner.png"), false],
      [join(mobileOriginalDir, "photo.jpeg"), false],
    ]);

    const expectedParsedEntries: ParsedListingEntry[] = [
      { type: "DESKTOP", scale: "MAIN", filename: "banner.png" },
      { type: "DESKTOP", scale: "PREVIEW", filename: "banner.png" },
      { type: "MOBILE", scale: "ORIGINAL", filename: "photo.jpeg" },
    ];

    return { rootFolder, listingByPath, isDirectoryByPath, expectedParsedEntries };
  }
}
