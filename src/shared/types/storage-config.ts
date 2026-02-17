export const STORAGE_CATEGORIES = ["models", "config", "tools", "logs"] as const;

export type StorageCategory = (typeof STORAGE_CATEGORIES)[number];

export type StoragePathMap = Record<StorageCategory, string>;

export type StorageCategoryOverrides = Partial<StoragePathMap>;

export type StorageOverrideConfig = {
  customRoot: string | null;
  categoryOverrides?: StorageCategoryOverrides;
};

export type StorageTopologySnapshot = {
  defaults: StoragePathMap;
  override: StorageOverrideConfig;
};

export type ActiveStoragePaths = StoragePathMap;

export type StoragePathsState = {
  defaults: StoragePathMap;
  active: ActiveStoragePaths;
  override: StorageOverrideConfig;
};
