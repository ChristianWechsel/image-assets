import type {
  ImageResizer,
  ImageSizeProperties,
} from "../image-resizer/image-resizer.js";
import type { ImageStorage } from "../image-storage/image-storage.js";
import type {
  DeviceImageType,
  ImageParams,
  StoredImage,
} from "../types/images.js";

export class ImageAssetService {
  constructor(
    private imageResizer: ImageResizer,
    private imageStorage: ImageStorage,
    private readonly imageTypes: DeviceImageType[],
  ) {}

  upload(image: Buffer, originalName: string): Promise<void> {
    return Promise.all(
      this.imageTypes
        .map((imageType) => {
          return {
            imageParam: {
              ...imageType,
              filename: originalName,
            },
          };
        })
        .map(({ imageParam }) => {
          return this.imageStorage.exists(imageParam).then((exists) => {
            return { exists, imageParam };
          });
        }),
    )
      .then((exits) => {
        return Promise.all(
          exits
            .filter(({ exists }) => {
              return !exists;
            })
            .map(({ imageParam }) => {
              return this.factoryResizeImage(imageParam)(image).then(
                (resizedImage) => {
                  return this.imageStorage.uploadImage(
                    resizedImage,
                    imageParam,
                  );
                },
              );
            }),
        );
      })
      .then(() => {});
  }

  download(params: ImageParams): Promise<StoredImage> {
    return this.imageStorage.downloadImage(params);
  }

  private factoryResizeImage(
    params: ImageParams,
  ): (image: Buffer) => Promise<Buffer> {
    let func: (image: Buffer) => Promise<Buffer> = (image: Buffer) =>
      Promise.resolve(image);

    if (params.type === "DESKTOP") {
      switch (params.scale) {
        case "MAIN":
          func = (image: Buffer) => {
            return this.resizeImage(image, {
              width: 688,
              height: 384,
              format: params.format,
            });
          };
          break;
        case "PREVIEW":
          func = (image: Buffer) => {
            return this.resizeImage(image, {
              width: 320,
              height: 180,
              format: params.format,
            });
          };
          break;
      }
    } else if (params.type === "MOBILE") {
    }

    return func;
  }

  private resizeImage(
    image: Buffer,
    options: ImageSizeProperties,
  ): Promise<Buffer> {
    return this.imageResizer.resizeImage(new Uint8Array(image), options);
  }
}
