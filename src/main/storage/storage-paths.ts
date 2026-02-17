import path from "node:path";
import { mkdir } from "node:fs/promises";
import { app } from "electron";
import {
  STORAGE_CATEGORIES,
  type ActiveStoragePaths,
  type StorageCategory,
  type StorageCategoryOverrides,
  type StorageOverrideConfig,
  type StoragePathMap,
  type StoragePathsState
} from "../../shared/types/storage-config";

type AppPathName = "home" | "userData" | "logs";

type AppPathReader = {
  getPath: (name: AppPathName) => string;
};

const DEFAULT_APP_DIRECTORY = ".scribe-valet";

export function getDefaultStoragePaths(pathReader: AppPathReader = app): StoragePathMap {
  const homeDirectory = pathReader.getPath("home");
  const userDataDirectory = pathReader.getPath("userData");
  const logsDirectory = pathReader.getPath("logs");
  const sharedHomeRoot = path.join(homeDirectory, DEFAULT_APP_DIRECTORY);

  return {
    models: path.join(sharedHomeRoot, "models"),
    config: path.join(userDataDirectory, "config"),
    tools: path.join(sharedHomeRoot, "tools"),
    logs: path.join(logsDirectory, "scribe-valet")
  };
}

export function normalizeStorageOverride(
  override: Partial<StorageOverrideConfig> | null | undefined
): StorageOverrideConfig {
  const customRoot = normalizePathOrNull(override?.customRoot);
  const categoryOverrides: StorageCategoryOverrides = {};

  for (const category of STORAGE_CATEGORIES) {
    const categoryOverride = override?.categoryOverrides?.[category];
    if (typeof categoryOverride === "string" && categoryOverride.trim().length > 0) {
      categoryOverrides[category] = path.normalize(categoryOverride.trim());
    }
  }

  return {
    customRoot,
    categoryOverrides
  };
}

export function resolveStoragePaths(options: {
  defaults: StoragePathMap;
  override?: Partial<StorageOverrideConfig> | null;
}): StoragePathsState {
  const normalizedOverride = normalizeStorageOverride(options.override);
  const categoryOverrides = normalizedOverride.categoryOverrides ?? {};
  const activePaths = {} as ActiveStoragePaths;

  for (const category of STORAGE_CATEGORIES) {
    const perCategoryOverride = categoryOverrides[category];

    if (perCategoryOverride) {
      activePaths[category] = perCategoryOverride;
      continue;
    }

    if (normalizedOverride.customRoot) {
      activePaths[category] = path.join(normalizedOverride.customRoot, category);
      continue;
    }

    activePaths[category] = path.normalize(options.defaults[category]);
  }

  return {
    defaults: { ...options.defaults },
    override: normalizedOverride,
    active: activePaths
  };
}

export async function ensureStorageDirectories(
  activePaths: ActiveStoragePaths,
  mkdirImpl: (target: string, options: { recursive: true }) => Promise<unknown> = mkdir
): Promise<void> {
  const targets = STORAGE_CATEGORIES.map((category) => activePaths[category]);
  await Promise.all(targets.map((target) => mkdirImpl(target, { recursive: true })));
}

export async function resolveAndEnsureStoragePaths(options: {
  defaults: StoragePathMap;
  override?: Partial<StorageOverrideConfig> | null;
  mkdirImpl?: (target: string, options: { recursive: true }) => Promise<unknown>;
}): Promise<StoragePathsState> {
  const resolved = resolveStoragePaths(options);
  await ensureStorageDirectories(resolved.active, options.mkdirImpl ?? mkdir);
  return resolved;
}

function normalizePathOrNull(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  return path.normalize(normalized);
}

export function resolvePathFromRoot(root: string, category: StorageCategory): string {
  return path.join(root, category);
}
