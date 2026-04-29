import { spawn } from "node:child_process";
import { describe, expect, test } from "vitest";
import { buildPdArgs, launchPdProcess } from "../../src/pd/pdProcess.js";

describe("buildPdArgs", () => {
  test("builds real-audio headless Pd launch arguments", () => {
    const args = buildPdArgs({
      patchPath: "C:\\\\tmp\\\\patch.pd",
      audioOutDevice: 1
    });

    expect(args).toContain("-nogui");
    expect(args).toContain("-stderr");
    expect(args).toContain("-verbose");
    expect(args).toContain("-noprefs");
    expect(args).toContain("-nomidi");
    expect(args).toContain("-noadc");
    expect(args).toContain("-pa");
    expect(args).toContain("-open");
    expect(args).toContain("C:\\\\tmp\\\\patch.pd");
    expect(args).toContain("-send");
    expect(args).toContain("pd dsp 1");
    expect(args).toContain("-audiooutdev");
    expect(args).toContain("1");
    expect(args).not.toContain("-noaudio");
    expect(args).not.toContain("-nodac");
    expect(args).not.toContain("-batch");
  });

  test("opens the Pd GUI when requested while keeping stderr capture", () => {
    const args = buildPdArgs({
      patchPath: "C:\\\\tmp\\\\patch.pd",
      gui: true
    });

    expect(args).not.toContain("-nogui");
    expect(args).toContain("-stderr");
    expect(args).toContain("-open");
    expect(args).toContain("C:\\\\tmp\\\\patch.pd");
  });
});

describe("launchPdProcess", () => {
  test("attaches an error listener so spawn failures do not become unhandled errors", () => {
    const handle = launchPdProcess({
      binary: "C:\\\\definitely-missing\\\\pd.com",
      patchPath: "C:\\\\tmp\\\\patch.pd",
      port: 31_002
    });

    expect(handle.child.listenerCount("error")).toBeGreaterThan(0);
    void handle.stop();
  });

  test("stop after a spawn failure does not terminate the caller", async () => {
    const script = `
      import { launchPdProcess } from "./src/pd/pdProcess.ts";

      const handle = launchPdProcess({
        binary: "C:\\\\\\\\definitely-missing\\\\\\\\pd.com",
        patchPath: "C:\\\\\\\\tmp\\\\\\\\patch.pd",
        port: 31002
      });

      if (handle.child.listenerCount("error") === 0) {
        throw new Error("missing error listener");
      }

      await handle.stop();
      console.log("survived");
    `;
    const child = spawn(process.execPath, ["--import", "tsx", "--eval", script], {
      cwd: process.cwd(),
      detached: true
    });

    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    const result = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
      (resolve) => {
        child.once("exit", (code, signal) => resolve({ code, signal }));
      }
    );

    expect(result).toEqual({ code: 0, signal: null });
    expect(stdout).toContain("survived");
  });
});
