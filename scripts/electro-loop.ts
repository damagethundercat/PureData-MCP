import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, type ChildProcess } from "node:child_process";
import { findPdBinary } from "../src/pd/pdPaths.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..");
const patchPath = join(repoRoot, "patches", "electro-rhythm-loop.pd");

const pdBinary = findDemoPdBinary();
if (!pdBinary) {
  throw new Error("Could not find Pd. Set PD_EXE to the Pd binary path.");
}

if (!existsSync(patchPath)) {
  throw new Error(`Demo patch not found: ${patchPath}`);
}

const audioOutDevice = process.env.PD_AUDIO_OUT_DEVICE;
const args = [
  "-verbose",
  "-noprefs",
  "-nomidi",
  "-noadc",
  "-pa",
  "-r",
  "48000",
  "-audiobuf",
  "50",
  "-blocksize",
  "64",
  "-outchannels",
  "2",
  ...(audioOutDevice === undefined ? [] : ["-audiooutdev", audioOutDevice]),
  "-open",
  patchPath
];

const child = spawn(pdBinary, args, {
  cwd: dirname(patchPath),
  stdio: "inherit",
  windowsHide: false
});

console.log(`PureData-MCP electro loop`);
console.log(`Pd binary: ${pdBinary}`);
console.log(`Patch: ${patchPath}`);
console.log(`Audio output device: ${audioOutDevice ?? "Pd default"}`);
console.log(`Pd PID: ${child.pid}`);
console.log("Press Ctrl+C in this terminal to stop Pd.");

setupShutdown(child);

function findDemoPdBinary(): string | null {
  if (process.env.PD_EXE) {
    return process.env.PD_EXE;
  }

  if (process.platform === "win32") {
    const pdExe = "C:\\Program Files\\Pd\\bin\\pd.exe";
    if (existsSync(pdExe)) {
      return pdExe;
    }
  }

  return findPdBinary();
}

function setupShutdown(childProcess: ChildProcess): void {
  const stop = () => {
    if (childProcess.exitCode === null && childProcess.signalCode === null) {
      childProcess.kill();
    }
  };

  process.once("SIGINT", () => {
    stop();
    process.exit(130);
  });

  process.once("SIGTERM", () => {
    stop();
    process.exit(143);
  });

  childProcess.once("exit", (code, signal) => {
    if (signal) {
      process.exit(128);
    }
    process.exit(code ?? 0);
  });
}
