import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./admin-header.css";

createRoot(document.getElementById("root")!).render(<App />);

// The admin control center is React-controlled. Do not load legacy DOM
// enhancement scripts here: they used document-wide mutation observers and
// could repeatedly react to React renders, causing the dashboard to freeze.

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
