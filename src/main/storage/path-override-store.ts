import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { app } from "electron";
import {
  type StorageOverrideConfig,
  type StoragePathMap,
  type StoragePathsState
} from "../../shared/types/storage-config";
import {
  getDefaultStoragePaths,
  normalizeStorageOverride,
  resolveAndEnsureStoragePaths
} from "./storage-paths";

const STORAGE_OVERRIDE_FILE = "storage-path-overrides.json";
const STORAGE_OVERRIDE_VERSION = 1;

type OverrideDocument = {
  version: number;
  customRoot: string | null;
  categoryOverrides?: Record<string, string>;
};

type PathOverrideStoreDependencies = {
  getUserDataPath?: () => string;
  readFileImpl?: (filePath: string, encoding: "utf8") => Promise<string>;
  writeFileImpl?: (filePath: string, content: string, encoding: "utf8") => Promise<void>;
  mkdirImpl?: (target: string, options: { recursive: true }) => Promise<unknown>;
};

export type PathOverrideStore = {
  filePath: string;
  loadOverride: () => Promise<StorageOverrideConfig>;
  saveOverride: (
    override: Partial<StorageOverrideConfig> | null | undefined
  ) => Promise<StorageOverrideConfig>;
  loadResolvedPaths: (options?: {
    defaults?: StoragePathMap;
    mkdirImpl?: (target: string, opts: { recursive: true }) => Promise<unknown>;
  }) => Promise<StoragePathsState>;
};

export function createPathOverrideStore(
  dependencies: PathOverrideStoreDependencies = {}
): PathOverrideStore {
  const getUserDataPath = dependencies.getUserDataPath ?? (() => app.getPath("userData"));
  const readFileImpl = dependencies.readFileImpl ?? readFile;
  const writeFileImpl = dependencies.writeFileImpl ?? writeFile;
  const mkdirImpl = dependencies.mkdirImpl ?? mkdir;
  const filePath = path.join(getUserDataPath(), STORAGE_OVERRIDE_FILE);

  async function loadOverride(): Promise<StorageOverrideConfig> {
    const document = await readOverrideDocument(filePath, readFileImpl);
    return normalizeStorageOverride(document);
  }

  async function saveOverride(
    override: Partial<StorageOverrideConfig> | null | undefined
  ): Promise<StorageOverrideConfig> {
    const normalized = normalizeStorageOverride(override);
    const document: OverrideDocument = {
      version: STORAGE_OVERRIDE_VERSION,
      customRoot: normalized.customRoot,
      categoryOverrides: normalized.categoryOverrides ?? {}
    };

    await mkdirImpl(path.dirname(filePath), { recursive: true });
    await writeFileImpl(filePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
    return normalized;
  }

  async function loadResolvedPaths(options?: {
    defaults?: StoragePathMap;
    mkdirImpl?: (target: string, opts: { recursive: true }) => Promise<unknown>;
  }): Promise<StoragePathsState> {
    const defaults = options?.defaults ?? getDefaultStoragePaths(app);
    const override = await loadOverride();

    return resolveAndEnsureStoragePaths({
      defaults,
      override,
      mkdirImpl: options?.mkdirImpl ?? mkdirImpl
    });
  }

  return {
    filePath,
    loadOverride,
    saveOverride,
    loadResolvedPaths
  };
}

async function readOverrideDocument(
  filePath: string,
  readFileImpl: (filePath: string, encoding: "utf8") => Promise<string>
): Promise<OverrideDocument | null> {
  try {
    const raw = await readFileImpl(filePath, "utf8");
    const parsed = JSON.parse(raw) as OverrideDocument;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }

    throw error;
  }
}

function isMissingFileError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}
