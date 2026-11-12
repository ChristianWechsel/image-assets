import type { ParsedPath } from "path";

type ImageType = "DESKTOP" | "MOBILE";
type ImageScale = "ORIGINAL" | "MAIN" | "PREVIEW";

export type DeviceImageType = {
  type: ImageType;
  scale: ImageScale;
  format: "png" | "jpeg";
  width: number;
  height: number;
};

export type ImageStorageOptions = ParsedPath & DeviceImageType;

export function isImageType(value: any): value is ImageType {
  return value === "DESKTOP" || value === "MOBILE";
}
export function isImageScale(value: any): value is ImageScale {
  return value === "ORIGINAL" || value === "MAIN" || value === "PREVIEW";
}

export type ImageParams = DeviceImageType & {
  filename: string;
};

export function isImageParams(obj: any): obj is ImageParams {
  return (
    obj &&
    typeof obj.filename === "string" &&
    obj.filename.length < 255 &&
    isImageType(obj.type) &&
    isImageScale(obj.scale)
  );
}

export type StoredImage = {
  image: Buffer;
  fileName: string;
};
