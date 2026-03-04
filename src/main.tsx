import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isDynamicImportError, guardedReload } from "./lib/lazyLoadRecovery";

// Global handler for Vite preload/chunk errors (fires BEFORE React.lazy catches them)
window.addEventListener('vite:preloadError', (event: any) => {
  event.preventDefault(); // prevent default console error
  guardedReload();
});

// Fallback: catch any unhandled dynamic-import errors at window level
window.addEventListener('unhandledrejection', (event) => {
  if (isDynamicImportError(event.reason)) {
    event.preventDefault();
    guardedReload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
