import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { defaultPdSearchDirs, findPdBinary } from "../../src/pd/pdPaths.js";

describe("findPdBinary", () => {
  test("prefers pd.com over pd.exe for console capture on Windows", () => {
    const dir = mkdtempSync(join(tmpdir(), "pd-paths-"));
    try {
      writeFileSync(join(dir, "pd.exe"), "");
      writeFileSync(join(dir, "pd.com"), "");

      expect(findPdBinary({ env: {}, platform: "win32", searchDirs: [dir] })).toBe(join(dir, "pd.com"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("uses PD_EXE when provided", () => {
    const explicit = "C:\\\\Custom Pd\\\\pd.exe";

    expect(findPdBinary({ env: { PD_EXE: explicit }, searchDirs: [] })).toBe(explicit);
  });

  test("finds versioned macOS Pd app bundles", () => {
    const applicationsDir = mkdtempSync(join(tmpdir(), "pd-applications-"));
    const pdBinDir = join(applicationsDir, "Pd-0.56-2.app", "Contents", "Resources", "bin");
    try {
      mkdirSync(pdBinDir, { recursive: true });
      writeFileSync(join(pdBinDir, "pd"), "");

      expect(defaultPdSearchDirs({}, "darwin", [applicationsDir])).toContain(pdBinDir);
    } finally {
      rmSync(applicationsDir, { recursive: true, force: true });
    }
  });

  test("returns null when no binary exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "pd-paths-empty-"));
    try {
      expect(findPdBinary({ searchDirs: [dir], env: {} })).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
