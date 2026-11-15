# @christian-wechsel/image-assets

TypeScript service for resizing, storing, caching, and retrieving image assets.

`image-assets` orchestrates image handling for an application: it decides which device/scale variants of an image need to exist, resizes them via a pluggable `ImageResizer`, and persists them through a pluggable `ImageStorage` backend with an in-memory cache in front of it.

---

## Features

- **Variant-based uploads**: Define a set of `ImageDefinition`s (e.g. `DESKTOP`/`MAIN`, `DESKTOP`/`PREVIEW`), each with its own target `width`/`height`/`format`, and let `ImageAssetService` resize and store all required variants from a single uploaded image.
- **Skip redundant work**: Before resizing, the service checks whether a variant already exists in storage and skips it if so.
- **Pluggable storage**: `ImageStorage` is an abstract base class with built-in in-memory caching (reads and existence checks hit the cache first). Ships with a disk-based implementation (`ImageStorageDisk`); implement your own for GCS, S3, etc.
- **Pluggable resizing**: `ImageResizer` delegates the actual resizing work to an HTTP service (see [Image Resizer prerequisite](#prerequisite-image-resizer-service) below).
- **ESM / TypeScript**: Ships as compiled ESM with type declarations.

---

## Installation

```shell
npm install @christian-wechsel/image-assets
```

---

## Prerequisite: Image Resizer Service

`ImageAssetService` does not resize images itself. It delegates this work over HTTP to an `ImageResizer`, which expects a running service that exposes a `POST /resize` endpoint:

- Request: `POST {url}/resize?width={width}&height={height}&format={png|jpeg}`, with header `Authorization: Bearer {apiKey}` and the raw image bytes as the request body.
- Response: the resized image as binary data.

You need to deploy such a service yourself, for example as a **Google Cloud Run** service. You can use [`image-resizer`](https://github.com/ChristianWechsel/image-resizer) for this — it implements exactly this contract using [`sharp`](https://www.npmjs.com/package/sharp).

> **Note:** `image-resizer` is **not published on npm**. It is only available as source on GitHub: https://github.com/ChristianWechsel/image-resizer.git. Clone it, build it (`npm run build-prod`), and deploy it yourself (e.g. to Cloud Run) or implement a compatible service of your own.

---

## Usage

```typescript
import {
  ImageAssetService,
  ImageResizer,
  ImageStorageDisk,
  Cache,
  type ImageDefinition,
} from "@christian-wechsel/image-assets";

// 1. Configure the resizer client (points at your deployed image-resizer service)
const imageResizer = new ImageResizer({
  url: "https://<your-image-resizer-cloud-run-url>",
  apiKey: "<api-key>",
});

// 2. Configure a storage backend (disk is built-in; implement ImageStorage for others)
const cache = new Cache<string, Buffer>();
const imageStorage = new ImageStorageDisk(cache, "./uploads");

// 3. Define the variants that should be generated for every uploaded image, each resized to its own target size
const imageTypes: ImageDefinition[] = [
  { type: "DESKTOP", scale: "MAIN", format: "png", width: 688, height: 384 },
  { type: "DESKTOP", scale: "PREVIEW", format: "png", width: 320, height: 180 },
];

const imageAssetService = new ImageAssetService(
  imageResizer,
  imageStorage,
  imageTypes,
);

// Upload an image; missing variants are resized and stored automatically
await imageAssetService.upload(imageBuffer, "photo.png");

// Download a specific variant (served from cache if available)
const { image, fileName } = await imageAssetService.download({
  type: "DESKTOP",
  scale: "MAIN",
  filename: "photo.png",
});
```

---

## API

| Export | Description |
| :--- | :--- |
| `ImageAssetService` | Orchestrates upload (resize + store missing variants) and download of image variants. |
| `ImageResizer` | HTTP client that calls an external image resizing service (see [prerequisite](#prerequisite-image-resizer-service)). |
| `ImageStorage` | Abstract base class for storage backends, with built-in caching. Extend it to support custom backends. |
| `ImageStorageDisk` | File-system-based `ImageStorage` implementation. |
| `Cache` | Simple in-memory key/value cache used in front of storage reads. |
| `ImageDefinition`, `ImageId`, `StoredImage` | Types describing image variants and stored results. |

### Image variants

Each variant passed to `ImageAssetService` is described by an `ImageDefinition`:

- `type`: `"DESKTOP"` \| `"MOBILE"`
- `scale`: `"ORIGINAL"` \| `"MAIN"` \| `"PREVIEW"`
- `format`: `"png"` \| `"jpeg"`
- `width`, `height`: the target dimensions for this variant

Every variant is resized to its configured `width`/`height`/`format`, regardless of `type` or `scale`.

### Implementing a custom `ImageStorage`

Extend `ImageStorage` and implement the four protected hooks:

```typescript
class MyStorage extends ImageStorage {
  protected uploadImageImpl(image: Buffer, params: ImageId): Promise<void> { ... }
  protected downloadImageImpl(params: ImageId): Promise<StoredImage> { ... }
  protected existsImpl(params: ImageId): Promise<boolean> { ... }
  protected listStorageContent(): Promise<ImageId[]> { ... }
}
```

`ImageStorage` takes care of caching reads/existence checks and writing through to the cache on upload.

---

## License

[MIT](LICENSE)
