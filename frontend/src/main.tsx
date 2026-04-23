/**
 * main.tsx – application entry point.
 *
 * WHY StrictMode:
 *   React StrictMode detects side effects and deprecated APIs during
 *   development.  It has no effect in production builds.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./app/App";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found. Check index.html.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
