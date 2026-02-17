import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { resolveAndEnsureStoragePaths, resolveStoragePaths } from "./storage-paths";
import type { StoragePathMap } from "../../shared/types/storage-config";

const DEFAULTS: StoragePathMap = {
  models: path.join("/defaults", "models"),
  config: path.join("/defaults", "config"),
  tools: path.join("/defaults", "tools"),
  logs: path.join("/defaults", "logs")
};

describe("storage path resolver", () => {
  it("uses defaults when no override exists", () => {
    const resolved = resolveStoragePaths({ defaults: DEFAULTS, override: null });

    expect(resolved.active).toEqual(DEFAULTS);
    expect(resolved.override).toEqual({
      customRoot: null,
      categoryOverrides: {}
    });
  });

  it("fans out all categories under custom root", () => {
    const customRoot = path.join("/custom", "storage");
    const resolved = resolveStoragePaths({
      defaults: DEFAULTS,
      override: {
        customRoot
      }
    });

    expect(resolved.active).toEqual({
      models: path.join(customRoot, "models"),
      config: path.join(customRoot, "config"),
      tools: path.join(customRoot, "tools"),
      logs: path.join(customRoot, "logs")
    });
  });

  it("applies per-category overrides before shared root", () => {
    const customRoot = path.join("/custom", "storage");
    const modelPath = path.join("/special", "models");
    const resolved = resolveStoragePaths({
      defaults: DEFAULTS,
      override: {
        customRoot,
        categoryOverrides: {
          models: modelPath
        }
      }
    });

    expect(resolved.active.models).toBe(path.normalize(modelPath));
    expect(resolved.active.config).toBe(path.join(customRoot, "config"));
    expect(resolved.active.tools).toBe(path.join(customRoot, "tools"));
    expect(resolved.active.logs).toBe(path.join(customRoot, "logs"));
  });

  it("creates target directories before applying active paths", async () => {
    const mkdirImpl = vi.fn(async () => undefined);

    await resolveAndEnsureStoragePaths({
      defaults: DEFAULTS,
      override: {
        customRoot: "/custom/root"
      },
      mkdirImpl
    });

    expect(mkdirImpl).toHaveBeenCalledTimes(4);
    expect(mkdirImpl).toHaveBeenCalledWith(path.join("/custom/root", "models"), {
      recursive: true
    });
    expect(mkdirImpl).toHaveBeenCalledWith(path.join("/custom/root", "config"), {
      recursive: true
    });
    expect(mkdirImpl).toHaveBeenCalledWith(path.join("/custom/root", "tools"), {
      recursive: true
    });
    expect(mkdirImpl).toHaveBeenCalledWith(path.join("/custom/root", "logs"), {
      recursive: true
    });
  });
});
