import { describe, expect, test } from "vitest";
import { accessSync, constants } from "node:fs";
import { PdSession } from "../../../src/pd/session.js";

const shouldRun = process.env.PD_INTEGRATION === "1" && Boolean(process.env.PD_EXE);

describe.skipIf(!shouldRun)("Pd integration", () => {
  test("has an explicit Pd binary for opt-in integration tests", () => {
    accessSync(process.env.PD_EXE!, constants.X_OK);

    expect(process.env.PD_EXE).toMatch(/pd\.(com|exe)$/i);
  });

  test(
    "launches headless Pd with a generated silent demo patch and stops cleanly",
    async () => {
      const session = new PdSession({ pdBinary: process.env.PD_EXE });

      const status = await session.startDemo({
        patch: "basic_sine",
        frequency: 220,
        amplitude: 0
      });

      expect(status.state).toBe("running");
      expect(status.patchPath).toMatch(/patch\.pd$/);
      expect(status.port).toEqual(expect.any(Number));
      expect(status.currentPatch).toContain("MCP_READY");
      expect(status.currentPatch).toContain("netreceive -f");

      await session.setParams({ frequency: 330, amplitude: 0, gate: false });
      await session.stop({ force: true });

      expect(session.status().state).toBe("stopped");
    },
    20_000
  );
});
