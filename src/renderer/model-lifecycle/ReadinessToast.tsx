import { useEffect, useState, type ReactElement } from "react";

const FADE_AFTER_MS = 1800;
const HIDE_AFTER_MS = 2600;

type ReadinessToastProps = {
  visible: boolean;
  onCopyReport: () => void;
};

export function ReadinessToast({ visible, onCopyReport }: ReadinessToastProps): ReactElement | null {
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading">("hidden");

  useEffect(() => {
    if (!visible) {
      setPhase("hidden");
      return;
    }

    setPhase("visible");

    const fadeTimer = setTimeout(() => {
      setPhase("fading");
    }, FADE_AFTER_MS);
    const hideTimer = setTimeout(() => {
      setPhase("hidden");
    }, HIDE_AFTER_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [visible]);

  if (phase === "hidden") {
    return null;
  }

  return (
    <section
      aria-live="polite"
      aria-label="Readiness confirmation"
      style={{
        border: "1px solid #9ed0a8",
        background: "#f2fff5",
        borderRadius: "0.75rem",
        padding: "0.625rem 0.875rem",
        marginBottom: "0.75rem",
        opacity: phase === "fading" ? 0 : 1,
        transition: "opacity 500ms ease"
      }}
    >
      <strong>Ready to use locally.</strong>
      <p style={{ margin: "0.35rem 0" }}>
        Startup checks passed. You can copy the full readiness report at any time.
      </p>
      <button onClick={onCopyReport}>Copy readiness report</button>
    </section>
  );
}
