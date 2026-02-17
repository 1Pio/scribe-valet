import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  clearResumeMetadata,
  type DownloadResumeEntry,
  type DownloadResumeStore
} from "./download-resume-store";
import { sha256File } from "./integrity";

export type InstallFailureCode =
  | "network-error"
  | "http-error"
  | "integrity-mismatch"
  | "filesystem-error";

export type InstallFailureHint =
  | "retryable-network"
  | "retryable-server"
  | "manual-check-url"
  | "clear-partial-and-retry"
  | "check-disk-permissions";

export interface InstallFailureDiagnostics {
  artifactId: string;
  code: InstallFailureCode;
  hint: InstallFailureHint;
  message: string;
  httpStatus: number | null;
  resumedFromBytes: number;
  restartedFromScratch: boolean;
  expectedSha256: string;
  actualSha256: string | null;
}

export class ArtifactInstallError extends Error {
  public readonly diagnostics: InstallFailureDiagnostics;

  public constructor(diagnostics: InstallFailureDiagnostics) {
    super(diagnostics.message);
    this.name = "ArtifactInstallError";
    this.diagnostics = diagnostics;
  }
}

export interface ArtifactInstallDescriptor {
  id: string;
  fileName: string;
  downloadUrl: string;
  expectedSha256: string;
}

export interface InstallArtifactOptions {
  artifact: ArtifactInstallDescriptor;
  installDir: string;
  resumeStore: DownloadResumeStore;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

export interface InstallArtifactResult {
  artifactId: string;
  filePath: string;
  resumedFromBytes: number;
  restartedFromScratch: boolean;
  sha256: string;
}

type DownloadResponse = {
  response: Response;
  restartedFromScratch: boolean;
  resumedFromBytes: number;
};

export async function installArtifact(
  options: InstallArtifactOptions
): Promise<InstallArtifactResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const artifact = options.artifact;

  const finalPath = path.join(options.installDir, artifact.fileName);
  const partialPath = `${finalPath}.partial`;

  await mkdir(options.installDir, { recursive: true });

  const resumeEntry = await options.resumeStore.get(artifact.id);
  const existingBytes = await readPartialSize(partialPath);
  const initialBytes = existingBytes > 0 ? existingBytes : 0;

  try {
    const download = await downloadWithResumeFallback({
      artifact,
      partialPath,
      resumeEntry,
      initialBytes,
      resumeStore: options.resumeStore,
      fetchImpl,
      signal: options.signal
    });

    const digest = await sha256File(partialPath);
    if (digest.toLowerCase() !== artifact.expectedSha256.toLowerCase()) {
      await clearResumeMetadata(options.resumeStore, artifact.id, partialPath);
      throw new ArtifactInstallError({
        artifactId: artifact.id,
        code: "integrity-mismatch",
        hint: "clear-partial-and-retry",
        message: `Checksum mismatch for ${artifact.id}`,
        httpStatus: null,
        resumedFromBytes: download.resumedFromBytes,
        restartedFromScratch: download.restartedFromScratch,
        expectedSha256: artifact.expectedSha256,
        actualSha256: digest
      });
    }

    await rename(partialPath, finalPath);
    await options.resumeStore.delete(artifact.id);

    return {
      artifactId: artifact.id,
      filePath: finalPath,
      resumedFromBytes: download.resumedFromBytes,
      restartedFromScratch: download.restartedFromScratch,
      sha256: digest
    };
  } catch (error) {
    if (error instanceof ArtifactInstallError) {
      throw error;
    }

    throw classifyUnexpectedError(error, artifact, initialBytes);
  }
}

async function downloadWithResumeFallback(input: {
  artifact: ArtifactInstallDescriptor;
  partialPath: string;
  resumeEntry: DownloadResumeEntry | null;
  initialBytes: number;
  resumeStore: DownloadResumeStore;
  fetchImpl: typeof fetch;
  signal?: AbortSignal;
}): Promise<DownloadResponse> {
  if (input.initialBytes <= 0) {
    const response = await requestArtifact({
      artifact: input.artifact,
      fromBytes: 0,
      validator: null,
      fetchImpl: input.fetchImpl,
      signal: input.signal
    });

    await persistResumeMetadata(
      input.resumeStore,
      input.artifact,
      input.partialPath,
      0,
      response
    );
    await writeResponseToPartial({
      response,
      partialPath: input.partialPath,
      artifact: input.artifact,
      expectedSha256: input.artifact.expectedSha256,
      resumedFromBytes: 0,
      append: false,
      signal: input.signal
    });

    return {
      response,
      restartedFromScratch: false,
      resumedFromBytes: 0
    };
  }

  const validator = getIfRangeValidator(input.resumeEntry);
  let response = await requestArtifact({
    artifact: input.artifact,
    fromBytes: input.initialBytes,
    validator,
    fetchImpl: input.fetchImpl,
    signal: input.signal
  });

  if (response.status === 206) {
    await persistResumeMetadata(
      input.resumeStore,
      input.artifact,
      input.partialPath,
      input.initialBytes,
      response
    );
    await writeResponseToPartial({
      response,
      partialPath: input.partialPath,
      artifact: input.artifact,
      expectedSha256: input.artifact.expectedSha256,
      resumedFromBytes: input.initialBytes,
      append: true,
      signal: input.signal
    });

    return {
      response,
      restartedFromScratch: false,
      resumedFromBytes: input.initialBytes
    };
  }

  if (response.status !== 200) {
    throw new ArtifactInstallError({
      artifactId: input.artifact.id,
      code: "http-error",
      hint: response.status >= 500 ? "retryable-server" : "manual-check-url",
      message: `Unexpected status ${response.status} for ${input.artifact.id}`,
      httpStatus: response.status,
      resumedFromBytes: input.initialBytes,
      restartedFromScratch: false,
      expectedSha256: input.artifact.expectedSha256,
      actualSha256: null
    });
  }

  await rm(input.partialPath, { force: true });
  response = await requestArtifact({
    artifact: input.artifact,
    fromBytes: 0,
    validator: null,
    fetchImpl: input.fetchImpl,
    signal: input.signal
  });

  await persistResumeMetadata(
    input.resumeStore,
    input.artifact,
    input.partialPath,
    0,
    response
  );
  await writeResponseToPartial({
    response,
    partialPath: input.partialPath,
    artifact: input.artifact,
    expectedSha256: input.artifact.expectedSha256,
    resumedFromBytes: 0,
    append: false,
    signal: input.signal
  });

  return {
    response,
    restartedFromScratch: true,
    resumedFromBytes: input.initialBytes
  };
}

async function requestArtifact(input: {
  artifact: ArtifactInstallDescriptor;
  fromBytes: number;
  validator: string | null;
  fetchImpl: typeof fetch;
  signal?: AbortSignal;
}): Promise<Response> {
  const headers: Record<string, string> = {};
  if (input.fromBytes > 0) {
    headers.Range = `bytes=${input.fromBytes}-`;
    if (input.validator) {
      headers["If-Range"] = input.validator;
    }
  }

  let response: Response;
  try {
    response = await input.fetchImpl(input.artifact.downloadUrl, {
      headers,
      signal: input.signal
    });
  } catch (error) {
    throw new ArtifactInstallError({
      artifactId: input.artifact.id,
      code: "network-error",
      hint: "retryable-network",
      message: `Network error downloading ${input.artifact.id}`,
      httpStatus: null,
      resumedFromBytes: input.fromBytes,
      restartedFromScratch: false,
      expectedSha256: input.artifact.expectedSha256,
      actualSha256: null
    });
  }

  if (!response.ok && response.status !== 206) {
    throw new ArtifactInstallError({
      artifactId: input.artifact.id,
      code: "http-error",
      hint: response.status >= 500 ? "retryable-server" : "manual-check-url",
      message: `HTTP ${response.status} downloading ${input.artifact.id}`,
      httpStatus: response.status,
      resumedFromBytes: input.fromBytes,
      restartedFromScratch: false,
      expectedSha256: input.artifact.expectedSha256,
      actualSha256: null
    });
  }

  return response;
}

async function writeResponseToPartial(input: {
  response: Response;
  partialPath: string;
  artifact: ArtifactInstallDescriptor;
  expectedSha256: string;
  resumedFromBytes: number;
  append: boolean;
  signal?: AbortSignal;
}): Promise<void> {
  if (!input.response.body) {
    throw new Error("Missing response body stream");
  }

  const source = Readable.fromWeb(input.response.body as any);
  const destination = createWriteStream(input.partialPath, {
    flags: input.append ? "a" : "w"
  });

  try {
    await pipeline(source, destination, { signal: input.signal });
  } catch (error) {
    throw new ArtifactInstallError({
      artifactId: input.artifact.id,
      code: "network-error",
      hint: "retryable-network",
      message: "Download stream interrupted",
      httpStatus: input.response.status,
      resumedFromBytes: input.resumedFromBytes,
      restartedFromScratch: false,
      expectedSha256: input.expectedSha256,
      actualSha256: null
    });
  }
}

async function persistResumeMetadata(
  resumeStore: DownloadResumeStore,
  artifact: ArtifactInstallDescriptor,
  partialPath: string,
  startBytes: number,
  response: Response
): Promise<void> {
  const next = {
    artifactId: artifact.id,
    partialPath,
    bytesDownloaded: startBytes,
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified"),
    updatedAtMs: Date.now()
  };

  await resumeStore.set(next);
}

function getIfRangeValidator(resumeEntry: DownloadResumeEntry | null): string | null {
  if (!resumeEntry) {
    return null;
  }

  const etag = resumeEntry.etag;
  if (etag && !etag.startsWith("W/")) {
    return etag;
  }

  return resumeEntry.lastModified;
}

async function readPartialSize(partialPath: string): Promise<number> {
  try {
    const metadata = await stat(partialPath);
    return metadata.size;
  } catch (error) {
    if (isMissingFileError(error)) {
      return 0;
    }
    throw error;
  }
}

function classifyUnexpectedError(
  error: unknown,
  artifact: ArtifactInstallDescriptor,
  resumedFromBytes: number
): ArtifactInstallError {
  return new ArtifactInstallError({
    artifactId: artifact.id,
    code: "filesystem-error",
    hint: "check-disk-permissions",
    message:
      error instanceof Error
        ? error.message
        : `Failed to install ${artifact.id}`,
    httpStatus: null,
    resumedFromBytes,
    restartedFromScratch: false,
    expectedSha256: artifact.expectedSha256,
    actualSha256: null
  });
}

function isMissingFileError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const withCode = error as { code?: string };
  return withCode.code === "ENOENT";
}
