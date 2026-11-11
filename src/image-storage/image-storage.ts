import type { Cache } from "../cache/cache.js";
import { type ImageParams, type StoredImage } from "../types/images.js";

export abstract class ImageStorage {
  constructor(private cache: Cache<string, Buffer<ArrayBufferLike>>) {}

  uploadImage(
    image: Buffer<ArrayBufferLike>,
    params: ImageParams,
  ): Promise<void> {
    return this.uploadImageImpl(image, params).then(() => {
      this.cache.set(this.getPath(params), image);
    });
  }

  downloadImage(params: ImageParams): Promise<StoredImage> {
    const path = this.getPath(params);
    const cached = this.cache.get(path);
    if (cached) {
      return Promise.resolve({ image: cached, fileName: params.filename });
    }
    return this.downloadImageImpl(params).then((storedImage) => {
      this.cache.set(path, storedImage.image);
      return storedImage;
    });
  }

  initCache(): Promise<void> {
    return this.listStorageContent().then((items) => {
      return Promise.allSettled(
        items.map((item) => this.downloadImage(item)),
      ).then(() => {});
    });
  }

  exists(params: ImageParams): Promise<boolean> {
    if (this.cache.has(this.getPath(params))) {
      return Promise.resolve(true);
    }
    return this.existsImpl(params);
  }

  protected abstract uploadImageImpl(
    image: Buffer<ArrayBufferLike>,
    params: ImageParams,
  ): Promise<void>;

  protected abstract downloadImageImpl(
    params: ImageParams,
  ): Promise<StoredImage>;

  protected abstract existsImpl(params: ImageParams): Promise<boolean>;

  protected abstract listStorageContent(): Promise<ImageParams[]>;

  protected getPath(params: ImageParams): string {
    return `/${params.type}/${params.scale}/${params.filename}`;
  }
}
