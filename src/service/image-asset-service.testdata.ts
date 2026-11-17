import type { ImageDefinition, ImageProperties } from "../types/images.js";

export type UploadScenario = {
  name: string;
  imageType: ImageDefinition;
  expectedResizeOptions: ImageProperties;
};

export class ImageAssetServiceTestDataFactory {
  desktop_main_resizes_to_688x384(): UploadScenario {
    return {
      name: "desktop_main_resizes_to_688x384",
      imageType: {
        type: "DESKTOP",
        scale: "MAIN",
        format: "png",
        width: 688,
        height: 384,
      },
      expectedResizeOptions: { width: 688, height: 384, format: "png" },
    };
  }

  desktop_preview_resizes_to_320x180(): UploadScenario {
    return {
      name: "desktop_preview_resizes_to_320x180",
      imageType: {
        type: "DESKTOP",
        scale: "PREVIEW",
        format: "jpeg",
        width: 320,
        height: 180,
      },
      expectedResizeOptions: { width: 320, height: 180, format: "jpeg" },
    };
  }

  desktop_original_resizes_to_688x384(): UploadScenario {
    return {
      name: "desktop_original_resizes_to_688x384",
      imageType: {
        type: "DESKTOP",
        scale: "ORIGINAL",
        format: "png",
        width: 688,
        height: 384,
      },
      expectedResizeOptions: { width: 688, height: 384, format: "png" },
    };
  }

  mobile_main_resizes_to_688x384(): UploadScenario {
    return {
      name: "mobile_main_resizes_to_688x384",
      imageType: {
        type: "MOBILE",
        scale: "MAIN",
        format: "png",
        width: 688,
        height: 384,
      },
      expectedResizeOptions: { width: 688, height: 384, format: "png" },
    };
  }

  mobile_preview_resizes_to_320x180(): UploadScenario {
    return {
      name: "mobile_preview_resizes_to_320x180",
      imageType: {
        type: "MOBILE",
        scale: "PREVIEW",
        format: "jpeg",
        width: 320,
        height: 180,
      },
      expectedResizeOptions: { width: 320, height: 180, format: "jpeg" },
    };
  }

  mobile_original_resizes_to_688x384(): UploadScenario {
    return {
      name: "mobile_original_resizes_to_688x384",
      imageType: {
        type: "MOBILE",
        scale: "ORIGINAL",
        format: "png",
        width: 688,
        height: 384,
      },
      expectedResizeOptions: { width: 688, height: 384, format: "png" },
    };
  }
}
