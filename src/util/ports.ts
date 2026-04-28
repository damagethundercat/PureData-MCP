import { createServer } from "node:net";

export async function allocatePort(host = "127.0.0.1"): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        if (typeof address === "object" && address !== null) {
          resolve(address.port);
          return;
        }

        reject(new Error("Unable to allocate a TCP port"));
      });
    });
  });
}
