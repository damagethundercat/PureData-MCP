import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { PdSession } from "../../src/pd/session.js";

describe("PdSession", () => {
  test("starts idle with no current patch", () => {
    const session = new PdSession();

    expect(session.status().state).toBe("idle");
    expect(session.currentPatch()).toBeNull();
  });

  test("rejects parameter updates before Pd is running", async () => {
    const session = new PdSession();

    await expect(session.setParams({ frequency: 440 })).rejects.toThrow(/not running/);
  });

  test("silences Pd before stopping the process", async () => {
    const sent: Array<[string, number | boolean]> = [];
    let stopped = false;
    const dir = mkdtempSync(join(tmpdir(), "pd-session-test-"));
    const session = new PdSession({
      pdBinary: "C:\\\\Pd\\\\pd.com",
      allocatePort: async () => 31_000,
      createWorkspace: async () => ({
        dir,
        patchPath: join(dir, "patch.pd"),
        cleanup: async () => undefined
      }),
      launchProcess: () => ({
        child: fakeChild(),
        stop: async () => {
          stopped = true;
        }
      }),
      controlClient: {
        connect: async () => undefined,
        send: async (command, value) => {
          sent.push([command, value]);
        },
        close: async () => undefined
      }
    });

    try {
      await session.startDemo();
      await session.stop();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    expect(sent).toEqual([
      ["amp", 0],
      ["gate", false],
      ["dsp", false]
    ]);
    expect(stopped).toBe(true);
  });

  test("explicit stop waits for workspace cleanup even when child exit fires during stop", async () => {
    const child = fakeChild();
    let cleanupCalled = false;
    const dir = mkdtempSync(join(tmpdir(), "pd-session-test-"));
    const session = new PdSession({
      pdBinary: "C:\\\\Pd\\\\pd.com",
      allocatePort: async () => 31_004,
      createWorkspace: async () => ({
        dir,
        patchPath: join(dir, "patch.pd"),
        cleanup: async () => {
          cleanupCalled = true;
        }
      }),
      launchProcess: () => ({
        child,
        stop: async () => {
          child.emit("exit", 0, null);
        }
      }),
      controlClient: {
        connect: async () => undefined,
        send: async () => undefined,
        close: async () => undefined
      }
    });

    try {
      await session.startDemo();
      await session.stop();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    expect(cleanupCalled).toBe(true);
    expect(session.status().currentPatch).toBeNull();
  });

  test("marks the session stopped when the Pd child exits", async () => {
    const child = fakeChild();
    let cleanupCalled = false;
    const dir = mkdtempSync(join(tmpdir(), "pd-session-test-"));
    const session = new PdSession({
      pdBinary: "C:\\\\Pd\\\\pd.com",
      allocatePort: async () => 31_001,
      createWorkspace: async () => ({
        dir,
        patchPath: join(dir, "patch.pd"),
        cleanup: async () => {
          cleanupCalled = true;
        }
      }),
      launchProcess: () => ({
        child,
        stop: async () => undefined
      }),
      controlClient: {
        connect: async () => undefined,
        close: async () => undefined
      }
    });

    try {
      await session.startDemo();
      child.emit("exit", 0, null);
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    expect(session.status().state).toBe("stopped");
    expect(session.status().currentPatch).toBeNull();
    expect(session.status().port).toBeNull();
    expect(cleanupCalled).toBe(true);
  });

  test("rejects startup when the Pd child exits before control connection finishes", async () => {
    const child = fakeChild();
    const dir = mkdtempSync(join(tmpdir(), "pd-session-test-"));
    const session = new PdSession({
      pdBinary: "C:\\\\Pd\\\\pd.com",
      allocatePort: async () => 31_003,
      createWorkspace: async () => ({
        dir,
        patchPath: join(dir, "patch.pd"),
        cleanup: async () => undefined
      }),
      launchProcess: () => ({
        child,
        stop: async () => undefined
      }),
      controlClient: {
        connect: async () => {
          child.emit("exit", 1, null);
        },
        close: async () => undefined
      }
    });

    try {
      await expect(session.startDemo()).rejects.toThrow(/exited during startup/);
      expect(session.status().state).toBe("error");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects startup with the spawn error when child error fires during connect", async () => {
    const child = fakeChild();
    const dir = mkdtempSync(join(tmpdir(), "pd-session-test-"));
    const session = new PdSession({
      pdBinary: "C:\\\\missing\\\\pd.com",
      allocatePort: async () => 31_005,
      createWorkspace: async () => ({
        dir,
        patchPath: join(dir, "patch.pd"),
        cleanup: async () => undefined
      }),
      launchProcess: () => ({
        child,
        stop: async () => undefined
      }),
      controlClient: {
        connect: async () => {
          child.emit("error", new Error("spawn ENOENT"));
          throw new Error("ECONNREFUSED");
        },
        close: async () => undefined
      }
    });

    try {
      await expect(session.startDemo()).rejects.toThrow(/spawn ENOENT/);
      expect(session.status().error).toMatch(/spawn ENOENT/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("sends whole-graph live editing updates to the Pd GUI canvas", async () => {
    const child = fakeChild();
    const sentMessages: string[][] = [];
    const dir = mkdtempSync(join(tmpdir(), "pd-session-test-"));
    const session = new PdSession({
      pdBinary: "C:\\\\Pd\\\\pd.com",
      allocatePort: async () => 31_006,
      createWorkspace: async () => ({
        dir,
        patchPath: join(dir, "patch.pd"),
        cleanup: async () => undefined
      }),
      launchProcess: () => ({
        child,
        stop: async () => undefined
      }),
      controlClient: {
        connect: async () => undefined,
        close: async () => undefined
      },
      editClient: {
        connect: async () => undefined,
        sendRawMessages: async (messages) => {
          sentMessages.push(messages);
        },
        close: async () => undefined
      }
    });

    try {
      await session.startDemo({ gui: true });
      await session.replaceLiveGraph({
        nodes: [
          { id: "obj-1", type: "noise~", x: 90, y: 80 },
          { id: "obj-2", type: "*~", x: 90, y: 130, args: [0.04] },
          { id: "obj-3", type: "dac~", x: 90, y: 190 }
        ],
        connections: [
          { id: "conn-1", sourceId: "obj-1", targetId: "obj-2" },
          { id: "conn-2", sourceId: "obj-2", targetId: "obj-3" }
        ]
      });

      expect(sentMessages.at(-1)).toEqual([
        "vis 1",
        "clear",
        "obj 90 80 noise~",
        "obj 90 130 *~ 0.04",
        "obj 90 190 dac~ 1 2",
        "connect 0 0 1 0",
        "connect 1 0 2 0",
        "dirty 1"
      ]);

      await session.disconnectLiveObjects({ id: "conn-1" });
      await session.removeLiveObject({ id: "obj-1" });
      await session.updateLiveObject({ id: "obj-2", args: [0.02] });

      expect(session.livePatchSnapshot()).toEqual({
        nodes: [
          { id: "obj-2", pdIndex: 0, type: "*~", x: 90, y: 130, args: [0.02] },
          { id: "obj-3", pdIndex: 1, type: "dac~", x: 90, y: 190, args: [1, 2] }
        ],
        connections: [{ id: "conn-2", sourceId: "obj-2", outlet: 0, targetId: "obj-3", inlet: 0 }]
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

function fakeChild() {
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();

  return {
    exitCode: null,
    signalCode: null,
    stdout: { on: () => undefined },
    stderr: { on: () => undefined },
    once(event: string, listener: (...args: unknown[]) => void) {
      const eventListeners = listeners.get(event) ?? [];
      eventListeners.push(listener);
      listeners.set(event, eventListeners);
      return this;
    },
    emit(event: string, ...args: unknown[]) {
      if (event === "exit") {
        this.exitCode = typeof args[0] === "number" ? args[0] : 0;
      }
      for (const listener of listeners.get(event) ?? []) {
        listener(...args);
      }
      return true;
    },
    kill: () => true
  // The session only needs this small EventEmitter-shaped subset in these unit tests.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}
