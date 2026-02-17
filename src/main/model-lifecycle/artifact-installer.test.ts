import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ArtifactInstallError,
  installArtifact,
  type ArtifactInstallDescriptor
} from "./artifact-installer";
import { JsonDownloadResumeStore } from "./download-resume-store";

describe("installArtifact", () => {
  it("downloads and promotes fresh artifacts", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "artifact-installer-"));
    const installDir = path.join(root, "models");
    const store = new JsonDownloadResumeStore(path.join(root, "resume", "state.json"));
    const content = Buffer.from("fresh-model-data");

    const artifact: ArtifactInstallDescriptor = {
      id: "stt",
      fileName: "stt.bin",
      downloadUrl: "https://example.test/stt.bin",
      expectedSha256: sha256(content)
    };

    const fetchImpl = vi.fn(async () =>
      new Response(content, {
        status: 200,
        headers: {
          etag: '"etag-1"'
        }
      })
    );

    const result = await installArtifact({
      artifact,
      installDir,
      resumeStore: store,
      fetchImpl
    });

    await expect(readFile(result.filePath)).resolves.toEqual(content);
    await expect(stat(`${result.filePath}.partial`)).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(store.get("stt")).resolves.toBeNull();
  });

  it("resumes download with Range and If-Range when metadata exists", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "artifact-installer-"));
    const installDir = path.join(root, "models");
    const store = new JsonDownloadResumeStore(path.join(root, "resume", "state.json"));

    const partial = Buffer.from("hello ");
    const remaining = Buffer.from("world");
    const expected = Buffer.concat([partial, remaining]);
    const artifact: ArtifactInstallDescriptor = {
      id: "tts",
      fileName: "tts.onnx",
      downloadUrl: "https://example.test/tts.onnx",
      expectedSha256: sha256(expected)
    };

    const partialPath = path.join(installDir, `${artifact.fileName}.partial`);
    await mkdir(installDir, { recursive: true });
    await writeFile(partialPath, partial);
    await store.set({
      artifactId: artifact.id,
      partialPath,
      bytesDownloaded: partial.length,
      etag: '"etag-resume"',
      lastModified: null,
      updatedAtMs: 0
    });

    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      expect(init?.headers).toMatchObject({
        Range: `bytes=${partial.length}-`,
        "If-Range": '"etag-resume"'
      });

      return new Response(remaining, {
        status: 206,
        headers: {
          etag: '"etag-resume"'
        }
      });
    });

    const result = await installArtifact({
      artifact,
      installDir,
      resumeStore: store,
      fetchImpl
    });

    await expect(readFile(result.filePath)).resolves.toEqual(expected);
    expect(result.resumedFromBytes).toBe(partial.length);
    await expect(store.get(artifact.id)).resolves.toBeNull();
  });

  it("fails on checksum mismatch and never promotes corrupted file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "artifact-installer-"));
    const installDir = path.join(root, "models");
    const store = new JsonDownloadResumeStore(path.join(root, "resume", "state.json"));

    const artifact: ArtifactInstallDescriptor = {
      id: "llm",
      fileName: "llm.gguf",
      downloadUrl: "https://example.test/llm.gguf",
      expectedSha256: sha256(Buffer.from("expected"))
    };

    const fetchImpl = vi.fn(async () =>
      new Response(Buffer.from("corrupted"), {
        status: 200
      })
    );

    const rejection = installArtifact({
      artifact,
      installDir,
      resumeStore: store,
      fetchImpl
    });

    await expect(
      rejection
    ).rejects.toBeInstanceOf(ArtifactInstallError);

    await expect(
      rejection
    ).rejects.toMatchObject({
      diagnostics: {
        code: "integrity-mismatch",
        hint: "clear-partial-and-retry"
      }
    });

    await expect(stat(path.join(installDir, artifact.fileName))).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(store.get(artifact.id)).resolves.toBeNull();
  });

  it("restarts full download when resume validator no longer matches", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "artifact-installer-"));
    const installDir = path.join(root, "models");
    const store = new JsonDownloadResumeStore(path.join(root, "resume", "state.json"));

    const oldPartial = Buffer.from("stale");
    const freshData = Buffer.from("fresh-content");
    const artifact: ArtifactInstallDescriptor = {
      id: "stt-restart",
      fileName: "stt-restart.bin",
      downloadUrl: "https://example.test/stt-restart.bin",
      expectedSha256: sha256(freshData)
    };

    const partialPath = path.join(installDir, `${artifact.fileName}.partial`);
    await mkdir(installDir, { recursive: true });
    await writeFile(partialPath, oldPartial);
    await store.set({
      artifactId: artifact.id,
      partialPath,
      bytesDownloaded: oldPartial.length,
      etag: '"stale-etag"',
      lastModified: null,
      updatedAtMs: 0
    });

    const fetchImpl: typeof fetch = vi
      .fn()
      .mockImplementationOnce(async (_input, init) => {
        expect(init?.headers).toMatchObject({
          Range: `bytes=${oldPartial.length}-`,
          "If-Range": '"stale-etag"'
        });

        return new Response(freshData, {
          status: 200,
          headers: {
            etag: '"new-etag"'
          }
        });
      })
      .mockImplementationOnce(async (_input, init) => {
        expect(init?.headers).toEqual({});
        return new Response(freshData, {
          status: 200,
          headers: {
            etag: '"new-etag"'
          }
        });
      });

    const result = await installArtifact({
      artifact,
      installDir,
      resumeStore: store,
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.restartedFromScratch).toBe(true);
    await expect(readFile(result.filePath)).resolves.toEqual(freshData);
    await expect(store.get(artifact.id)).resolves.toBeNull();
  });

  it("classifies http failures with deterministic retry hint", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "artifact-installer-"));
    const installDir = path.join(root, "models");
    const store = new JsonDownloadResumeStore(path.join(root, "resume", "state.json"));

    const artifact: ArtifactInstallDescriptor = {
      id: "server-failure",
      fileName: "server-failure.bin",
      downloadUrl: "https://example.test/server-failure.bin",
      expectedSha256: sha256(Buffer.from("irrelevant"))
    };

    const fetchImpl = vi.fn(async () => new Response("bad", { status: 503 }));

    await expect(
      installArtifact({
        artifact,
        installDir,
        resumeStore: store,
        fetchImpl
      })
    ).rejects.toMatchObject({
      diagnostics: {
        code: "http-error",
        hint: "retryable-server",
        httpStatus: 503
      }
    });
  });
});

function sha256(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}
