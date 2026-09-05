import type { LucideIcon } from "lucide-react";
import {
  Activity, BarChart3, Bell, BookOpen, Boxes, BriefcaseBusiness, CalendarDays, Cloud,
  Database, FileArchive, FileClock, FileCog, FileImage, FileKey2, FileSearch, Gauge,
  Globe2, Heart, HelpCircle, LayoutDashboard, Link2, MapPin, Palette, QrCode, Rocket,
  Settings2, ShieldCheck, Sparkles, Trash2, UserCog, Users, Video, WandSparkles
} from "lucide-react";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "publish" | "manage";
export type AdminRole = "administrator" | "editor" | "moderator" | "view_only" | "custom";

export interface AdminModule {
  id: string;
  number: number;
  label: string;
  description: string;
  icon: LucideIcon;
  group: "wedding" | "insights" | "management" | "system";
  actions: PermissionAction[];
  status?: "active" | "planned";
  children: { id: string; label: string; description?: string }[];
}

export const ADMIN_MODULES: AdminModule[] = [
  { id: "dashboard", number: 1, label: "Dashboard", description: "Overview, health, pending actions and recent activity.", icon: LayoutDashboard, group: "wedding", actions: ["view", "manage"], children: ["overview", "website-status", "wedding-countdown", "recent-activity", "system-health"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "website", number: 2, label: "Website", description: "Manage public wedding content and page sections.", icon: Globe2, group: "wedding", actions: ["view", "create", "edit", "delete", "publish", "manage"], children: ["home", "couple", "story", "timeline", "events", "locations", "guestbook", "footer", "navigation", "section-manager"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "appearance", number: 3, label: "Appearance", description: "Theme, colors, typography, backgrounds and responsive settings.", icon: Palette, group: "wedding", actions: ["view", "edit", "publish", "manage"], children: ["theme", "colors", "typography", "backgrounds", "buttons", "animations", "responsive"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "loading-intro", number: 4, label: "Loading & Intro", description: "Control the single loading experience and optional intro video.", icon: Sparkles, group: "wedding", actions: ["view", "edit", "publish", "manage"], children: ["loading-screen", "loading-text", "blink-heart", "loading-duration", "intro-video", "autoplay", "mute", "skip-button", "fullscreen", "preview"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "events", number: 5, label: "Events", description: "Wedding events, schedules, locations, galleries and access.", icon: CalendarDays, group: "wedding", actions: ["view", "create", "edit", "delete", "publish", "manage"], children: ["all-events", "add-event", "schedule", "location", "gallery", "videos", "visibility", "event-settings"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "media", number: 6, label: "Media", description: "Photos, videos, folders, Google Drive and media statistics.", icon: FileImage, group: "wedding", actions: ["view", "create", "edit", "delete", "manage"], children: ["library", "photos", "videos", "folders", "google-drive", "event-media", "upload-queue", "failed-uploads", "statistics"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "guestbook", number: 7, label: "Guestbook", description: "Moderate, approve and manage visitor messages.", icon: BookOpen, group: "wedding", actions: ["view", "edit", "delete", "manage"], children: ["all", "pending", "approved", "rejected", "spam", "settings"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "interactions", number: 8, label: "Interactions", description: "Favorites, reactions, wishes and sharing.", icon: Heart, group: "wedding", actions: ["view", "delete", "manage"], children: ["favorites", "reactions", "likes", "wishes", "sharing", "settings"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "social", number: 9, label: "Social & Contact", description: "Instagram, YouTube, Facebook, WhatsApp and contact links.", icon: Link2, group: "wedding", actions: ["view", "edit", "publish", "manage"], children: ["instagram", "youtube", "facebook", "whatsapp", "phone", "email", "social-sharing"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "locations", number: 10, label: "Locations", description: "Venues, maps, directions and location settings.", icon: MapPin, group: "wedding", actions: ["view", "create", "edit", "delete", "manage"], children: ["venue-list", "add-venue", "edit-venue", "google-maps", "directions", "contact", "settings"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "qr", number: 11, label: "QR Codes", description: "Generate and manage QR codes for public experiences.", icon: QrCode, group: "wedding", actions: ["view", "create", "edit", "delete", "manage"], children: ["website", "event", "gallery", "guestbook", "location", "custom"] .map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "analytics", number: 12, label: "Analytics", description: "Visitors, pages, events, media and QR performance.", icon: BarChart3, group: "insights", actions: ["view", "manage"], children: ["overview", "visitors", "page-views", "event-views", "gallery-views", "video-views", "favorites", "qr-scans"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "notifications", number: 13, label: "Notifications", description: "In-app, guestbook, admin, security and system notifications.", icon: Bell, group: "insights", actions: ["view", "create", "edit", "delete", "manage"], children: ["center", "email", "guestbook", "admin", "security", "system", "preferences"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "administration", number: 14, label: "Administration", description: "Profiles, admin users, roles and permissions.", icon: UserCog, group: "management", actions: ["view", "create", "edit", "delete", "manage"], children: ["my-profile", "admin-users", "roles", "permissions", "access-management"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "security", number: 15, label: "Security", description: "Authentication, sessions, rate limits and security posture.", icon: ShieldCheck, group: "management", actions: ["view", "edit", "manage"], children: ["overview", "authentication", "sessions", "login-protection", "rate-limiting", "api-protection", "database-security", "storage-security", "security-events"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "audit", number: 16, label: "Audit Logs", description: "Trace administrative, content and security changes.", icon: FileClock, group: "management", actions: ["view", "manage"], children: ["all-activity", "admin-activity", "content-changes", "media-changes", "security-changes", "permission-changes", "login-history"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "settings", number: 17, label: "Settings", description: "General, wedding, date/time, language and website settings.", icon: Settings2, group: "system", actions: ["view", "edit", "manage"], children: ["general", "wedding", "date-time", "language", "notifications", "website", "advanced"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "system", number: 18, label: "System", description: "Service health, database, storage, API and diagnostics.", icon: Gauge, group: "system", actions: ["view", "manage"], children: ["health", "database", "storage", "api", "supabase", "google-drive", "vercel", "environment", "diagnostics"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "backup", number: 19, label: "Backup & Restore", description: "Create, export and restore recoverable backups.", icon: FileArchive, group: "system", actions: ["view", "create", "delete", "manage"], children: ["overview", "create-backup", "history", "export", "import", "restore"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "integrations", number: 20, label: "Integrations", description: "External service connections and health checks.", icon: Boxes, group: "system", actions: ["view", "create", "edit", "delete", "manage"], children: ["supabase", "google-drive", "google-maps", "youtube", "instagram", "facebook", "whatsapp", "vercel"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "publishing", number: 21, label: "Publishing", description: "Draft, preview, validation, publish history and rollback.", icon: Rocket, group: "system", actions: ["view", "create", "edit", "delete", "publish", "manage"], children: ["draft", "preview", "validation", "published", "history", "rollback"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "diagnostics", number: 22, label: "Testing & Diagnostics", description: "Pre-publish and production checks.", icon: Activity, group: "system", actions: ["view", "manage"], children: ["website", "database", "media", "links", "images", "videos", "mobile", "configuration", "pre-publish"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "trash", number: 23, label: "Trash & Recovery", description: "Recover soft-deleted content before permanent removal.", icon: Trash2, group: "system", actions: ["view", "delete", "manage"], children: ["all", "events", "media", "guestbook", "content", "restore", "permanent-delete"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
  { id: "help", number: 24, label: "Help & Support", description: "Documentation, troubleshooting and system information.", icon: HelpCircle, group: "system", actions: ["view"], children: ["getting-started", "documentation", "feature-guide", "troubleshooting", "shortcuts", "system-information", "about"].map(id => ({ id, label: id.replaceAll("-", " ") })) },
];

export const ADMIN_ROLES: Record<AdminRole, { label: string; description: string; permissions: Record<string, PermissionAction[]> }> = {
  administrator: { label: "Administrator", description: "Full administrative control.", permissions: Object.fromEntries(ADMIN_MODULES.map(m => [m.id, m.actions])) },
  editor: { label: "Editor", description: "Manage wedding content without security administration.", permissions: Object.fromEntries(ADMIN_MODULES.filter(m => !["administration", "security", "audit", "system", "backup"].includes(m.id)).map(m => [m.id, m.actions.filter(a => ["view", "create", "edit", "publish"].includes(a))])) },
  moderator: { label: "Moderator", description: "Moderate guest-facing interactions.", permissions: { guestbook: ["view", "edit", "delete", "manage"], interactions: ["view", "delete", "manage"], notifications: ["view", "manage"], dashboard: ["view"] } },
  view_only: { label: "View Only", description: "Read-only access.", permissions: Object.fromEntries(ADMIN_MODULES.map(m => [m.id, ["view"]])) },
  custom: { label: "Custom Role", description: "Explicitly assigned permissions.", permissions: {} },
};

export const GROUP_LABELS = { wedding: "WEDDING", insights: "INSIGHTS", management: "MANAGEMENT", system: "SYSTEM" } as const;
