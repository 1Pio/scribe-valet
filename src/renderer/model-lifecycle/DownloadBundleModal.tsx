import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import type { ModelLifecycleSnapshot } from "../../shared/types/model-lifecycle";

type DownloadBundleModalProps = {
  snapshot: ModelLifecycleSnapshot;
  installPath: string;
  onConfirm: () => void;
  onChangePath: (nextPath: string) => Promise<void> | void;
  initialPathEditing?: boolean;
};

export function DownloadBundleModal({
  snapshot,
  installPath,
  onConfirm,
  onChangePath,
  initialPathEditing = false
}: DownloadBundleModalProps): ReactElement | null {
  const shouldRender = shouldShowDownloadDialog(snapshot);
  const [isPathEditing, setIsPathEditing] = useState(initialPathEditing);
  const [pathInput, setPathInput] = useState(installPath);
  const [pathMessage, setPathMessage] = useState("");
  const [isSavingPath, setIsSavingPath] = useState(false);

  useEffect(() => {
    setPathInput(installPath);
  }, [installPath]);

  if (!shouldRender) {
    return null;
  }

  const handlePathSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmed = pathInput.trim();
    if (trimmed.length === 0) {
      setPathMessage("Path is required.");
      return;
    }

    setIsSavingPath(true);
    setPathMessage("");
    try {
      await onChangePath(trimmed);
      setPathMessage("Location updated.");
      setIsPathEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update location.";
      setPathMessage(message);
    } finally {
      setIsSavingPath(false);
    }
  };

  const displayNameByArtifactId = new Map(
    snapshot.artifacts.map((artifact) => [artifact.artifactId, artifact.displayName])
  );
  const pendingArtifacts = snapshot.artifacts.filter((artifact) => !artifact.isAvailable);
  const startedDownloads = snapshot.downloadProgress.filter((line) => line.status !== "pending");

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label="Model download"
      style={{
        border: "1px solid #b8c6ef",
        background: "#f8faff",
        borderRadius: "0.75rem",
        padding: "1rem",
        marginBottom: "0.8rem",
        boxShadow: "0 10px 28px rgba(10, 38, 74, 0.14)"
      }}
    >
      <h3 style={{ margin: 0 }}>
        {snapshot.downloadConfirmation.required
          ? "Download required AI model bundle"
          : "Downloading AI model bundle"}
      </h3>
      <div style={{ margin: "0.4rem 0", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span>
          Location: <code>{installPath}</code>
        </span>
        <button
          type="button"
          aria-label="Edit download location"
          title="Edit download location"
          onClick={() => {
            setIsPathEditing(true);
            setPathInput(installPath);
            setPathMessage("");
          }}
          style={{ fontSize: "0.8rem", padding: "0.1rem 0.4rem" }}
        >
          ✎
        </button>
      </div>

      {isPathEditing ? (
        <form onSubmit={handlePathSubmit} style={{ display: "grid", gap: "0.35rem", marginBottom: "0.4rem" }}>
          <label htmlFor="download-modal-path-input">Model location</label>
          <input
            id="download-modal-path-input"
            value={pathInput}
            onChange={(event) => {
              setPathInput(event.currentTarget.value);
            }}
          />
          <p style={{ margin: 0, fontSize: "0.86rem", color: "#334154" }}>
            Missing directories are created automatically when the path is applied.
          </p>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button type="submit" disabled={isSavingPath}>
              {isSavingPath ? "Applying..." : "Apply location"}
            </button>
            <button
              type="button"
              disabled={isSavingPath}
              onClick={() => {
                setIsPathEditing(false);
                setPathInput(installPath);
                setPathMessage("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {pathMessage ? (
        <p aria-live="polite" style={{ margin: "0 0 0.35rem", fontSize: "0.88rem" }}>
          {pathMessage}
        </p>
      ) : null}

      {snapshot.downloadConfirmation.required ? (
        <>
          <p style={{ margin: "0.35rem 0", fontSize: "0.9rem" }}>
            Missing required artifacts will download after you confirm this one-time bundle action:
          </p>
          <ul style={{ margin: "0.35rem 0", paddingInlineStart: "1.1rem" }}>
            {pendingArtifacts.map((artifact) => (
              <li key={artifact.artifactId}>{artifact.displayName}</li>
            ))}
          </ul>
        </>
      ) : (
        <ul style={{ margin: "0.35rem 0", paddingInlineStart: "1.1rem" }}>
          {startedDownloads.map((line) => {
            const displayName = displayNameByArtifactId.get(line.artifactId) ?? line.label;
            if (line.status === "downloading") {
              return (
                <li key={line.artifactId}>
                  {displayName} - {Math.round(line.percent)}% (downloading)
                </li>
              );
            }

            return (
              <li key={line.artifactId}>
                {displayName} - {line.status}
              </li>
            );
          })}
        </ul>
      )}

      {snapshot.downloadConfirmation.required ? (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button onClick={onConfirm}>Confirm bundle download</button>
          <span style={{ fontSize: "0.9rem", color: "#2f4770" }}>
            This starts download and validation for the required models.
          </span>
        </div>
      ) : (
        <p style={{ margin: "0.35rem 0", fontSize: "0.9rem" }}>
          Download progress is observe-only during startup.
        </p>
      )}
    </section>
  );
}

export function shouldShowDownloadDialog(snapshot: ModelLifecycleSnapshot): boolean {
  return (
    snapshot.downloadConfirmation.required ||
    snapshot.state === "downloading" ||
    snapshot.downloadProgress.some((line) => line.status !== "pending")
  );
}
