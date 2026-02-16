import { createRoot } from "react-dom/client";
import { AppShell } from "./app/AppShell";
import { LocalOnlyBadge } from "./components/LocalOnlyBadge";
import { PrivacySettingsPage } from "./settings/privacy/PrivacySettingsPage";
import type { RuntimeBridge } from "../preload/index";

declare global {
  interface Window {
    scribeValet: RuntimeBridge;
  }
}

async function render(): Promise<void> {
  const pingResult = await window.scribeValet.ping();
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Renderer root element is missing.");
  }

  const root = createRoot(rootElement);
  root.render(
    <AppShell runtimeStatusBridge={window.scribeValet.runtimeStatus} isVoiceActive={true}>
      <main>
        <header style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <h1>Scribe-Valet</h1>
          <LocalOnlyBadge />
        </header>
        <p>Runtime bridge status: {pingResult.ok ? "connected" : "unavailable"}</p>
        <PrivacySettingsPage runtimeTrustBridge={window.scribeValet.runtimeTrust} />
      </main>
    </AppShell>
  );
}

void render();
