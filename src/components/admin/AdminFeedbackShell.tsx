import { useEffect, useState } from "react";
import AdminActionFeedback, { type AdminFeedback, ADMIN_FEEDBACK_EVENT } from "./AdminActionFeedback";
import AdminControlCenter from "@/pages/AdminControlCenterV5";

function classify(url: string, method: string) {
  const u = url.toLowerCase();
  const m = method.toUpperCase();
  if (u.includes("admin-advanced?action=publish")) return { title: "Publishing changes…", message: "Updating the live website and recording a new published version." };
  if (u.includes("admin-advanced?action=rollback")) return { title: "Restoring version to Draft…", message: "Preparing the selected published version as a new Draft. The live website will not change yet." };
  if (u.includes("admin-advanced?action=draft")) return { title: "Preparing Draft Preview…", message: "Creating a preview snapshot from your saved Draft. Please wait." };
  if (u.includes("admin-users") && m !== "GET") return { title: "Updating administration…", message: "Saving administrator changes. Please wait." };
  if (u.includes("events")) return { title: m === "POST" ? "Creating event…" : "Saving event…", message: "Saving event changes to the Draft workspace. Please wait." };
  if (u.includes("guestbook")) return { title: "Updating guestbook…", message: "Saving moderation changes. Please wait." };
  if (u.includes("notifications")) return { title: m === "DELETE" ? "Deleting notification…" : "Saving notification…", message: "Updating notification settings. Please wait." };
  if (u.includes("site_settings")) return { title: "Saving Draft…", message: "Saving website settings to the Draft workspace. Your live website is unchanged." };
  if (u.includes("homepage_sections")) return { title: "Saving section layout…", message: "Saving website section visibility and order to Draft. Please wait." };
  if (u.includes("profiles") || u.includes("admin_update_profile")) return { title: "Updating administrator profile…", message: "Saving administration changes. Please wait." };
  if (m === "DELETE") return { title: "Deleting…", message: "Removing the selected item. Please wait." };
  if (m === "PATCH" || m === "PUT") return { title: "Saving changes…", message: "Your changes are being saved to Draft. Please wait." };
  if (m === "POST") return { title: "Saving changes…", message: "Processing your request. Please wait." };
  return null;
}

export default function AdminFeedbackShell() {
  const [feedback, setFeedback] = useState<AdminFeedback | null>(null);

  useEffect(() => {
    const onFeedback = (event: Event) => setFeedback((event as CustomEvent<AdminFeedback>).detail);
    window.addEventListener(ADMIN_FEEDBACK_EVENT, onFeedback);

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method || (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET");
      const action = classify(url, method);
      const isReadLike = method.toUpperCase() === "POST" && (url.includes("rpc/is_admin") || url.includes("action=list_sessions"));
      if (action && !isReadLike) setFeedback({ kind: "loading", ...action });
      try {
        const response = await originalFetch(input, init);
        if (action && !isReadLike) {
          if (response.ok) {
            const success = action.title.includes("Publish")
              ? { title: "Published successfully.", message: "Your saved Draft is now live on the public website." }
              : action.title.includes("Rollback") || action.title.includes("Restoring")
                ? { title: "Rollback restored successfully.", message: "The selected version is now in Draft. Your live website is unchanged." }
                : action.title.includes("Preview")
                  ? { title: "Preview ready.", message: "The saved Draft preview is ready. These changes are not live yet." }
                  : { title: "Draft saved successfully.", message: "Your changes are safely saved in Draft. The live website is unchanged." };
            setFeedback({ kind: "success", ...success });
          } else {
            setFeedback({ kind: "error", title: "Action failed.", message: `The request could not be completed (HTTP ${response.status}). Your previous saved state remains unchanged.`, duration: 9000 });
          }
        }
        return response;
      } catch (error) {
        if (action && !isReadLike) setFeedback({ kind: "error", title: "Connection error.", message: error instanceof Error ? error.message : "The request could not reach the server. Please try again.", duration: 9000 });
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener(ADMIN_FEEDBACK_EVENT, onFeedback);
    };
  }, []);

  return <><AdminControlCenter /><AdminActionFeedback feedback={feedback} onClose={() => setFeedback(null)} /></>;
}
