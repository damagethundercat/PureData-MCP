import { existsSync } from "node:fs";
import { join } from "node:path";

export interface FindPdBinaryOptions {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  searchDirs?: string[];
}

const WINDOWS_DEFAULT_DIRS = [
  "C:\\Program Files\\Pd\\bin",
  "C:\\Program Files (x86)\\Pd\\bin",
  "C:\\Program Files\\Pure Data\\bin",
  "C:\\Program Files (x86)\\Pure Data\\bin"
];

const MACOS_DEFAULT_DIRS = [
  "/Applications/Pd.app/Contents/Resources/bin",
  "/Applications/Pure Data.app/Contents/Resources/bin"
];

const DEFAULT_BINARY_NAMES = process.platform === "win32" ? ["pd.com", "pd.exe"] : ["pd"];

export function defaultPdSearchDirs(env: NodeJS.ProcessEnv = process.env): string[] {
  const dirs: string[] = [];

  if (process.platform === "win32") {
    dirs.push(...WINDOWS_DEFAULT_DIRS);
  } else if (process.platform === "darwin") {
    dirs.push(...MACOS_DEFAULT_DIRS);
  }

  const pathValue = env.PATH ?? env.Path ?? env.path;
  if (pathValue) {
    dirs.push(...pathValue.split(process.platform === "win32" ? ";" : ":").filter(Boolean));
  }

  return dirs;
}

export function findPdBinary(options: FindPdBinaryOptions = {}): string | null {
  const env = options.env ?? process.env;
  const explicit = env.PD_EXE;
  if (explicit) {
    return explicit;
  }

  const searchDirs = options.searchDirs ?? defaultPdSearchDirs(env as NodeJS.ProcessEnv);
  for (const dir of searchDirs) {
    for (const name of DEFAULT_BINARY_NAMES) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}
