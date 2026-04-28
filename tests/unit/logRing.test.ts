import { describe, expect, test } from "vitest";
import { LogRing } from "../../src/pd/logs.js";

describe("LogRing", () => {
  test("keeps a bounded list of recent process lines", () => {
    const logs = new LogRing(3);

    logs.add("stdout", "one");
    logs.add("stderr", "two\nthree");
    logs.add("stdout", "four");

    expect(logs.entries().map((entry) => [entry.stream, entry.line])).toEqual([
      ["stderr", "two"],
      ["stderr", "three"],
      ["stdout", "four"]
    ]);
  });

  test("detects common Pd load errors", () => {
    const logs = new LogRing(5);

    logs.add("stderr", "foo: couldn't create");
    logs.add("stderr", "error: audio I/O stuck");

    expect(logs.errorSummary()).toEqual([
      "foo: couldn't create",
      "error: audio I/O stuck"
    ]);
  });
});
