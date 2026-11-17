import { existsSync, lstatSync, mkdirSync, readdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { Cache } from "../cache/cache.js";
import {
  isImageId,
  isImageScale,
  isImageType,
  type ImageIdUpload,
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
    params: ImageIdUpload,
  ): Promise<void> {
    const pathFolder = this.getFolderPath(params);
    this.createFolderIfNotExists(pathFolder);
    const pathImage = this.getImagePath(pathFolder, params);
    return writeFile(pathImage, image);
  }

  protected downloadImageImpl(params: ImageIdUpload): Promise<StoredImage> {
    const pathFolder = this.getFolderPath(params);
    const pathImage = this.getImagePath(pathFolder, params);
    return readFile(pathImage).then((image) => ({
      image,
      fileName: params.filename,
    }));
  }

  protected listStorageContent(): Promise<ImageIdUpload[]> {
    return Promise.resolve(this.readDir(this.folder));
  }

  protected existsImpl(params: ImageIdUpload): Promise<boolean> {
    const pathFolder = this.getFolderPath(params);
    const pathImage = this.getImagePath(pathFolder, params);
    return Promise.resolve(existsSync(pathImage));
  }

  private getFolderPath(params: Omit<ImageIdUpload, "filename">): string {
    return join(this.folder, params.type, params.scale);
  }

  private createFolderIfNotExists(path: string): void {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
  }

  private getImagePath(
    folder: string,
    params: Pick<ImageIdUpload, "filename" | "format">,
  ): string {
    const [file] = params.filename.split(".");
    return join(folder, file + "." + params.format);
  }

  private readDir(
    path: string,
    parent: Partial<ImageIdUpload> = {},
  ): ImageIdUpload[] {
    const items: ImageIdUpload[] = [];
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
        if (isImageId(parent)) {
          items.push({ ...parent });
        }
      }
    }
    return items;
  }
}
