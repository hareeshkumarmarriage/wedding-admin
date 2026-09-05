import { useState } from "react";
import { Globe2 } from "lucide-react";
import AdminControlCenterV5 from "./AdminControlCenterV5";
import WebsiteControlPanel from "./WebsiteControlPanel";

const TOKEN_KEY = "wedding-admin-access-token";

export default function AdminControlCenterEnhanced() {
  const [websiteOpen, setWebsiteOpen] = useState(false);
  const token = sessionStorage.getItem(TOKEN_KEY) || "";

  return <>
    <AdminControlCenterV5 />
    {token && <button type="button" onClick={() => setWebsiteOpen(true)} className="fixed bottom-4 left-4 z-[110] inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border bg-background px-4 text-sm font-semibold shadow-xl hover:bg-muted sm:bottom-5 sm:left-5">
      <Globe2 size={17} /> Website
    </button>}
    {websiteOpen && token && <WebsiteControlPanel token={token} onClose={() => setWebsiteOpen(false)} />}
  </>;
}
