import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/globals.css";
import { initializeService } from "./service";
initializeService().finally(() =>
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  ),
);
