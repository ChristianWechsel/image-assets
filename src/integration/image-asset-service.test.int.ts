import { existsSync, lstatSync, mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { Cache } from "../cache/cache.js";
import { ImageResizer } from "../image-resizer/image-resizer.js";
import { ImageStorageDisk } from "../image-storage/image-storage-disk.js";
import { ImageAssetService } from "../service/image-asset-service.js";

jest.mock("fs");
jest.mock("fs/promises");

// writeFile/readFile's last overload collapses to string|NonSharedBuffer; narrow to the single signature actually used.
const mockWriteFile =
  jest.mocked<(path: string, data: Buffer) => Promise<void>>(writeFile);
const mockReadFile = jest.mocked<(path: string) => Promise<Buffer>>(readFile);

function textToArrayBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

describe("ImageAssetService integration", () => {
  const folder = "/images";
  let originalFetch: typeof global.fetch;
  const writtenFiles = new Map<string, Buffer>();

  beforeEach(() => {
    originalFetch = global.fetch;
    writtenFiles.clear();
    jest
      .mocked(existsSync)
      .mockImplementation((path) => writtenFiles.has(path.toString()));
    jest.mocked(mkdirSync).mockReturnValue(undefined);
    jest.mocked(lstatSync).mockImplementation(() => {
      throw new Error("initCache is not exercised in this integration test.");
    });
    mockWriteFile.mockImplementation((path, data) => {
      writtenFiles.set(path, data);
      return Promise.resolve();
    });
    mockReadFile.mockImplementation((path) => {
      const content = writtenFiles.get(path);
      if (!content) {
        return Promise.reject(new Error(`No such file: ${path}`));
      }
      return Promise.resolve(content);
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("resize desktop and mobile images", async () => {
    const fetchMock = jest.fn();
    fetchMock.mockResolvedValue({
      arrayBuffer: () =>
        Promise.resolve(textToArrayBuffer("resized-main-image")),
    });
    global.fetch = fetchMock;

    const resizer = new ImageResizer({
      url: "https://resize.invalid",
      apiKey: "integration-test-key",
    });
    const storage = new ImageStorageDisk(
      new Cache<string, Buffer<ArrayBufferLike>>(),
      folder,
    );
    const service = new ImageAssetService(resizer, storage, [
      {
        type: "DESKTOP",
        scale: "MAIN",
        format: "png",
        height: 320,
        width: 688,
      },
      {
        type: "MOBILE",
        scale: "MAIN",
        format: "jpeg",
        height: 169,
        width: 344,
      },
    ]);
    const originalImage = Buffer.from("original-bytes");

    await service.upload(originalImage, "banner.png");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://resize.invalid/resize?width=688&height=320&format=png",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://resize.invalid/resize?width=344&height=169&format=jpeg",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("resizes missing device image types through the resize API and stores them on disk", async () => {
    const fetchMock = jest.fn();
    fetchMock.mockResolvedValue({
      arrayBuffer: () =>
        Promise.resolve(textToArrayBuffer("resized-main-image")),
    });
    global.fetch = fetchMock;

    const resizer = new ImageResizer({
      url: "https://resize.invalid",
      apiKey: "integration-test-key",
    });
    const storage = new ImageStorageDisk(
      new Cache<string, Buffer<ArrayBufferLike>>(),
      folder,
    );
    const service = new ImageAssetService(resizer, storage, [
      {
        type: "DESKTOP",
        scale: "MAIN",
        format: "png",
        height: 320,
        width: 688,
      },
    ]);
    const originalImage = Buffer.from("original-bytes");

    await service.upload(originalImage, "banner.png");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const expectedPath = join(folder, "DESKTOP", "MAIN", "banner.png");
    expect(writtenFiles.get(expectedPath)).toEqual(
      Buffer.from("resized-main-image"),
    );

    const downloaded = await service.download({
      type: "DESKTOP",
      scale: "MAIN",
      filename: "banner.png",
    });

    expect(downloaded).toEqual({
      image: Buffer.from("resized-main-image"),
      fileName: "banner.png",
    });
  });

  it("does not call the resize API again for a device image type that already exists", async () => {
    const expectedPath = join(folder, "DESKTOP", "MAIN", "banner.png");
    writtenFiles.set(expectedPath, Buffer.from("already-stored-image"));
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    const resizer = new ImageResizer({
      url: "https://resize.invalid",
      apiKey: "integration-test-key",
    });
    const storage = new ImageStorageDisk(
      new Cache<string, Buffer<ArrayBufferLike>>(),
      folder,
    );
    const service = new ImageAssetService(resizer, storage, [
      {
        type: "DESKTOP",
        scale: "MAIN",
        format: "png",
        height: 320,
        width: 688,
      },
    ]);

    await service.upload(Buffer.from("original-bytes"), "banner.png");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
