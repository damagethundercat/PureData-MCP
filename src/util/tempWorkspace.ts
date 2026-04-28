import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface TempWorkspace {
  dir: string;
  patchPath: string;
  cleanup(): Promise<void>;
}

export async function createTempWorkspace(prefix = "pd-mcp-"): Promise<TempWorkspace> {
  const dir = await mkdtemp(join(tmpdir(), prefix));

  return {
    dir,
    patchPath: join(dir, "patch.pd"),
    async cleanup() {
      await rm(dir, { recursive: true, force: true });
    }
  };
}
