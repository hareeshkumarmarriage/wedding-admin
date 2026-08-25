import adminEventCode from "../server/api/admin-event-code.js";
import adminUsers from "../server/api/admin-users.js";
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

const handlers = {
  "admin-event-code": adminEventCode,
  "admin-users": adminUsers,
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
};

export default async function handler(req, res) {
  const rawRoute = req.query?.route;
  const route = Array.isArray(rawRoute) ? rawRoute[0] : rawRoute;
  const name = String(route || "").replace(/^\/|\/$/g, "");
  const target = handlers[name];

  if (!target) {
    res.status(404).json({ ok: false, error: "API route not found." });
    return;
  }

  return target(req, res);
}
