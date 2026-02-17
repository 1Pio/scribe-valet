import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createPathOverrideStore } from "./path-override-store";

describe("path override store", () => {
  it("returns an empty override when no file exists", async () => {
    const store = createPathOverrideStore({
      getUserDataPath: () => "/tmp/app-data",
      readFileImpl: vi.fn(async (_filePath: string, _encoding: "utf8") => {
        const error = new Error("missing") as Error & { code: string };
        error.code = "ENOENT";
        throw error;
      }),
      writeFileImpl: vi.fn(
        async (_filePath: string, _content: string, _encoding: "utf8") => undefined
      ),
      mkdirImpl: vi.fn(async (_target: string, _options: { recursive: true }) => undefined)
    });

    await expect(store.loadOverride()).resolves.toEqual({
      customRoot: null,
      categoryOverrides: {}
    });
  });

  it("round-trips serialized overrides without path loss", async () => {
    let diskContent = "";

    const writeFileImpl = vi.fn(
      async (_filePath: string, content: string, _encoding: "utf8") => {
        diskContent = content;
      }
    );

    const store = createPathOverrideStore({
      getUserDataPath: () => "/tmp/app-data",
      readFileImpl: vi.fn(async (_filePath: string, _encoding: "utf8") => {
        if (diskContent.length === 0) {
          const error = new Error("missing") as Error & { code: string };
          error.code = "ENOENT";
          throw error;
        }

        return diskContent;
      }),
      writeFileImpl,
      mkdirImpl: vi.fn(async (_target: string, _options: { recursive: true }) => undefined)
    });

    const expectedRoot = path.join("/my", "root");
    const expectedModels = path.join(expectedRoot, "models");

    await store.saveOverride({
      customRoot: ` ${expectedRoot} `,
      categoryOverrides: {
        models: ` ${expectedModels} `,
        logs: path.join(expectedRoot, "logs")
      }
    });

    expect(writeFileImpl).toHaveBeenCalledTimes(1);

    await expect(store.loadOverride()).resolves.toEqual({
      customRoot: path.normalize(expectedRoot),
      categoryOverrides: {
        models: path.normalize(expectedModels),
        logs: path.normalize(path.join(expectedRoot, "logs"))
      }
    });
  });
});
