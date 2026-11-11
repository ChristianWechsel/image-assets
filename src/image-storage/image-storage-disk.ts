import { existsSync, lstatSync, mkdirSync, readdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { Cache } from "../cache/cache.js";
import {
  isImageParams,
  isImageScale,
  isImageType,
  type ImageParams,
  type StoredImage,
} from "../types/images.js";
import { ImageStorage } from "./image-storage.js";

export class ImageStorageDisk extends ImageStorage {
  constructor(
    cache: Cache<string, Buffer<ArrayBufferLike>>,
    private folder: string,
  ) {
    super(cache);
    mkdirSync(this.folder, { recursive: true });
  }

  protected uploadImageImpl(
    image: Buffer<ArrayBufferLike>,
    params: ImageParams,
  ): Promise<void> {
    const pathFolder = this.getFolderPath(params);
    this.createFolderIfNotExists(pathFolder);
    const pathImage = this.getImagePath(pathFolder, params.filename);
    return writeFile(pathImage, image);
  }

  protected downloadImageImpl(params: ImageParams): Promise<StoredImage> {
    const pathFolder = this.getFolderPath(params);
    const pathImage = this.getImagePath(pathFolder, params.filename);
    return readFile(pathImage).then((image) => ({
      image,
      fileName: params.filename,
    }));
  }

  protected listStorageContent(): Promise<ImageParams[]> {
    return Promise.resolve(this.readDir(this.folder));
  }

  protected existsImpl(params: ImageParams): Promise<boolean> {
    const pathFolder = this.getFolderPath(params);
    const pathImage = this.getImagePath(pathFolder, params.filename);
    return Promise.resolve(existsSync(pathImage));
  }

  private getFolderPath(params: ImageParams): string {
    return join(this.folder, params.type, params.scale);
  }

  private createFolderIfNotExists(path: string): void {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
  }

  private getImagePath(folder: string, filename: string): string {
    return join(folder, filename);
  }

  private readDir(
    path: string,
    parent: Partial<ImageParams> = {},
  ): ImageParams[] {
    const items: ImageParams[] = [];
    const folderContent = readdirSync(path);

    for (const item of folderContent) {
      const itemPath = join(path, item);

      const stat = lstatSync(itemPath);
      const isDirectory = stat.isDirectory();
      const isFile = stat.isFile();

      if (isDirectory) {
        if (isImageType(item)) {
          parent.type = item;
        }
        if (isImageScale(item)) {
          parent.scale = item;
        }
        items.push(...this.readDir(itemPath, { ...parent }));
      }
      if (isFile) {
        parent.filename = item;
        if (isImageParams(parent)) {
          items.push({ ...parent });
        }
      }
    }
    return items;
  }
}
