import type { ReactElement } from "react";
import type { ModelLifecycleSnapshot } from "../../shared/types/model-lifecycle";

type DownloadBundleModalProps = {
  snapshot: ModelLifecycleSnapshot;
  installPath: string;
  onConfirm: () => void;
};

export function DownloadBundleModal({
  snapshot,
  installPath,
  onConfirm
}: DownloadBundleModalProps): ReactElement | null {
  const shouldRender = shouldShowDownloadDialog(snapshot);

  if (!shouldRender) {
    return null;
  }

  const displayNameByArtifactId = new Map(
    snapshot.artifacts.map((artifact) => [artifact.artifactId, artifact.displayName])
  );

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
      <p style={{ margin: "0.4rem 0" }}>
        Location: <code>{installPath}</code>
      </p>

      <ul style={{ margin: "0.35rem 0", paddingInlineStart: "1.1rem" }}>
        {snapshot.downloadProgress.map((line) => {
          const displayName = displayNameByArtifactId.get(line.artifactId) ?? line.label;
          return (
            <li key={line.artifactId}>
              {displayName} - {Math.round(line.percent)}% ({line.status})
            </li>
          );
        })}
      </ul>

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
