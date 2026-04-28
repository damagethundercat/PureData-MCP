import { describe, expect, test } from "vitest";
import { generateDemoPatch } from "../../src/pd/patchGenerator.js";

describe("generateDemoPatch", () => {
  test("generates a deterministic Vanilla Pd patch with a TCP FUDI control bridge", () => {
    const patch = generateDemoPatch({
      patchId: "test-patch",
      patch: "basic_sine",
      port: 32123,
      editPort: 32124,
      frequency: 440,
      amplitude: 0.05
    });

    expect(patch).toMatchInlineSnapshot(`
      "#N canvas 120 80 760 520 12;
      #X obj 40 40 loadbang;
      #X msg 40 70 MCP_READY test-patch port 32123;
      #X obj 40 100 print;
      #X obj 280 40 netreceive -f 32123;
      #X obj 280 75 route ping dsp freq amp gate stop quit;
      #X msg 280 115 pong;
      #X obj 280 145 print MCP_PONG;
      #X obj 335 115 sel 0 1;
      #X msg 315 145 \\; pd dsp 0;
      #X msg 390 145 \\; pd dsp 1;
      #X obj 390 115 clip 20 20000;
      #X obj 390 145 pack f 20;
      #X obj 390 175 line~;
      #X obj 390 205 osc~;
      #X obj 500 115 clip 0 0.2;
      #X obj 500 145 pack f 20;
      #X obj 500 175 line~;
      #X obj 590 115 sel 0 1;
      #X msg 590 145 0 20;
      #X msg 640 145 1 20;
      #X obj 615 175 line~;
      #X obj 390 245 *~;
      #X obj 390 285 *~;
      #X obj 390 325 hip~ 3;
      #X obj 390 365 dac~ 1 2;
      #X msg 520 245 440;
      #X msg 560 245 0.05;
      #X msg 600 245 1;
      #X obj 40 415 netreceive -f 32124;
      #X obj 40 445 s pd-mcp-live;
      #N canvas 260 120 900 620 mcp-live 0;
      #X restore 40 485 pd mcp-live;
      #X text 40 520 MCP live edit canvas opens when live edit tools send vis 1;
      #X connect 0 0 1 0;
      #X connect 0 0 25 0;
      #X connect 0 0 26 0;
      #X connect 0 0 27 0;
      #X connect 1 0 2 0;
      #X connect 3 0 4 0;
      #X connect 4 0 5 0;
      #X connect 4 1 7 0;
      #X connect 4 2 10 0;
      #X connect 4 3 14 0;
      #X connect 4 4 17 0;
      #X connect 4 5 18 0;
      #X connect 4 6 18 0;
      #X connect 5 0 6 0;
      #X connect 7 0 8 0;
      #X connect 7 1 9 0;
      #X connect 10 0 11 0;
      #X connect 11 0 12 0;
      #X connect 12 0 13 0;
      #X connect 13 0 21 0;
      #X connect 14 0 15 0;
      #X connect 15 0 16 0;
      #X connect 16 0 21 1;
      #X connect 17 0 18 0;
      #X connect 17 1 19 0;
      #X connect 18 0 20 0;
      #X connect 19 0 20 0;
      #X connect 20 0 22 1;
      #X connect 21 0 22 0;
      #X connect 22 0 23 0;
      #X connect 23 0 24 0;
      #X connect 23 0 24 1;
      #X connect 25 0 10 0;
      #X connect 26 0 14 0;
      #X connect 27 0 17 0;
      #X connect 28 0 29 0;
      "
    `);
  });

  test("keeps the v0.1 patch external-free", () => {
    const patch = generateDemoPatch({
      patchId: "external-check",
      patch: "drone",
      port: 32124,
      editPort: 32125,
      frequency: 110,
      amplitude: 0.04
    });

    expect(patch).toContain("netreceive -f 32124");
    expect(patch).toContain("pd mcp-live");
    expect(patch).toContain("s pd-mcp-live");
    expect(patch).toContain("osc~");
    expect(patch).toContain("line~");
    expect(patch).toContain("dac~ 1 2");
    expect(patch).not.toMatch(/iemnet|oscparse|oscformat|unpackOSC|routeOSC/);
  });

  test("avoids dollar substitution in generated control messages", () => {
    const patch = generateDemoPatch({
      patchId: "no-dollar-control",
      patch: "basic_sine",
      port: 32125,
      editPort: 32126,
      frequency: 220,
      amplitude: 0.04
    });

    expect(patch).not.toContain("$1");
    expect(patch).toContain("pack f 20");
  });
});
