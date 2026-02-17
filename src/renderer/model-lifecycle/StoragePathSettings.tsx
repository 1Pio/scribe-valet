import { useEffect, useState, type FormEvent, type ReactElement } from "react";

type StoragePathSettingsProps = {
  activePath: string;
  onChangePath: (nextPath: string) => Promise<void> | void;
  defaultExpanded?: boolean;
  expectedPathHint?: string;
};

export function StoragePathSettings({
  activePath,
  onChangePath,
  defaultExpanded = false,
  expectedPathHint
}: StoragePathSettingsProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [nextPath, setNextPath] = useState(activePath);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    setNextPath(activePath);
  }, [activePath]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage("");

    try {
      await onChangePath(nextPath);
      setStatusMessage("Storage path updated.");
      setIsExpanded(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to change storage path.";
      setStatusMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      aria-label="Model storage path"
      style={{
        border: "1px solid #d9d9d9",
        borderRadius: "0.75rem",
        padding: "0.75rem",
        marginBottom: "0.75rem"
      }}
    >
      <h3 style={{ margin: 0 }}>Model storage path</h3>
      <p style={{ margin: "0.4rem 0" }}>
        Active path: <code>{activePath}</code>
      </p>
      {expectedPathHint ? (
        <p style={{ margin: "0.4rem 0", fontSize: "0.9rem", color: "#334154" }}>
          Expected models path: <code>{expectedPathHint}</code>
        </p>
      ) : null}

      {!isExpanded ? (
        <button
          onClick={() => {
            setIsExpanded(true);
            setNextPath(activePath);
            setStatusMessage("");
          }}
        >
          Change path directory
        </button>
      ) : null}

      {isExpanded ? (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.45rem" }}>
          <label htmlFor="model-storage-path-input">Directory</label>
          <input
            id="model-storage-path-input"
            value={nextPath}
            onChange={(event) => {
              setNextPath(event.currentTarget.value);
            }}
          />

          <p style={{ margin: 0, fontSize: "0.9rem", color: "#334154" }}>
            Missing directories are created automatically when you apply this path.
          </p>

          <div style={{ display: "flex", gap: "0.45rem" }}>
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Applying..." : "Apply path"}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setIsExpanded(false);
                setNextPath(activePath);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {statusMessage ? (
        <p aria-live="polite" style={{ margin: "0.45rem 0 0", fontSize: "0.9rem" }}>
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
