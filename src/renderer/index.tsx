import { createRoot } from "react-dom/client";

type RuntimeBridge = {
  ping: () => Promise<{ ok: boolean }>;
};

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
    <main>
      <h1>Scribe-Valet</h1>
      <p>Runtime bridge status: {pingResult.ok ? "connected" : "unavailable"}</p>
    </main>
  );
}

void render();
