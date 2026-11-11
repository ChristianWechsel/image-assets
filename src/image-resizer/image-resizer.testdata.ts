import type { ImageSizeProperties } from "./image-resizer.js";

export type ImageResizerTestData = {
  name: string;
  resizerOptions: { url: string; apiKey: string };
  sizeProperties: ImageSizeProperties;
  expectedUrl: string;
  responseText: string;
};

export class ImageResizerTestDataFactory {
  png_with_simple_base_url(): ImageResizerTestData {
    return {
      name: "png_with_simple_base_url",
      resizerOptions: {
        url: "https://resize.example.com",
        apiKey: "secret-api-key",
      },
      sizeProperties: { width: 320, height: 180, format: "png" },
      expectedUrl:
        "https://resize.example.com/resize?width=320&height=180&format=png",
      responseText: "resized-png-binary-data",
    };
  }

  jpeg_with_base_url_containing_subpath(): ImageResizerTestData {
    return {
      name: "jpeg_with_base_url_containing_subpath",
      resizerOptions: {
        url: "https://cdn.example.com/legacy/path",
        apiKey: "another-key",
      },
      sizeProperties: { width: 688, height: 384, format: "jpeg" },
      expectedUrl:
        "https://cdn.example.com/resize?width=688&height=384&format=jpeg",
      responseText: "resized-jpeg-binary-data",
    };
  }

  png_with_port_and_trailing_slash(): ImageResizerTestData {
    return {
      name: "png_with_port_and_trailing_slash",
      resizerOptions: { url: "http://localhost:4000/", apiKey: "port-key" },
      sizeProperties: { width: 100, height: 50, format: "png" },
      expectedUrl:
        "http://localhost:4000/resize?width=100&height=50&format=png",
      responseText: "resized-small-png-data",
    };
  }
}
