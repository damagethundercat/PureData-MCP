import { describe, expect, test } from "vitest";
import {
  PARAMETER_LIMITS,
  pdLiveAddObjectSchema,
  pdLiveConnectSchema,
  pdLiveMoveObjectSchema,
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
});
