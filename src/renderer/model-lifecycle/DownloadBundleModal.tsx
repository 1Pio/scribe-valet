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
  const shouldRender =
    snapshot.downloadConfirmation.required ||
    snapshot.state === "downloading" ||
    snapshot.downloadProgress.some((line) => line.status !== "pending");

  if (!shouldRender) {
    return null;
  }

  const displayNameByArtifactId = new Map(
    snapshot.artifacts.map((artifact) => [artifact.artifactId, artifact.displayName])
  );

  return (
    <section
      aria-live="polite"
      aria-label="Model download"
      style={{
        border: "1px solid #c9d4ff",
        background: "#f5f8ff",
        borderRadius: "0.75rem",
        padding: "0.8rem",
        marginBottom: "0.8rem"
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
        <button onClick={onConfirm}>Confirm bundle download</button>
      ) : (
        <p style={{ margin: "0.35rem 0", fontSize: "0.9rem" }}>
          Download progress is observe-only during startup.
        </p>
      )}
    </section>
  );
}
