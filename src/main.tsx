import { Buffer } from "buffer";

globalThis.Buffer = Buffer;

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { getEluvioConfiguration } from "./lib/utils";
import { useRootStore } from "./stores/useRootStore";
import { useThemeStore } from "./stores/useThemeStore";

getEluvioConfiguration();
useThemeStore.getState().initialize();

void useRootStore.getState().initializeClient();

const rootStore = useRootStore.getState();
window.rootStore = rootStore;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
