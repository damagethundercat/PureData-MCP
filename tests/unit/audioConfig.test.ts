import { describe, expect, test } from "vitest";
import { parseOptionalAudioOutDevice } from "../../src/pd/audioConfig.js";

describe("parseOptionalAudioOutDevice", () => {
  test("leaves the Pd default output device untouched when unset", () => {
    expect(parseOptionalAudioOutDevice(undefined)).toBeUndefined();
    expect(parseOptionalAudioOutDevice("")).toBeUndefined();
  });

  test("accepts explicit non-negative integer device numbers", () => {
    expect(parseOptionalAudioOutDevice("1")).toBe(1);
    expect(parseOptionalAudioOutDevice("0")).toBe(0);
  });

  test("rejects non-portable or malformed output device values", () => {
    expect(() => parseOptionalAudioOutDevice("USB-C")).toThrow(/non-negative integer/);
    expect(() => parseOptionalAudioOutDevice("-1")).toThrow(/non-negative integer/);
    expect(() => parseOptionalAudioOutDevice("1.5")).toThrow(/non-negative integer/);
  });
});
