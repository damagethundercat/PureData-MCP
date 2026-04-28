import { createServer } from "node:net";
import { describe, expect, test } from "vitest";
import {
  CONTROL_CONNECT_TIMEOUT_MS,
  ControlClient,
  formatFudiMessage,
  formatRawFudiMessage
} from "../../src/pd/controlClient.js";

describe("formatFudiMessage", () => {
  test("formats numeric and boolean values as single FUDI commands", () => {
    expect(formatFudiMessage("freq", 440)).toBe("freq 440;\n");
    expect(formatFudiMessage("amp", 0.05)).toBe("amp 0.05;\n");
    expect(formatFudiMessage("gate", true)).toBe("gate 1;\n");
    expect(formatFudiMessage("gate", false)).toBe("gate 0;\n");
  });

  test("rejects command injection characters", () => {
    expect(() => formatFudiMessage("freq;", 440)).toThrow(/Invalid FUDI command/);
  });

  test("formats raw canvas messages without allowing message injection", () => {
    expect(formatRawFudiMessage("obj 120 80 osc~ 440")).toBe("obj 120 80 osc~ 440;\n");
    expect(() => formatRawFudiMessage("obj 0 0 osc~ 440; clear")).toThrow(
      /Invalid raw FUDI message/
    );
  });
});

describe("ControlClient", () => {
  test("allows enough startup time for Pd GUI mode", () => {
    expect(CONTROL_CONNECT_TIMEOUT_MS).toBeGreaterThanOrEqual(8_000);
  });

  test("connects to a localhost FUDI socket and sends formatted commands", async () => {
    const received: string[] = [];
    const server = createServer((socket) => {
      socket.on("data", (chunk) => received.push(chunk.toString()));
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (typeof address !== "object" || address === null) {
      throw new Error("Expected TCP server address");
    }

    const client = new ControlClient();
    try {
      await client.connect(address.port);
      await client.send("freq", 330);
      await client.send("gate", false);
      await client.sendRaw("obj 120 80 osc~ 440");
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(received.join("")).toBe("freq 330;\ngate 0;\nobj 120 80 osc~ 440;\n");
    } finally {
      await client.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
