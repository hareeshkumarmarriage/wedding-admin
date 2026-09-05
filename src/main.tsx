import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Admin-only enhancements are loaded on demand so the public wedding page
// does not pay the cost of dashboard scripts or their dependencies.
if (window.location.pathname.startsWith("/admin")) {
  void import("./admin-ui-polish.js");
  void import("./admin-advanced.js");
  void import("./admin-final-hardening.js");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.PROD) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      return;
    }

    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    }).catch(() => undefined);
  });
}
