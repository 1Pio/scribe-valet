import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export interface DownloadResumeEntry {
  artifactId: string;
  partialPath: string;
  bytesDownloaded: number;
  etag: string | null;
  lastModified: string | null;
  updatedAtMs: number;
}

type DownloadResumeMap = Record<string, DownloadResumeEntry>;

export interface DownloadResumeStore {
  get(artifactId: string): Promise<DownloadResumeEntry | null>;
  set(entry: DownloadResumeEntry): Promise<void>;
  delete(artifactId: string): Promise<void>;
}

export class JsonDownloadResumeStore implements DownloadResumeStore {
  private readonly stateFilePath: string;

  public constructor(stateFilePath: string) {
    this.stateFilePath = stateFilePath;
  }

  public async get(artifactId: string): Promise<DownloadResumeEntry | null> {
    const state = await this.readState();
    return state[artifactId] ?? null;
  }

  public async set(entry: DownloadResumeEntry): Promise<void> {
    const state = await this.readState();
    state[entry.artifactId] = {
      ...entry,
      updatedAtMs: Date.now()
    };

    await this.writeState(state);
  }

  public async delete(artifactId: string): Promise<void> {
    const state = await this.readState();
    if (!(artifactId in state)) {
      return;
    }

    delete state[artifactId];
    await this.writeState(state);
  }

  private async readState(): Promise<DownloadResumeMap> {
    try {
      const content = await readFile(this.stateFilePath, "utf8");
      const parsed = JSON.parse(content) as unknown;
      if (!parsed || typeof parsed !== "object") {
        return {};
      }

      return sanitizeMap(parsed as Record<string, unknown>);
    } catch (error) {
      if (isFileMissingError(error)) {
        return {};
      }

      throw error;
    }
  }

  private async writeState(state: DownloadResumeMap): Promise<void> {
    await mkdir(path.dirname(this.stateFilePath), { recursive: true });

    const tempPath = `${this.stateFilePath}.tmp`;
    const body = `${JSON.stringify(state, null, 2)}\n`;

    await writeFile(tempPath, body, "utf8");
    await rename(tempPath, this.stateFilePath);
  }
}

export async function clearResumeMetadata(
  store: DownloadResumeStore,
  artifactId: string,
  partialPath: string
): Promise<void> {
  await store.delete(artifactId);
  await rm(partialPath, { force: true });
}

function sanitizeMap(source: Record<string, unknown>): DownloadResumeMap {
  const output: DownloadResumeMap = {};

  for (const [artifactId, value] of Object.entries(source)) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const entry = value as Record<string, unknown>;
    const partialPath =
      typeof entry.partialPath === "string" ? entry.partialPath : null;
    const bytesDownloaded =
      typeof entry.bytesDownloaded === "number" && entry.bytesDownloaded >= 0
        ? entry.bytesDownloaded
        : null;

    if (partialPath === null || bytesDownloaded === null) {
      continue;
    }

    output[artifactId] = {
      artifactId,
      partialPath,
      bytesDownloaded,
      etag: typeof entry.etag === "string" ? entry.etag : null,
      lastModified:
        typeof entry.lastModified === "string" ? entry.lastModified : null,
      updatedAtMs:
        typeof entry.updatedAtMs === "number" ? entry.updatedAtMs : Date.now()
    };
  }

  return output;
}

function isFileMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const withCode = error as { code?: string };
  return withCode.code === "ENOENT";
}
