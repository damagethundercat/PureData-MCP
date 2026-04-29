import { writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { ControlClient } from "./controlClient.js";
import {
  LivePatchGraph,
  type AddLiveObjectInput,
  type ConnectLiveObjectsInput,
  type DisconnectLiveObjectsInput,
  type LivePatchSnapshot,
  type MoveLiveObjectInput,
  type RemoveLiveObjectInput,
  type ReplaceLiveGraphInput,
  type UpdateLiveObjectInput
} from "./livePatch.js";
import { findPdBinary } from "./pdPaths.js";
import { launchPdProcess, type PdProcessHandle } from "./pdProcess.js";
import { LogRing } from "./logs.js";
import { generateDemoPatch } from "./patchGenerator.js";
import { PdNotRunningError, PdSessionError } from "../util/errors.js";
import { allocatePort } from "../util/ports.js";
import { createTempWorkspace, type TempWorkspace } from "../util/tempWorkspace.js";

export type PdSessionState = "idle" | "starting" | "running" | "stopping" | "stopped" | "error";

export interface PdSessionStatus {
  state: PdSessionState;
  currentPatch: string | null;
  patchPath: string | null;
  port: number | null;
  editPort: number | null;
  pdBinary: string | null;
  error: string | null;
  livePatch: LivePatchSnapshot;
}

export interface ControlClientLike {
  connect?(port: number): Promise<void> | void;
  setParams?(params: Record<string, unknown>): Promise<void> | void;
  send?(command: string, value: number | boolean): Promise<void> | void;
  sendRaw?(message: string): Promise<void> | void;
  sendRawMessages?(messages: string[]): Promise<void> | void;
  close?(): Promise<void> | void;
}

export interface PdSessionOptions {
  pdBinary?: string | null;
  controlClient?: ControlClientLike;
  editClient?: ControlClientLike;
  launchProcess?: typeof launchPdProcess;
  createWorkspace?: typeof createTempWorkspace;
  allocatePort?: typeof allocatePort;
  initialPatch?: string;
}

export class PdSession {
  private state: PdSessionState = "idle";
  private patchPath: string | null = null;
  private patchText: string | null = null;
  private port: number | null = null;
  private editPort: number | null = null;
  private pdBinary: string | null = null;
  private error: string | null = null;
  private workspace: TempWorkspace | null = null;
  private processHandle: PdProcessHandle | null = null;
  private readonly logRing = new LogRing(200);
  private controlClient: ControlClientLike | null;
  private editClient: ControlClientLike | null;
  private readonly livePatch = new LivePatchGraph();
  private readonly launchProcess: typeof launchPdProcess;
  private readonly createWorkspace: typeof createTempWorkspace;
  private readonly allocatePort: typeof allocatePort;
  private readonly configuredPdBinary?: string | null;
  private readonly initialPatch: string;

  constructor(options: PdSessionOptions = {}) {
    this.controlClient = options.controlClient ?? null;
    this.editClient = options.editClient ?? null;
    this.launchProcess = options.launchProcess ?? launchPdProcess;
    this.createWorkspace = options.createWorkspace ?? createTempWorkspace;
    this.allocatePort = options.allocatePort ?? allocatePort;
    this.configuredPdBinary = options.pdBinary;
    this.initialPatch = options.initialPatch ?? "#N canvas 0 0 450 300 12;\n";
  }

  status(): PdSessionStatus {
    return {
      state: this.state,
      currentPatch: this.patchText,
      patchPath: this.patchPath,
      port: this.port,
      editPort: this.editPort,
      pdBinary: this.pdBinary,
      error: this.error,
      livePatch: this.livePatch.snapshot()
    };
  }

  currentPatch(): string | null {
    return this.patchText;
  }

  logs(): LogRing {
    return this.logRing;
  }

  async start(): Promise<PdSessionStatus> {
    return await this.startWithPatch(this.initialPatch);
  }

  async startDemo(input: {
    patch?: string;
    frequency?: number;
    amplitude?: number;
    audioOutDevice?: number;
    gui?: boolean;
  } = {}): Promise<PdSessionStatus> {
    const port = await this.allocatePort();
    const editPort = await this.allocatePort();
    const patchText = generateDemoPatch({
      patchId: `pd-mcp-${Date.now()}`,
      patch: input.patch ?? "basic_sine",
      port,
      editPort,
      frequency: input.frequency ?? 220,
      amplitude: input.amplitude ?? 0.05
    });
    this.livePatch.clear();

    return await this.startWithPatch(patchText, port, {
      editPort,
      audioOutDevice: input.audioOutDevice,
      gui: input.gui
    });
  }

  async listAudioDevices(): Promise<{ pdBinary: string | null; output: string }> {
    const pdBinary = this.configuredPdBinary ?? findPdBinary();
    if (!pdBinary) {
      throw new PdSessionError("Pd binary not found");
    }

    return await new Promise((resolve, reject) => {
      const child = spawn(
        pdBinary,
        ["-nogui", "-stderr", "-nomidi", "-listdev", "-send", "pd quit"],
        { windowsHide: true }
      );
      let output = "";
      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
        resolve({ pdBinary, output });
      }, 3_000);

      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        output += chunk.toString();
      });
      child.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once("exit", () => {
        clearTimeout(timeout);
        resolve({ pdBinary, output });
      });
    });
  }

  private async startWithPatch(
    patchText: string,
    reservedPort?: number,
    launchOptions: { editPort?: number; audioOutDevice?: number; gui?: boolean } = {}
  ): Promise<PdSessionStatus> {
    if (this.state === "running" || this.state === "starting") {
      return this.status();
    }

    this.state = "starting";
    this.error = null;

    try {
      const pdBinary = this.configuredPdBinary ?? findPdBinary();
      if (!pdBinary) {
        throw new PdSessionError("Pd binary not found");
      }

      const workspace = await this.createWorkspace();
      const port = reservedPort ?? (await this.allocatePort());
      await writeFile(workspace.patchPath, patchText, "utf8");

      const processHandle = this.launchProcess({
        binary: pdBinary,
        patchPath: workspace.patchPath,
        port,
        cwd: workspace.dir,
        audioOutDevice: launchOptions.audioOutDevice,
        gui: launchOptions.gui,
        logs: this.logRing
      });

      this.pdBinary = pdBinary;
      this.workspace = workspace;
      this.patchPath = workspace.patchPath;
      this.patchText = patchText;
      this.port = port;
      this.editPort = launchOptions.editPort ?? null;
      this.processHandle = processHandle;
      let exitedBeforeReady = false;
      processHandle.child.once("exit", () => {
        if (this.processHandle === processHandle) {
          if (this.state === "starting") {
            exitedBeforeReady = true;
            this.error = "Pd exited during startup";
          }
          this.markStoppedAfterChildExit(processHandle);
        }
      });
      processHandle.child.once("error", (error) => {
        if (this.processHandle === processHandle) {
          this.error = error.message;
          this.state = "error";
          this.processHandle = null;
        }
      });

      await this.getControlClient().connect?.(port);
      if (exitedBeforeReady || this.processHandle !== processHandle) {
        throw new PdSessionError(this.error ?? "Pd exited during startup");
      }

      this.state = "running";
      return this.status();
    } catch (error) {
      const caughtError = error instanceof Error ? error : new Error(String(error));
      const preservedError = this.error;
      this.error = preservedError ?? caughtError.message;
      this.state = "error";
      await this.cleanup().catch((cleanupError: unknown) => {
        const cleanupMessage =
          cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
        this.logRing.add("stderr", `Pd cleanup after startup error failed: ${cleanupMessage}`);
      });
      if (preservedError && preservedError !== caughtError.message) {
        throw new PdSessionError(preservedError);
      }
      throw caughtError;
    }
  }

  async setParams(params: Record<string, unknown>): Promise<void> {
    if (this.state !== "running") {
      throw new PdNotRunningError();
    }

    if (this.controlClient?.setParams) {
      await this.controlClient.setParams(params);
      return;
    }

    await sendParams(this.getControlClient(), params);
  }

  async addLiveObject(input: AddLiveObjectInput): Promise<{
    object: ReturnType<LivePatchGraph["snapshot"]>["nodes"][number];
    livePatch: LivePatchSnapshot;
  }> {
    await this.ensureLiveEditingReady();
    const result = this.livePatch.addObject(input);
    await this.sendLiveCanvasMessages(["vis 1", ...result.messages, "dirty 1"]);

    return {
      object: result.node,
      livePatch: this.livePatch.snapshot()
    };
  }

  async connectLiveObjects(input: ConnectLiveObjectsInput): Promise<{
    connection: ReturnType<LivePatchGraph["snapshot"]>["connections"][number];
    livePatch: LivePatchSnapshot;
  }> {
    await this.ensureLiveEditingReady();
    const result = this.livePatch.connect(input);
    await this.sendLiveCanvasMessages(["vis 1", ...result.messages, "dirty 1"]);

    return {
      connection: result.connection,
      livePatch: this.livePatch.snapshot()
    };
  }

  async moveLiveObject(input: MoveLiveObjectInput): Promise<{
    object: ReturnType<LivePatchGraph["snapshot"]>["nodes"][number];
    livePatch: LivePatchSnapshot;
  }> {
    await this.ensureLiveEditingReady();
    const result = this.livePatch.moveObject(input);
    await this.sendLiveCanvasMessages(["vis 1", ...result.messages, "dirty 1"]);

    return {
      object: result.node,
      livePatch: this.livePatch.snapshot()
    };
  }

  async removeLiveObject(input: RemoveLiveObjectInput): Promise<{
    object: ReturnType<LivePatchGraph["snapshot"]>["nodes"][number];
    livePatch: LivePatchSnapshot;
  }> {
    await this.ensureLiveEditingReady();
    const result = this.livePatch.removeObject(input);
    await this.sendLiveCanvasMessages(["vis 1", ...result.messages, "dirty 1"]);

    return {
      object: result.object,
      livePatch: this.livePatch.snapshot()
    };
  }

  async disconnectLiveObjects(input: DisconnectLiveObjectsInput): Promise<{
    connection: ReturnType<LivePatchGraph["snapshot"]>["connections"][number];
    livePatch: LivePatchSnapshot;
  }> {
    await this.ensureLiveEditingReady();
    const result = this.livePatch.disconnect(input);
    await this.sendLiveCanvasMessages(["vis 1", ...result.messages, "dirty 1"]);

    return {
      connection: result.connection,
      livePatch: this.livePatch.snapshot()
    };
  }

  async updateLiveObject(input: UpdateLiveObjectInput): Promise<{
    object: ReturnType<LivePatchGraph["snapshot"]>["nodes"][number];
    livePatch: LivePatchSnapshot;
  }> {
    await this.ensureLiveEditingReady();
    const result = this.livePatch.updateObject(input);
    await this.sendLiveCanvasMessages(["vis 1", ...result.messages, "dirty 1"]);

    return {
      object: result.object,
      livePatch: this.livePatch.snapshot()
    };
  }

  async replaceLiveGraph(input: ReplaceLiveGraphInput): Promise<{
    livePatch: LivePatchSnapshot;
  }> {
    await this.ensureLiveEditingReady();
    const result = this.livePatch.replaceGraph(input);
    await this.sendLiveCanvasMessages(["vis 1", ...result.messages, "dirty 1"]);

    return { livePatch: result.livePatch };
  }

  async clearLivePatch(): Promise<{ livePatch: LivePatchSnapshot }> {
    await this.ensureLiveEditingReady();
    const result = this.livePatch.clear();
    await this.sendLiveCanvasMessages(["vis 1", ...result.messages, "dirty 1"]);

    return { livePatch: this.livePatch.snapshot() };
  }

  livePatchSnapshot(): LivePatchSnapshot {
    return this.livePatch.snapshot();
  }

  async stop(_options: { force?: boolean } = {}): Promise<void> {
    if (this.state === "idle" || this.state === "stopped") {
      return;
    }

    this.state = "stopping";

    try {
      await this.silence();
      await this.cleanup();
    } finally {
      this.state = "stopped";
    }
  }

  private async cleanup(): Promise<void> {
    const resources = this.detachSessionResources();

    await resources.controlClient?.close?.();
    await resources.editClient?.close?.();
    await resources.processHandle?.stop();
    await resources.workspace?.cleanup();
  }

  private detachSessionResources(): {
    controlClient: ControlClientLike | null;
    editClient: ControlClientLike | null;
    processHandle: PdProcessHandle | null;
    workspace: TempWorkspace | null;
  } {
    const resources = {
      controlClient: this.controlClient,
      editClient: this.editClient,
      processHandle: this.processHandle,
      workspace: this.workspace
    };

    this.processHandle = null;
    this.editClient = null;
    this.workspace = null;
    this.patchPath = null;
    this.patchText = null;
    this.port = null;
    this.editPort = null;

    return resources;
  }

  private getControlClient(): ControlClientLike {
    this.controlClient ??= new ControlClient();
    return this.controlClient;
  }

  private getEditClient(): ControlClientLike {
    this.editClient ??= new ControlClient();
    return this.editClient;
  }

  private markStoppedAfterChildExit(processHandle: PdProcessHandle): void {
    if (this.processHandle !== processHandle) {
      return;
    }

    const resources = this.detachSessionResources();

    this.state = "stopped";

    void Promise.resolve(resources.controlClient?.close?.())
      .then(() => resources.editClient?.close?.())
      .catch(() => undefined)
      .then(() => resources.workspace?.cleanup())
      .catch(() => undefined);
  }

  private async ensureLiveEditingReady(): Promise<void> {
    if (this.state !== "running" || this.editPort === null) {
      throw new PdNotRunningError();
    }

    await this.getEditClient().connect?.(this.editPort);
  }

  private async sendLiveCanvasMessages(messages: string[]): Promise<void> {
    const client = this.getEditClient();
    if (client.sendRawMessages) {
      await client.sendRawMessages(messages);
      return;
    }

    if (client.sendRaw) {
      for (const message of messages) {
        await client.sendRaw(message);
      }
      return;
    }

    throw new Error("Pure Data live edit client does not support raw FUDI messages");
  }

  private async silence(): Promise<void> {
    const client = this.controlClient;
    if (!client?.send) {
      return;
    }

    await Promise.resolve(client.send("amp", 0)).catch(() => undefined);
    await Promise.resolve(client.send("gate", false)).catch(() => undefined);
    await Promise.resolve(client.send("dsp", false)).catch(() => undefined);
  }
}

async function sendParams(
  controlClient: ControlClientLike | undefined,
  params: Record<string, unknown>
): Promise<void> {
  if (!controlClient?.send) {
    return;
  }

  if (typeof params.frequency === "number") {
    await controlClient.send("freq", params.frequency);
  }

  if (typeof params.amplitude === "number") {
    await controlClient.send("amp", params.amplitude);
  }

  if (typeof params.gate === "boolean") {
    await controlClient.send("gate", params.gate);
  }
}
