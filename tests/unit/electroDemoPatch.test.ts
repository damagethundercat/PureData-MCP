import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const patchPath = join(process.cwd(), "patches", "electro-rhythm-loop.pd");

describe("electro rhythm demo patch", () => {
  test("includes live-controllable delay effect controls", () => {
    const patch = readFileSync(patchPath, "utf8");

    expect(patch).toContain("netreceive -f 19777");
    expect(patch).toContain("route fxmix delay feedback tone stop");
    expect(patch).toContain("delwrite~ electro-delay 1000");
    expect(patch).toContain("vd~ electro-delay");
    expect(patch).toContain("clip 0 0.35");
    expect(patch).toContain("clip 0 0.65");
    expect(patch).toContain("clip 60 500");
    expect(patch).toContain("clip 300 6000");
  });
});
