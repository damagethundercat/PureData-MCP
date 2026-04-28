import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface FindPdBinaryOptions {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  applicationDirs?: string[];
  platform?: NodeJS.Platform;
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

const MACOS_PD_APP_PATTERN = /^(?:Pd(?:[- ].*)?|Pure Data(?:[- ].*)?)\.app$/i;

function defaultBinaryNames(platform: NodeJS.Platform): string[] {
  return platform === "win32" ? ["pd.com", "pd.exe"] : ["pd"];
}

function guiBinaryNames(platform: NodeJS.Platform): string[] {
  return platform === "win32" ? ["pd.exe", "pd.com"] : ["pd"];
}

export function defaultPdSearchDirs(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  platform: NodeJS.Platform = process.platform,
  applicationDirs: string[] = ["/Applications"]
): string[] {
  const dirs: string[] = [];

  if (platform === "win32") {
    dirs.push(...WINDOWS_DEFAULT_DIRS);
  } else if (platform === "darwin") {
    dirs.push(...MACOS_DEFAULT_DIRS);
    dirs.push(...discoverMacosPdAppDirs(applicationDirs));
  }

  const pathValue = env.PATH ?? env.Path ?? env.path;
  if (pathValue) {
    dirs.push(...pathValue.split(platform === "win32" ? ";" : ":").filter(Boolean));
  }

  return dirs;
}

function discoverMacosPdAppDirs(applicationDirs: string[]): string[] {
  const dirs = new Set<string>();

  for (const applicationDir of applicationDirs) {
    let entries;
    try {
      entries = readdirSync(applicationDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || !MACOS_PD_APP_PATTERN.test(entry.name)) {
        continue;
      }

      const binDir = join(applicationDir, entry.name, "Contents", "Resources", "bin");
      if (existsSync(binDir)) {
        dirs.add(binDir);
      }
    }
  }

  return [...dirs].sort();
}

export function findPdBinary(options: FindPdBinaryOptions = {}): string | null {
  const env = options.env ?? process.env;
  const explicit = env.PD_EXE;
  if (explicit) {
    return explicit;
  }

  return findPdBinaryByNames(options, defaultBinaryNames(options.platform ?? process.platform));
}

export function findPdGuiBinary(options: FindPdBinaryOptions = {}): string | null {
  const env = options.env ?? process.env;
  const explicit = env.PD_GUI_EXE ?? env.PD_EXE;
  if (explicit) {
    return explicit;
  }

  return findPdBinaryByNames(options, guiBinaryNames(options.platform ?? process.platform));
}

function findPdBinaryByNames(options: FindPdBinaryOptions, binaryNames: string[]): string | null {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const searchDirs =
    options.searchDirs ?? defaultPdSearchDirs(env, platform, options.applicationDirs);
  for (const dir of searchDirs) {
    for (const name of binaryNames) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}
