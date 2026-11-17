import { Cache } from "../cache/cache.js";
import { ImageResizer } from "../image-resizer/image-resizer.js";
import { ImageStorage } from "../image-storage/image-storage.js";
import type { ImageIdUpload, StoredImage } from "../types/images.js";
import { ImageAssetService } from "./image-asset-service.js";
import { ImageAssetServiceTestDataFactory } from "./image-asset-service.testdata.js";

class FakeImageStorage extends ImageStorage {
  protected uploadImageImpl(): Promise<void> {
    throw new Error(
      "uploadImageImpl should not be called directly in this test.",
    );
  }

  protected downloadImageImpl(): Promise<StoredImage> {
    throw new Error(
      "downloadImageImpl should not be called directly in this test.",
    );
  }

  protected existsImpl(): Promise<boolean> {
    throw new Error("existsImpl should not be called directly in this test.");
  }

  protected listStorageContent(): Promise<ImageIdUpload[]> {
    throw new Error(
      "listStorageContent should not be called directly in this test.",
    );
  }
}

function createImageResizer(): ImageResizer {
  return new ImageResizer({ url: "https://resize.invalid", apiKey: "unused" });
}

function createImageStorage(): FakeImageStorage {
  return new FakeImageStorage(new Cache<string, Buffer<ArrayBufferLike>>());
}

describe("ImageAssetService", () => {
  describe("upload", () => {
    const testData = new ImageAssetServiceTestDataFactory();

    it.each([
      testData.desktop_main_resizes_to_688x384(),
      testData.desktop_preview_resizes_to_320x180(),
      testData.desktop_original_resizes_to_688x384(),
      testData.mobile_main_resizes_to_688x384(),
      testData.mobile_preview_resizes_to_320x180(),
      testData.mobile_original_resizes_to_688x384(),
    ])("$name", async ({ imageType, expectedResizeOptions }) => {
      const imageResizer = createImageResizer();
      const imageStorage = createImageStorage();
      const resizeImageSpy = jest
        .spyOn(imageResizer, "resizeImage")
        .mockResolvedValue(Buffer.from("resized-bytes"));
      jest.spyOn(imageStorage, "exists").mockResolvedValue(false);
      const uploadImageSpy = jest
        .spyOn(imageStorage, "uploadImage")
        .mockResolvedValue(undefined);
      const service = new ImageAssetService(imageResizer, imageStorage, [
        imageType,
      ]);
      const originalImage = Buffer.from("original-bytes");
      const filename = "banner.png";

      await service.upload(originalImage, filename);

      const expectedParams = { ...imageType, filename };
      expect(resizeImageSpy).toHaveBeenCalledWith(
        new Uint8Array(originalImage),
        expectedResizeOptions,
      );
      expect(uploadImageSpy).toHaveBeenCalledWith(
        Buffer.from("resized-bytes"),
        expectedParams,
      );
    });

    it("skips image types that already exist in storage", async () => {
      const imageResizer = createImageResizer();
      const imageStorage = createImageStorage();
      const resizeImageSpy = jest
        .spyOn(imageResizer, "resizeImage")
        .mockResolvedValue(Buffer.from("resized-bytes"));
      const uploadImageSpy = jest
        .spyOn(imageStorage, "uploadImage")
        .mockResolvedValue(undefined);
      jest
        .spyOn(imageStorage, "exists")
        .mockImplementation((params) =>
          Promise.resolve(params.scale === "PREVIEW"),
        );
      const service = new ImageAssetService(imageResizer, imageStorage, [
        {
          type: "DESKTOP",
          scale: "MAIN",
          format: "png",
          height: 320,
          width: 688,
        },
        {
          type: "DESKTOP",
          scale: "PREVIEW",
          format: "png",
          height: 320,
          width: 688,
        },
      ]);
      const originalImage = Buffer.from("original-bytes");

      await service.upload(originalImage, "banner.png");

      expect(resizeImageSpy).toHaveBeenCalledTimes(1);
      expect(uploadImageSpy).toHaveBeenCalledTimes(1);
      expect(uploadImageSpy).toHaveBeenCalledWith(
        Buffer.from("resized-bytes"),
        {
          type: "DESKTOP",
          scale: "MAIN",
          format: "png",
          height: 320,
          width: 688,
          filename: "banner.png",
        },
      );
    });
  });

  describe("download", () => {
    it("delegates to the image storage and returns its result", async () => {
      const imageResizer = createImageResizer();
      const imageStorage = createImageStorage();
      const storedImage: StoredImage = {
        image: Buffer.from("stored-bytes"),
        fileName: "banner.png",
      };
      const downloadImageSpy = jest
        .spyOn(imageStorage, "downloadImage")
        .mockResolvedValue(storedImage);
      const service = new ImageAssetService(imageResizer, imageStorage, []);
      const params: ImageIdUpload = {
        type: "DESKTOP",
        scale: "MAIN",
        filename: "banner.png",
        format: "png",
      };

      const result = await service.download(params);

      expect(downloadImageSpy).toHaveBeenCalledWith(params);
      expect(result).toEqual(storedImage);
    });
  });
});
