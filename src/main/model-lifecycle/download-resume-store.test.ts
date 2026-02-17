import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { JsonDownloadResumeStore } from "./download-resume-store";

describe("JsonDownloadResumeStore", () => {
  it("persists and reads entries by artifact id", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "resume-store-"));
    const statePath = path.join(root, "resume", "state.json");
    const store = new JsonDownloadResumeStore(statePath);

    await store.set({
      artifactId: "stt-model",
      partialPath: "C:/tmp/stt.partial",
      bytesDownloaded: 4096,
      etag: '"strong-etag"',
      lastModified: null,
      updatedAtMs: 0
    });

    await expect(store.get("stt-model")).resolves.toMatchObject({
      artifactId: "stt-model",
      partialPath: "C:/tmp/stt.partial",
      bytesDownloaded: 4096,
      etag: '"strong-etag"'
    });

    const raw = await readFile(statePath, "utf8");
    expect(raw).toContain("stt-model");
  });

  it("drops invalid JSON entries instead of throwing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "resume-store-"));
    const statePath = path.join(root, "resume", "state.json");
    const store = new JsonDownloadResumeStore(statePath);

    await mkdir(path.dirname(statePath), { recursive: true });
    await writeFile(statePath, JSON.stringify({ broken: { bytesDownloaded: -4 } }));

    await store.set({
      artifactId: "ok",
      partialPath: "C:/tmp/ok.partial",
      bytesDownloaded: 2,
      etag: null,
      lastModified: null,
      updatedAtMs: 0
    });

    const raw = await readFile(statePath, "utf8");
    expect(raw).not.toContain("broken");
    await expect(store.get("ok")).resolves.toMatchObject({ artifactId: "ok" });
  });
});
