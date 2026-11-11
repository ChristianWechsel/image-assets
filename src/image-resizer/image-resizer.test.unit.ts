import { ImageResizer } from "./image-resizer.js";
import { ImageResizerTestDataFactory } from "./image-resizer.testdata.js";

function textToArrayBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

describe("ImageResizer", () => {
  describe("resizeImage", () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    const testData = new ImageResizerTestDataFactory();

    it.each([
      testData.png_with_simple_base_url(),
      testData.jpeg_with_base_url_containing_subpath(),
      testData.png_with_port_and_trailing_slash(),
    ])(
      "$name",
      async ({ resizerOptions, sizeProperties, expectedUrl, responseText }) => {
        const fetchMock = jest.fn();
        fetchMock.mockResolvedValue({
          arrayBuffer: () => Promise.resolve(textToArrayBuffer(responseText)),
        });
        global.fetch = fetchMock;

        const resizer = new ImageResizer(resizerOptions);
        const inputImage = Buffer.from("original-image-bytes");

        const result = await resizer.resizeImage(inputImage, sizeProperties);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(expectedUrl, {
          method: "POST",
          headers: {
            "Content-Type": "image/png",
            Authorization: `Bearer ${resizerOptions.apiKey}`,
          },
          body: inputImage,
        });
        expect(result).toEqual(Buffer.from(responseText));
      },
    );
  });
});
