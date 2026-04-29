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

  test("removes an object and incident connections while preserving remaining stable ids", () => {
    const graph = new LivePatchGraph();
    const oscillator = graph.addObject({ type: "osc~", x: 120, y: 80, args: [220] }).node;
    const gain = graph.addObject({ type: "*~", x: 120, y: 130, args: [0.1] }).node;
    const dac = graph.addObject({ type: "dac~", x: 120, y: 190 }).node;
    graph.connect({ sourceId: oscillator.id, targetId: gain.id });
    graph.connect({ sourceId: gain.id, targetId: dac.id });

    const result = graph.removeObject({ id: gain.id });

    expect(result.object.id).toBe("obj-2");
    expect(graph.snapshot()).toEqual({
      nodes: [
        { id: "obj-1", pdIndex: 0, type: "osc~", x: 120, y: 80, args: [220] },
        { id: "obj-3", pdIndex: 1, type: "dac~", x: 120, y: 190, args: [1, 2] }
      ],
      connections: []
    });
    expect(result.messages).toEqual([
      "clear",
      "obj 120 80 osc~ 220",
      "obj 120 190 dac~ 1 2"
    ]);
  });

  test("disconnects an existing connection without changing objects", () => {
    const graph = new LivePatchGraph();
    const oscillator = graph.addObject({ type: "osc~", x: 120, y: 80, args: [220] }).node;
    const gain = graph.addObject({ type: "*~", x: 120, y: 130, args: [0.1] }).node;
    const connection = graph.connect({ sourceId: oscillator.id, targetId: gain.id }).connection;

    const result = graph.disconnect({ id: connection.id });

    expect(result.connection.id).toBe("conn-1");
    expect(graph.snapshot().connections).toEqual([]);
    expect(result.messages).toEqual([
      "clear",
      "obj 120 80 osc~ 220",
      "obj 120 130 *~ 0.1"
    ]);
  });

  test("updates object type, coordinates, and args by rebuilding the live graph", () => {
    const graph = new LivePatchGraph();
    const oscillator = graph.addObject({ type: "osc~", x: 120, y: 80, args: [220] }).node;
    const gain = graph.addObject({ type: "*~", x: 120, y: 130, args: [0.1] }).node;
    graph.connect({ sourceId: oscillator.id, targetId: gain.id });

    const result = graph.updateObject({
      id: oscillator.id,
      type: "phasor~",
      x: 180,
      y: 90,
      args: [110]
    });

    expect(result.object).toMatchObject({
      id: "obj-1",
      pdIndex: 0,
      type: "phasor~",
      x: 180,
      y: 90,
      args: [110]
    });
    expect(result.messages).toEqual([
      "clear",
      "obj 180 90 phasor~ 110",
      "obj 120 130 *~ 0.1",
      "connect 0 0 1 0"
    ]);
  });

  test("replaces the whole graph with a precomposed patch graph", () => {
    const graph = new LivePatchGraph();

    const result = graph.replaceGraph({
      nodes: [
        { id: "obj-10", type: "noise~", x: 90, y: 80 },
        { id: "obj-11", type: "*~", x: 90, y: 130, args: [0.04] },
        { id: "obj-12", type: "dac~", x: 90, y: 190 }
      ],
      connections: [
        { id: "conn-20", sourceId: "obj-10", targetId: "obj-11" },
        { id: "conn-21", sourceId: "obj-11", targetId: "obj-12" }
      ]
    });

    expect(result.livePatch).toEqual({
      nodes: [
        { id: "obj-10", pdIndex: 0, type: "noise~", x: 90, y: 80, args: [] },
        { id: "obj-11", pdIndex: 1, type: "*~", x: 90, y: 130, args: [0.04] },
        { id: "obj-12", pdIndex: 2, type: "dac~", x: 90, y: 190, args: [1, 2] }
      ],
      connections: [
        { id: "conn-20", sourceId: "obj-10", outlet: 0, targetId: "obj-11", inlet: 0 },
        { id: "conn-21", sourceId: "obj-11", outlet: 0, targetId: "obj-12", inlet: 0 }
      ]
    });
    expect(result.messages).toEqual([
      "clear",
      "obj 90 80 noise~",
      "obj 90 130 *~ 0.04",
      "obj 90 190 dac~ 1 2",
      "connect 0 0 1 0",
      "connect 1 0 2 0"
    ]);

    expect(graph.addObject({ type: "lop~", x: 90, y: 240 }).node.id).toBe("obj-13");
  });
});
