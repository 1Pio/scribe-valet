import { useState, type FormEvent, type ReactElement } from "react";

type StoragePathSettingsProps = {
  activePath: string;
  onChangePath: (nextPath: string, options: { createIfMissing: boolean }) => Promise<void> | void;
  defaultExpanded?: boolean;
};

export function StoragePathSettings({
  activePath,
  onChangePath,
  defaultExpanded = false
}: StoragePathSettingsProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [nextPath, setNextPath] = useState(activePath);
  const [createIfMissing, setCreateIfMissing] = useState(true);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void onChangePath(nextPath, { createIfMissing });
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

      {!isExpanded ? (
        <button
          onClick={() => {
            setIsExpanded(true);
            setNextPath(activePath);
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

          <label style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={createIfMissing}
              onChange={(event) => {
                setCreateIfMissing(event.currentTarget.checked);
              }}
            />
            Create directory if missing
          </label>

          <div style={{ display: "flex", gap: "0.45rem" }}>
            <button type="submit">Apply path</button>
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
