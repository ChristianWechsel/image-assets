import type { ImageResizer } from "../image-resizer/image-resizer.js";
import type { ImageStorage } from "../image-storage/image-storage.js";
import type {
  ImageDefinition,
  ImageId,
  ImageProperties,
  StoredImage,
} from "../types/images.js";

export class ImageAssetService {
  constructor(
    private imageResizer: ImageResizer,
    private imageStorage: ImageStorage,
    private readonly imageDefinitions: ImageDefinition[],
  ) {}

  upload(image: Buffer, originalName: string): Promise<void> {
    return Promise.all(
      this.imageDefinitions
        .map((imageDefinition) => {
          return {
            imageParam: {
              ...imageDefinition,
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

  download(params: ImageId): Promise<StoredImage> {
    return this.imageStorage.downloadImage(params);
  }

  private factoryResizeImage(
    params: ImageDefinition,
  ): (image: Buffer) => Promise<Buffer> {
    return (image: Buffer) =>
      this.resizeImage(image, {
        width: params.width,
        height: params.height,
        format: params.format,
      });
  }

  private resizeImage(
    image: Buffer,
    options: ImageProperties,
  ): Promise<Buffer> {
    return this.imageResizer.resizeImage(new Uint8Array(image), options);
  }
}
