const badgeStyles: Record<string, string | number> = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0.2rem 0.55rem",
  borderRadius: "999px",
  border: "1px solid #9bb9a2",
  backgroundColor: "#edf8f0",
  color: "#1f4a2f",
  fontSize: "0.75rem",
  fontWeight: 600,
  letterSpacing: "0.01em"
};

export const LOCAL_ONLY_TOOLTIP_TEXT = "Internal connections stay on this device";

export function LocalOnlyBadge(): ReactElement {
  return (
    <span style={badgeStyles} title={LOCAL_ONLY_TOOLTIP_TEXT} aria-label="Local-only mode">
      Local-only mode
    </span>
  );
}
import type { ReactElement } from "react";
