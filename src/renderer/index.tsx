import { useEffect, useMemo, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./app/AppShell";
import { LocalOnlyBadge } from "./components/LocalOnlyBadge";
import { StoragePathSettings } from "./model-lifecycle/StoragePathSettings";
import { PrivacySettingsPage } from "./settings/privacy/PrivacySettingsPage";
import type { RuntimeBridge } from "../preload/index";
import type { ModelLifecycleSnapshot } from "../shared/types/model-lifecycle";

declare global {
  interface Window {
    scribeValet: RuntimeBridge;
  }
}

type ActiveView = "workspace" | "settings";

function RendererRoot(): ReactElement {
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("workspace");
  const [modelSnapshot, setModelSnapshot] = useState<ModelLifecycleSnapshot | null>(null);

  useEffect(() => {
    let disposed = false;

    const load = async (): Promise<void> => {
      const [pingResult, snapshot] = await Promise.all([
        window.scribeValet.ping(),
        window.scribeValet.modelLifecycle.getState()
      ]);

      if (disposed) {
        return;
      }

      setBridgeConnected(pingResult.ok);
      setModelSnapshot(snapshot);
    };

    void load();

    const unsubscribe = window.scribeValet.modelLifecycle.onStatusChanged((snapshot) => {
      if (!disposed) {
        setModelSnapshot(snapshot);
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  const activeModelPath = useMemo(() => {
    if (!modelSnapshot) {
      return "(pending path resolution)";
    }

    const matchedLine = modelSnapshot.diagnostics.lines.find((line) => line.startsWith("Model root: "));
    if (!matchedLine) {
      return "%LOCALAPPDATA%\\Scribe-Valet\\models";
    }

    return matchedLine.replace("Model root: ", "");
  }, [modelSnapshot]);

  return (
    <AppShell
      runtimeStatusBridge={window.scribeValet.runtimeStatus}
      modelLifecycleBridge={window.scribeValet.modelLifecycle}
      isVoiceActive={true}
    >
      <main>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem"
          }}
        >
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <h1>Scribe-Valet</h1>
            <LocalOnlyBadge />
          </div>
          <nav aria-label="Primary navigation" style={{ display: "flex", gap: "0.5rem" }}>
            <button
              aria-pressed={activeView === "workspace"}
              onClick={() => {
                setActiveView("workspace");
              }}
            >
              Workspace
            </button>
            <button
              aria-pressed={activeView === "settings"}
              onClick={() => {
                setActiveView("settings");
              }}
            >
              Settings
            </button>
          </nav>
        </header>

        {activeView === "workspace" ? (
          <section>
            <p>Runtime bridge status: {bridgeConnected ? "connected" : "unavailable"}</p>
          </section>
        ) : (
          <section
            aria-label="Settings"
            style={{ display: "grid", gap: "0.75rem", marginTop: "0.5rem" }}
          >
            <header>
              <h2 style={{ margin: 0 }}>Settings</h2>
              <p style={{ margin: "0.35rem 0 0", color: "#334154" }}>
                Manage local model storage and privacy controls.
              </p>
            </header>
            <StoragePathSettings
              activePath={activeModelPath}
              expectedPathHint={activeModelPath}
              onChangePath={(nextPath) => {
                return window.scribeValet.modelLifecycle.changePath(nextPath).then((snapshot) => {
                  setModelSnapshot(snapshot);
                });
              }}
            />
            <section
              aria-label="Privacy settings"
              style={{ border: "1px solid #d9d9d9", borderRadius: "0.75rem", padding: "0.75rem" }}
            >
              <h3 style={{ marginTop: 0 }}>Privacy</h3>
              <PrivacySettingsPage runtimeTrustBridge={window.scribeValet.runtimeTrust} />
            </section>
          </section>
        )}
      </main>
    </AppShell>
  );
}

async function render(): Promise<void> {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Renderer root element is missing.");
  }

  const root = createRoot(rootElement);
  root.render(<RendererRoot />);
}

void render();
