import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { LogRing, LogStream } from "./logs.js";

export interface PdProcessOptions {
  binary: string;
  patchPath: string;
  port: number;
  audioOutDevice?: number;
  gui?: boolean;
  args?: string[];
  cwd?: string;
  logs?: LogRing;
}

export interface PdProcessHandle {
  child: ChildProcessWithoutNullStreams;
  stop(): Promise<void>;
}

export function launchPdProcess(options: PdProcessOptions): PdProcessHandle {
  const args = buildPdArgs({
    patchPath: options.patchPath,
    audioOutDevice: options.audioOutDevice,
    gui: options.gui,
    extraArgs: options.args
  });

  const child = spawn(options.binary, args, {
    cwd: options.cwd,
    windowsHide: true
  });

  if (options.logs) {
    attachLogs(child, options.logs);
  }
  child.once("error", (error) => {
    options.logs?.add("stderr", `Pd process error: ${error.message}`);
  });

  return {
    child,
    async stop() {
      if (child.exitCode !== null || child.signalCode !== null) {
        return;
      }

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          child.kill("SIGKILL");
          resolve();
        }, 1_000);

        child.once("exit", () => {
          clearTimeout(timeout);
          resolve();
        });

        try {
          child.kill();
        } catch {
          clearTimeout(timeout);
          resolve();
        }
      });
    }
  };
}

export interface BuildPdArgsOptions {
  patchPath: string;
  audioOutDevice?: number;
  gui?: boolean;
  extraArgs?: string[];
}

export function buildPdArgs(options: BuildPdArgsOptions): string[] {
  const args = [
    ...(options.gui ? [] : ["-nogui"]),
    "-stderr",
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
    "-send",
    "pd dsp 1",
    ...(options.audioOutDevice === undefined
      ? []
      : ["-audiooutdev", String(options.audioOutDevice)]),
    ...(options.extraArgs ?? []),
    "-open",
    options.patchPath
  ];

  return args;
}

function attachLogs(child: ChildProcessWithoutNullStreams, logs: LogRing): void {
  const add = (stream: LogStream) => (chunk: Buffer | string) => {
    logs.add(stream, chunk.toString());
  };

  child.stdout.on("data", add("stdout"));
  child.stderr.on("data", add("stderr"));
}
