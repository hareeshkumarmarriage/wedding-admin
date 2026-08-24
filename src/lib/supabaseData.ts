import {
  isSupabaseConfigured,
  supabaseRest,
} from "./supabase";

export { isSupabaseConfigured };

export interface EventRecord {
  id: string;
  slug: string;
  title: string;
  date: string | null;
  description: string;
  cover_image: string | null;
  drive_folder_id: string;
  sort_order: number;
  is_active: boolean;
  photos_enabled: boolean;
  videos_enabled: boolean;
  slideshow_enabled: boolean;
  qr_enabled: boolean;
  venue_name: string | null;
  venue_address: string | null;
  maps_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GuestbookMessage {
  id: string;
  name: string;
  message: string;
  approved: boolean;
  created_at: string;
}

const FALLBACK_FOLDER =
  import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID ||
  "1G5IZFca5VNZdK3zbDLP977zIWvqerZcv";

const FALLBACK: EventRecord[] = [
  ["engagement", "Engagement"],
  ["pre-wedding", "Pre-Wedding Photoshoot"],
  ["lagnapathrika", "Lagnapathrika"],
  ["mangala-snanam", "Mangala Snanam"],
  ["haldi", "Haldi"],
  ["prathanam", "Prathanam"],
  ["upanayanam", "Upanayanam"],
  ["marriage", "Marriage"],
  ["satyanarayana-vratham", "Sathya Narayana Vratham"],
].map(([slug, title], index) => ({
  id: slug,
  slug,
  title,
  date: null,
  description: `${title} memories of Hareesh & Prasanna.`,
  cover_image: null,
  drive_folder_id: FALLBACK_FOLDER,
  sort_order: index,
  is_active: true,
  photos_enabled: true,
  videos_enabled: true,
  slideshow_enabled: true,
  qr_enabled: true,
  venue_name: null,
  venue_address: null,
  maps_url: null,
}));

let cache: {
  at: number;
  data: EventRecord[];
} | null = null;

/* =========================================================
   EVENTS
========================================================= */

export async function getEvents(
  force = false
): Promise<EventRecord[]> {
  if (
    !force &&
    cache &&
    Date.now() - cache.at < 60_000
  ) {
    return cache.data;
  }

  if (!isSupabaseConfigured) {
    return FALLBACK;
  }

  try {
    const data = await supabaseRest<EventRecord[]>(
      "events_public",
      {
        query:
          "select=*&order=sort_order.asc",
      }
    );

    cache = {
      at: Date.now(),
      data,
    };

    return data;
  } catch {
    return FALLBACK;
  }
}

export async function getEvent(
  slug: string
) {
  const events = await getEvents();

  return (
    events.find(
      (item) => item.slug === slug
    ) || null
  );
}

/* =========================================================
   GUESTBOOK
   Uses: guestbook
========================================================= */

export async function submitGuestbook(name: string, message: string, website = "") {
  if (!isSupabaseConfigured) return null;

  const response = await fetch("/api/guestbook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, message, website }),
  });

  let data: { ok?: boolean; error?: string } = {};
  try { data = await response.json(); } catch { /* ignore */ }
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Unable to save your message right now.");
  }
  return null;
}

export async function getApprovedGuestbook(
  limit = 30
): Promise<GuestbookMessage[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  return supabaseRest<GuestbookMessage[]>(
    "guestbook",
    {
      query:
        `select=id,name,message,approved,featured,created_at` +
        `&approved=eq.true` +
        `&order=featured.desc,created_at.desc` +
        `&limit=${limit}`,
    }
  );
}

export async function getPendingGuestbook(
  token: string
): Promise<GuestbookMessage[]> {
  if (!token) {
    throw new Error(
      "Admin session is missing."
    );
  }

  return supabaseRest<GuestbookMessage[]>(
    "guestbook",
    {
      token,
      query:
        "select=id,name,message,approved,moderation_status,featured,created_at" +
        "&moderation_status=eq.pending" +
        "&order=created_at.desc",
    }
  );
}

export async function setGuestbookApproval(
  token: string,
  id: string,
  approved: boolean
) {
  if (!token) {
    throw new Error(
      "Admin session is missing."
    );
  }

  if (!id) {
    throw new Error(
      "Guestbook message ID is missing."
    );
  }

  return supabaseRest(
    "guestbook",
    {
      method: "PATCH",
      token,
      query:
        `id=eq.${encodeURIComponent(id)}`,
      body: { approved },
      prefer: "return=representation",
    }
  );
}

export async function deleteGuestbookMessage(
  token: string,
  id: string
) {
  if (!token) {
    throw new Error(
      "Admin session is missing."
    );
  }

  if (!id) {
    throw new Error(
      "Guestbook message ID is missing."
    );
  }

  return supabaseRest(
    "guestbook",
    {
      method: "DELETE",
      token,
      query:
        `id=eq.${encodeURIComponent(id)}`,
    }
  );
}

export async function writeAdminAudit(
  token: string,
  action: "login" | "logout" | "approve_guestbook" | "delete_guestbook" | "update_event" | "change_event_code" | "reject_guestbook" | "feature_guestbook" | "update_rsvp" | "delete_rsvp" | "create_guest" | "update_guest" | "delete_guest" | "update_settings" | "update_homepage" | "create_notification" | "delete_notification",
  targetId?: string | null,
  details: Record<string, unknown> = {},
) {
  if (!token) return;
  try {
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!authResponse.ok) return;
    const auth = await authResponse.json() as { id?: string };
    const adminId = auth.id;
    if (!adminId) return;
    await supabaseRest("admin_audit_logs", {
      method: "POST",
      token,
      body: { admin_id: adminId, action, target_id: targetId || null, details },
      prefer: "return=minimal",
    });
  } catch {
    // Audit logging must never block the primary admin action.
  }
}


/* =========================================================
   RSVP
========================================================= */

export async function submitRsvp(payload: {
  name: string;
  email?: string;
  phone?: string;
  attending: boolean;
  guest_count: number;
  message?: string;
}) {
  const response = await fetch("/api/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || "Unable to save your RSVP.");
  return data;
}

export interface RsvpRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  attending: boolean;
  guest_count: number;
  message: string;
  created_at: string;
  updated_at: string;
}

export async function getAdminRsvps(token: string) {
  return supabaseRest<RsvpRecord[]>("rsvps", { token, query: "select=*&order=created_at.desc" });
}
export async function updateRsvp(token: string, id: string, patch: Partial<RsvpRecord>) {
  return supabaseRest("rsvps", { method: "PATCH", token, query: `id=eq.${encodeURIComponent(id)}`, body: patch, prefer: "return=representation" });
}
export async function deleteRsvp(token: string, id: string) {
  return supabaseRest("rsvps", { method: "DELETE", token, query: `id=eq.${encodeURIComponent(id)}` });
}

/* =========================================================
   GUESTS
========================================================= */
export interface GuestRecord {
  id: string;
  name: string;
  phone: string | null;
  guest_group: string;
  relationship: string | null;
  invited: boolean;
  rsvp_id: string | null;
  guest_count: number;
  notes: string;
  created_at: string;
  updated_at: string;
}
export async function getGuests(token: string) { return supabaseRest<GuestRecord[]>("guests", { token, query: "select=*&order=created_at.desc" }); }
export async function createGuest(token: string, guest: Partial<GuestRecord>) { return supabaseRest("guests", { method: "POST", token, body: guest, prefer: "return=representation" }); }
export async function updateGuest(token: string, id: string, patch: Partial<GuestRecord>) { return supabaseRest("guests", { method: "PATCH", token, query: `id=eq.${encodeURIComponent(id)}`, body: patch, prefer: "return=representation" }); }
export async function deleteGuest(token: string, id: string) { return supabaseRest("guests", { method: "DELETE", token, query: `id=eq.${encodeURIComponent(id)}` }); }

/* =========================================================
   SITE CONTENT + HOMEPAGE
========================================================= */
export async function getSiteSettings() {
  if (!isSupabaseConfigured) return {} as Record<string, any>;
  try {
    const rows = await supabaseRest<{ key: string; value: any }[]>("site_settings", { query: "select=key,value" });
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  } catch { return {}; }
}
export async function getAdminSettings(token: string) { return supabaseRest<{ key: string; value: any }[]>("site_settings", { token, query: "select=key,value,updated_at&order=key.asc" }); }
export async function saveSiteSetting(token: string, key: string, value: any) { return supabaseRest("site_settings", { method: "POST", token, query: `on_conflict=key`, body: { key, value, updated_at: new Date().toISOString() }, prefer: "resolution=merge-duplicates,return=representation" }); }

export interface HomepageSectionRecord { key: string; label: string; enabled: boolean; sort_order: number; }
export async function getHomepageSections() {
  if (!isSupabaseConfigured) return [] as HomepageSectionRecord[];
  try { return await supabaseRest<HomepageSectionRecord[]>("homepage_sections", { query: "select=*&order=sort_order.asc" }); } catch { return []; }
}
export async function getAdminHomepageSections(token: string) { return supabaseRest<HomepageSectionRecord[]>("homepage_sections", { token, query: "select=*&order=sort_order.asc" }); }
export async function updateHomepageSections(token: string, sections: HomepageSectionRecord[]) {
  for (const [index, section] of sections.entries()) {
    await supabaseRest("homepage_sections", { method: "PATCH", token, query: `key=eq.${encodeURIComponent(section.key)}`, body: { enabled: section.enabled, sort_order: index + 1, updated_at: new Date().toISOString() } });
  }
}

/* =========================================================
   NOTIFICATIONS + AUDIT
========================================================= */
export interface NotificationRecord { id: string; type: string; title: string; message: string; target: string | null; read_at: string | null; created_at: string; }
export async function getNotifications(token: string) { return supabaseRest<NotificationRecord[]>("notifications", { token, query: "select=*&order=created_at.desc&limit=50" }); }
export async function createNotification(token: string, payload: Partial<NotificationRecord>) { return supabaseRest("notifications", { method: "POST", token, body: payload, prefer: "return=representation" }); }
export async function markNotificationRead(token: string, id: string) { return supabaseRest("notifications", { method: "PATCH", token, query: `id=eq.${encodeURIComponent(id)}`, body: { read_at: new Date().toISOString() } }); }
export async function deleteNotification(token: string, id: string) { return supabaseRest("notifications", { method: "DELETE", token, query: `id=eq.${encodeURIComponent(id)}` }); }
export async function getAuditLogs(token: string) { return supabaseRest<any[]>("admin_audit_logs", { token, query: "select=*&order=created_at.desc&limit=200" }); }

export async function getAdminFeaturedGuestbook(token: string) {
  return supabaseRest<GuestbookMessage[]>("guestbook", { token, query: "select=id,name,message,approved,moderation_status,featured,created_at&order=created_at.desc" });
}
export async function setGuestbookModeration(token: string, id: string, status: "pending" | "approved" | "rejected") {
  return supabaseRest("guestbook", { method: "PATCH", token, query: `id=eq.${encodeURIComponent(id)}`, body: { approved: status === "approved", moderation_status: status }, prefer: "return=representation" });
}
export async function setGuestbookFeatured(token: string, id: string, featured: boolean) {
  return supabaseRest("guestbook", { method: "PATCH", token, query: `id=eq.${encodeURIComponent(id)}`, body: { featured }, prefer: "return=representation" });
}

/* =========================================================
   ADMIN EVENTS
========================================================= */

export async function getAdminEvents(
  token: string
): Promise<EventRecord[]> {
  if (!token) {
    throw new Error(
      "Admin session is missing."
    );
  }

  return supabaseRest<EventRecord[]>(
    "events",
    {
      token,
      query:
        "select=id,slug,title,date,description,cover_image,drive_folder_id,sort_order,is_active,photos_enabled,videos_enabled,slideshow_enabled,qr_enabled,venue_name,venue_address,maps_url,created_at,updated_at&order=sort_order.asc",
    }
  );
}

export async function getEventSecurityCodes(token: string) {
  const response = await fetch("/api/admin-event-code", { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || "Unable to load event security codes.");
  return data.events as Array<{ id: string; slug: string; title: string; code: string | null }>;
}

export async function changeAllEventSecurityCodes(token: string, code: string) {
  const response = await fetch("/api/admin-event-code", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "set_all", code }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || "Unable to change all event security codes.");
  return data as { ok: true; message: string; count: number };
}

export async function getEventSecurityStatus() {
  const response = await fetch("/api/event-security-status", { cache: "no-store" });
  return response.json() as Promise<{ ok: boolean; configured: boolean; missing: string[]; supabase: boolean; mediaDatabase: boolean; unlockSigning: boolean }>;
}

export async function changeEventSecurityCode(
  token: string,
  event: Pick<EventRecord, "id" | "slug">,
  code: string,
) {
  if (!token) throw new Error("Admin session is missing.");
  const response = await fetch("/api/admin-event-code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ event_id: event.id, slug: event.slug, code }),
  });
  let data: { ok?: boolean; error?: string } = {};
  try { data = await response.json(); } catch { /* ignore */ }
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Unable to change the security code.");
  }
}

export async function createAdminEvent(token: string, event: Partial<EventRecord> & { slug: string; title: string; secret_code_hash: string }) {
  return supabaseRest("events", { method: "POST", token, body: event, prefer: "return=representation" });
}
export async function hashEventCode(code: string) {
  const data = new TextEncoder().encode(code.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function deleteAdminEvent(token: string, id: string) {
  return supabaseRest("events", { method: "DELETE", token, query: `id=eq.${encodeURIComponent(id)}` });
}

export async function updateAdminEvent(
  token: string,
  id: string,
  patch: Partial<EventRecord>
) {
  if (!token) {
    throw new Error(
      "Admin session is missing."
    );
  }

  return supabaseRest(
    "events",
    {
      method: "PATCH",
      token,
      query:
        `id=eq.${encodeURIComponent(id)}`,
      body: patch,
      prefer: "return=representation",
    }
  );
}

/* =========================================================
   ANALYTICS
========================================================= */

export async function recordAnalytics(
  eventId: string | null,
  type: string,
  mediaId?: string | null
) {
  if (!isSupabaseConfigured) return;
  if (!["event_view", "photo_open", "video_open"].includes(type)) return;

  try {
    const response = await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId && /^[0-9a-f-]{36}$/i.test(eventId) ? eventId : null,
        media_type: type,
        media_id: mediaId || null,
        visitor_id: getVisitorId(),
      }),
      keepalive: true,
    });
    if (!response.ok) return;
  } catch {
    // Analytics must never block the website.
  }
}

export function getVisitorId() {
  const key =
    "wedding-visitor-id-v1";

  try {
    const existing =
      localStorage.getItem(key);

    if (existing) {
      return existing;
    }

    const id = crypto.randomUUID();

    localStorage.setItem(key, id);

    return id;
  } catch {
    return `visitor-${Math.random()
      .toString(36)
      .slice(2)}`;
  }
}

/* =========================================================
   FAVORITES
========================================================= */

export async function savePhotoReaction(eventId: string, photoId: string, reaction: "heart" | "love" | "smile") {
  if (!isSupabaseConfigured) return;
  try {
    await supabaseRest("photo_reactions", { method: "POST", body: { visitor_id: getVisitorId(), event_id: eventId, photo_id: photoId, reaction }, prefer: "resolution=ignore-duplicates,return=minimal" });
  } catch { /* reactions never block gallery */ }
}

export async function getRemoteFavoriteIds(
  eventId: string
) {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const visitorId =
      getVisitorId();

    const rows =
      await supabaseRest<any[]>(
        "favorites",
        {
          query:
            `select=photo_id` +
            `&visitor_id=eq.${encodeURIComponent(visitorId)}` +
            `&event_id=eq.${encodeURIComponent(eventId)}`,
        }
      );

    return rows.map(
      (row) => row.photo_id
    );
  } catch {
    return [];
  }
}

export async function saveFavorite(
  eventId: string,
  photoId: string,
  favorite: boolean
) {
  if (!isSupabaseConfigured) {
    return;
  }

  const visitorId =
    getVisitorId();

  try {
    if (favorite) {
      await supabaseRest(
        "favorites",
        {
          method: "POST",
          body: {
            visitor_id: visitorId,
            event_id: eventId,
            photo_id: photoId,
          },
          prefer:
            "resolution=ignore-duplicates",
        }
      );
    } else {
      await supabaseRest(
        "favorites",
        {
          method: "DELETE",
          query:
            `visitor_id=eq.${encodeURIComponent(visitorId)}` +
            `&event_id=eq.${encodeURIComponent(eventId)}` +
            `&photo_id=eq.${encodeURIComponent(photoId)}`,
        }
      );
    }
  } catch {
    // Ignore favorite sync errors.
  }
}

/* =========================================================
   ADMIN ANALYTICS
========================================================= */

export async function getAdminAnalytics(
  token: string
) {
  if (!token) {
    throw new Error(
      "Admin session is missing."
    );
  }

  const rows =
    await supabaseRest<any[]>(
      "gallery_views",
      {
        token,
        query:
          "select=event_id,media_type,media_id,created_at" +
          "&order=created_at.desc",
      }
    );

  const byType =
    rows.reduce(
      (
        acc: Record<string, number>,
        row
      ) => {
        acc[row.media_type] =
          (acc[row.media_type] || 0) + 1;

        return acc;
      },
      {}
    );

  let reactions: any[] = [];
  try { reactions = await supabaseRest<any[]>("photo_reactions", { token, query: "select=photo_id,reaction,event_id,created_at&order=created_at.desc&limit=500" }); } catch { reactions = []; }
  const topReactions = Object.values(reactions.reduce((acc: Record<string, any>, row) => {
    const key = `${row.event_id || ""}:${row.photo_id}`;
    acc[key] ||= { event_id: row.event_id, photo_id: row.photo_id, total: 0, heart: 0, love: 0, smile: 0 };
    acc[key].total += 1; acc[key][row.reaction] += 1; return acc;
  }, {})).sort((a: any, b: any) => b.total - a.total).slice(0, 10);
  return { total: rows.length, byType, recent: rows.slice(0, 20), reactions: topReactions, reactionTotal: reactions.length };
}
