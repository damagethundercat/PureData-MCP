import { describe, expect, test } from "vitest";
import {
  PARAMETER_LIMITS,
  pdLiveAddObjectSchema,
  pdLiveConnectSchema,
  pdLiveDisconnectSchema,
  pdLiveMoveObjectSchema,
  pdLiveRemoveObjectSchema,
  pdLiveReplaceGraphSchema,
  pdLiveUpdateObjectSchema,
  pdSetParamsSchema,
  pdStartDemoSchema
} from "../../src/mcp/schemas.js";

describe("MCP tool schemas", () => {
  test("applies safe defaults for starting the demo", () => {
    const parsed = pdStartDemoSchema.parse({});

    expect(parsed).toEqual({
      patch: "basic_sine",
      frequency: 220,
      amplitude: 0.05,
      gui: false
    });
  });

  test("accepts opt-in GUI launch mode", () => {
    const parsed = pdStartDemoSchema.parse({ gui: true });

    expect(parsed.gui).toBe(true);
  });

  test("rejects amplitudes above the safe v0.1 ceiling", () => {
    const result = pdStartDemoSchema.safeParse({ amplitude: 0.5 });

    expect(result.success).toBe(false);
    expect(PARAMETER_LIMITS.amplitude.max).toBe(0.2);
  });

  test("requires at least one parameter when setting params", () => {
    const result = pdSetParamsSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  test("accepts bounded live parameter updates", () => {
    const parsed = pdSetParamsSchema.parse({
      frequency: 440,
      amplitude: 0.08,
      gate: true
    });

    expect(parsed).toEqual({
      frequency: 440,
      amplitude: 0.08,
      gate: true
    });
  });

  test("accepts safe live patch object edits", () => {
    const parsed = pdLiveAddObjectSchema.parse({
      type: "osc~",
      x: 120,
      y: 80,
      args: [440]
    });

    expect(parsed).toEqual({
      type: "osc~",
      x: 120,
      y: 80,
      args: [440]
    });
  });

  test("rejects unsupported live patch object classes", () => {
    const result = pdLiveAddObjectSchema.safeParse({
      type: "shell",
      x: 120,
      y: 80
    });

    expect(result.success).toBe(false);
  });

  test("accepts stable ids for live connect and move operations", () => {
    expect(
      pdLiveConnectSchema.parse({
        sourceId: "obj-1",
        targetId: "obj-2"
      })
    ).toEqual({
      sourceId: "obj-1",
      outlet: 0,
      targetId: "obj-2",
      inlet: 0
    });

    expect(
      pdLiveMoveObjectSchema.parse({
        id: "obj-1",
        x: 300,
        y: 140
      })
    ).toEqual({
      id: "obj-1",
      x: 300,
      y: 140
    });
  });

  test("accepts full graph editing schemas", () => {
    expect(pdLiveRemoveObjectSchema.parse({ id: "obj-1" })).toEqual({ id: "obj-1" });
    expect(pdLiveDisconnectSchema.parse({ id: "conn-1" })).toEqual({ id: "conn-1" });
    expect(
      pdLiveUpdateObjectSchema.parse({
        id: "obj-1",
        type: "phasor~",
        x: 240,
        y: 100,
        args: [110]
      })
    ).toEqual({
      id: "obj-1",
      type: "phasor~",
      x: 240,
      y: 100,
      args: [110]
    });

    expect(
      pdLiveReplaceGraphSchema.parse({
        nodes: [
          { id: "obj-1", type: "noise~", x: 90, y: 80 },
          { id: "obj-2", type: "*~", x: 90, y: 130, args: [0.04] },
          { id: "obj-3", type: "dac~", x: 90, y: 190 }
        ],
        connections: [
          { id: "conn-1", sourceId: "obj-1", targetId: "obj-2" },
          { id: "conn-2", sourceId: "obj-2", targetId: "obj-3" }
        ]
      })
    ).toMatchObject({
      nodes: [
        { id: "obj-1", type: "noise~" },
        { id: "obj-2", type: "*~" },
        { id: "obj-3", type: "dac~" }
      ],
      connections: [
        { id: "conn-1", outlet: 0, inlet: 0 },
        { id: "conn-2", outlet: 0, inlet: 0 }
      ]
    });
  });
});
