import { describe, expect, test } from "vitest";
import { LivePatchGraph } from "../../src/pd/livePatch.js";

describe("LivePatchGraph", () => {
  test("adds safe palette objects as Pd canvas messages", () => {
    const graph = new LivePatchGraph();

    const result = graph.addObject({
      type: "osc~",
      x: 120,
      y: 80,
      args: [440]
    });

    expect(result.node).toMatchObject({
      id: "obj-1",
      pdIndex: 0,
      type: "osc~",
      x: 120,
      y: 80,
      args: [440]
    });
    expect(result.messages).toEqual(["obj 120 80 osc~ 440"]);
  });

  test("connects objects by stable ids while emitting Pd creation-order indexes", () => {
    const graph = new LivePatchGraph();
    const oscillator = graph.addObject({ type: "osc~", x: 120, y: 80, args: [220] }).node;
    const gain = graph.addObject({ type: "*~", x: 120, y: 130, args: [0.1] }).node;

    const result = graph.connect({
      sourceId: oscillator.id,
      outlet: 0,
      targetId: gain.id,
      inlet: 0
    });

    expect(result.connection).toMatchObject({
      id: "conn-1",
      sourceId: "obj-1",
      targetId: "obj-2"
    });
    expect(result.messages).toEqual(["connect 0 0 1 0"]);
  });

  test("rejects direct signal connections into dac~ without a gain object", () => {
    const graph = new LivePatchGraph();
    const oscillator = graph.addObject({ type: "osc~", x: 120, y: 80, args: [220] }).node;
    const dac = graph.addObject({ type: "dac~", x: 120, y: 180 }).node;

    expect(() =>
      graph.connect({
        sourceId: oscillator.id,
        outlet: 0,
        targetId: dac.id,
        inlet: 0
      })
    ).toThrow(/through \*~ gain/);
  });

  test("moves an object by rebuilding the live canvas with updated coordinates", () => {
    const graph = new LivePatchGraph();
    const oscillator = graph.addObject({ type: "osc~", x: 120, y: 80, args: [220] }).node;
    const gain = graph.addObject({ type: "*~", x: 120, y: 130, args: [0.1] }).node;
    graph.connect({ sourceId: oscillator.id, targetId: gain.id });

    const result = graph.moveObject({
      id: oscillator.id,
      x: 260,
      y: 90
    });

    expect(result.node.x).toBe(260);
    expect(result.messages).toEqual([
      "clear",
      "obj 260 90 osc~ 220",
      "obj 120 130 *~ 0.1",
      "connect 0 0 1 0"
    ]);
  });
});
