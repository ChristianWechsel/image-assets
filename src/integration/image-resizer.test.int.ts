import { createServer, type IncomingMessage, type Server } from "http";
import { ImageResizer } from "../image-resizer/image-resizer.js";

type CapturedRequest = {
  method: IncomingMessage["method"];
  url: IncomingMessage["url"];
  authorizationHeader: IncomingMessage["headers"][string];
  contentTypeHeader: IncomingMessage["headers"][string];
  body: Buffer;
};

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("Failed to determine the port of the test server."));
        return;
      }
      resolve(address.port);
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

describe("ImageResizer integration", () => {
  let server: Server;
  let baseUrl: string;
  let receivedRequests: CapturedRequest[];
  const resizeResultBody = "resized-image-result";

  beforeEach(async () => {
    receivedRequests = [];
    server = createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      request.on("end", () => {
        receivedRequests.push({
          method: request.method,
          url: request.url,
          authorizationHeader: request.headers.authorization,
          contentTypeHeader: request.headers["content-type"],
          body: Buffer.concat(chunks),
        });
        response.writeHead(200, { "Content-Type": "application/octet-stream" });
        response.end(Buffer.from(resizeResultBody));
      });
    });
    const port = await listen(server);
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await close(server);
  });

  it("sends the image to the resize endpoint and returns the resized buffer", async () => {
    const resizer = new ImageResizer({
      url: baseUrl,
      apiKey: "integration-test-key",
    });
    const inputImage = Buffer.from("original-image-bytes");

    const result = await resizer.resizeImage(inputImage, {
      width: 400,
      height: 300,
      format: "jpeg",
    });

    expect(receivedRequests).toHaveLength(1);
    const [request] = receivedRequests;
    expect(request.method).toBe("POST");
    expect(request.url).toBe("/resize?width=400&height=300&format=jpeg");
    expect(request.authorizationHeader).toBe("Bearer integration-test-key");
    expect(request.contentTypeHeader).toBe("image/png");
    expect(request.body).toEqual(inputImage);
    expect(result).toEqual(Buffer.from(resizeResultBody));
  });
});
