import type { ImageProperties } from "../types/images.js";

export class ImageResizer {
  private readonly pathResize = "/resize";

  constructor(private options: { url: string; apiKey: string }) {}

  resizeImage(image: BodyInit, options: ImageProperties): Promise<Buffer> {
    return fetch(this.getUrlWithParams(this.pathResize, options), {
      method: "POST",
      headers: {
        "Content-Type": "image/png",
        Authorization: `Bearer ${this.options.apiKey}`,
      },
      body: image,
    })
      .then((response) => {
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => {
        return Buffer.from(arrayBuffer);
      });
  }

  private getUrlWithParams(path: string, options: ImageProperties) {
    const url = new URL(path, this.options.url);
    url.searchParams.append("width", options.width.toString());
    url.searchParams.append("height", options.height.toString());
    url.searchParams.append("format", options.format);
    return url.toString();
  }
}
