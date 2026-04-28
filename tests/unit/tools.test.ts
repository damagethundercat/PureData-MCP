import { describe, expect, test } from "vitest";
import { toToolResult } from "../../src/mcp/tools.js";

describe("toToolResult", () => {
  test("returns valid text content for undefined tool values", () => {
    const result = toToolResult(undefined);

    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({ status: "ok" }, null, 2)
      }
    ]);
    expect(result.structuredContent).toEqual({ status: "ok" });
  });
});
