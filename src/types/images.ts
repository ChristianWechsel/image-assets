type ImageType = "DESKTOP" | "MOBILE";

export function isImageType(value: any): value is ImageType {
  return value === "DESKTOP" || value === "MOBILE";
}

type ImageScale = "ORIGINAL" | "MAIN" | "PREVIEW";

export function isImageScale(value: any): value is ImageScale {
  return value === "ORIGINAL" || value === "MAIN" || value === "PREVIEW";
}

export type ImageId = { type: ImageType; scale: ImageScale; filename: string };

export function isImageId(obj: any): obj is ImageId {
  return (
    obj &&
    typeof obj.filename === "string" &&
    obj.filename.length < 255 &&
    isImageType(obj.type) &&
    isImageScale(obj.scale)
  );
}

export type ImageProperties = {
  width: number;
  height: number;
  format: "png" | "jpeg" | "webp" | "avif";
};

export type ImageDefinition = Omit<ImageId, "filename"> & ImageProperties;

export type StoredImage = {
  image: Buffer;
  fileName: string;
};
