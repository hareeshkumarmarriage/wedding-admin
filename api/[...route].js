import adminEventCode from "../server/api/admin-event-code.js";
import adminUsers from "../server/api/admin-users.js";
import adminAdvanced from "../server/api/admin-advanced.js";
import analytics from "../server/api/analytics.js";
import driveFile from "../server/api/drive-file.js";
import drive from "../server/api/drive.js";
import eventSecurityStatus from "../server/api/event-security-status.js";
import guestUpload from "../server/api/guest-upload.js";
import guestbook from "../server/api/guestbook.js";
import media from "../server/api/media.js";
import rsvp from "../server/api/rsvp.js";
import unlock from "../server/api/unlock.js";
import visitorSession from "../server/api/visitor-session.js";

const handlers = Object.freeze({
  "admin-event-code": adminEventCode,
  "admin-users": adminUsers,
  "admin-advanced": adminAdvanced,
  analytics,
  "drive-file": driveFile,
  drive,
  "event-security-status": eventSecurityStatus,
  "guest-upload": guestUpload,
  guestbook,
  media,
  rsvp,
  unlock,
  "visitor-session": visitorSession,
});

function getRoute(req) {
  const queryRoute = req?.query?.route;
  if (Array.isArray(queryRoute) && queryRoute.length) return queryRoute.map(String).join("/").replace(/^\/+|\/+$/g, "");
  if (typeof queryRoute === "string" && queryRoute.trim()) return queryRoute.trim().replace(/^\/+|\/+$/g, "");
  const rawUrl = String(req?.url || "");
  if (rawUrl) {
    try {
      const pathname = new URL(rawUrl, `https://${req?.headers?.host || "localhost"}`).pathname;
      const match = pathname.match(/^\/api\/(.+?)(?:\/)?$/);
      if (match) return decodeURIComponent(match[1]).replace(/^\/+|\/+$/g, "");
    } catch {
      const pathname = rawUrl.split("?", 1)[0].split("#", 1)[0];
      const match = pathname.match(/^\/api\/(.+?)(?:\/)?$/);
      if (match) return decodeURIComponent(match[1]).replace(/^\/+|\/+$/g, "");
    }
  }
  return "";
}

export default async function handler(req, res) {
  const name = getRoute(req);
  const target = handlers[name];
  if (!target) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(404).json({ ok: false, error: "API route not found.", route: name || null });
  }
  try { return await target(req, res); }
  catch (error) {
    console.error(`[api/${name}]`, error);
    if (res.headersSent) return;
    return res.status(500).json({ ok: false, error: "Internal server error." });
  }
}
