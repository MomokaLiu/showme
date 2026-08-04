import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { registerServiceWorker } from "./registerServiceWorker";
import { InventoryProvider } from "./store/itemStore";
import "./styles.css";
import { reminderService } from "./services/reminderService";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <InventoryProvider>
      <App />
    </InventoryProvider>
  </React.StrictMode>,
);

registerServiceWorker();
void reminderService.initialize().catch(() => undefined);
