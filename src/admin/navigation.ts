export type AdminPermissionAction = "view" | "create" | "edit" | "delete" | "publish" | "manage";

export type AdminArea =
  | "dashboard"
  | "website"
  | "appearance"
  | "loading-intro"
  | "events"
  | "media"
  | "guestbook"
  | "interactions"
  | "social-contact"
  | "locations"
  | "qr-codes"
  | "analytics"
  | "notifications"
  | "administration"
  | "security"
  | "audit-logs"
  | "settings"
  | "system"
  | "backup-restore"
  | "integrations"
  | "publishing"
  | "testing-diagnostics"
  | "trash-recovery"
  | "help";

export type AdminRole = "administrator" | "editor" | "moderator" | "view-only" | "custom";

export interface AdminNavItem {
  id: AdminArea;
  label: string;
  description: string;
  group: "wedding" | "insights" | "management" | "system";
  path: string;
  actions: AdminPermissionAction[];
  future?: boolean;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { id: "dashboard", label: "Dashboard", description: "Overview and actions", group: "wedding", path: "/admin", actions: ["view", "manage"] },
  { id: "website", label: "Website", description: "Manage public wedding content", group: "wedding", path: "/admin/website", actions: ["view", "create", "edit", "delete", "publish"] },
  { id: "appearance", label: "Appearance", description: "Themes, colors, typography and layout", group: "wedding", path: "/admin/appearance", actions: ["view", "edit", "publish"] },
  { id: "loading-intro", label: "Loading & Intro", description: "Loading screen and intro video", group: "wedding", path: "/admin/loading-intro", actions: ["view", "edit", "publish"] },
  { id: "events", label: "Events", description: "Wedding events, schedules and access", group: "wedding", path: "/admin/events", actions: ["view", "create", "edit", "delete", "publish"] },
  { id: "media", label: "Media", description: "Photos, videos and Drive library", group: "wedding", path: "/admin/media", actions: ["view", "create", "edit", "delete", "manage"] },
  { id: "guestbook", label: "Guestbook", description: "Moderate guest messages", group: "wedding", path: "/admin/guestbook", actions: ["view", "create", "edit", "delete", "manage"] },
  { id: "interactions", label: "Interactions", description: "Favorites, reactions and sharing", group: "wedding", path: "/admin/interactions", actions: ["view", "manage"] },
  { id: "social-contact", label: "Social & Contact", description: "Social and contact links", group: "wedding", path: "/admin/social-contact", actions: ["view", "edit", "publish"] },
  { id: "locations", label: "Locations", description: "Venues, maps and directions", group: "wedding", path: "/admin/locations", actions: ["view", "create", "edit", "delete", "publish"] },
  { id: "qr-codes", label: "QR Codes", description: "Generate and manage QR links", group: "wedding", path: "/admin/qr-codes", actions: ["view", "create", "edit", "delete"] },
  { id: "analytics", label: "Analytics", description: "Visitors and engagement insights", group: "insights", path: "/admin/analytics", actions: ["view"] },
  { id: "notifications", label: "Notifications", description: "Admin and guest notifications", group: "insights", path: "/admin/notifications", actions: ["view", "create", "edit", "delete", "manage"] },
  { id: "administration", label: "Administration", description: "Admins, roles and permissions", group: "management", path: "/admin/administration", actions: ["view", "create", "edit", "delete", "manage"] },
  { id: "security", label: "Security", description: "Authentication and platform protection", group: "management", path: "/admin/security", actions: ["view", "manage"] },
  { id: "audit-logs", label: "Audit Logs", description: "Immutable administrative activity history", group: "management", path: "/admin/audit-logs", actions: ["view", "manage"] },
  { id: "settings", label: "Settings", description: "General wedding and website settings", group: "system", path: "/admin/settings", actions: ["view", "edit", "manage"] },
  { id: "system", label: "System", description: "Service health and diagnostics", group: "system", path: "/admin/system", actions: ["view", "manage"] },
  { id: "backup-restore", label: "Backup & Restore", description: "Backups and recovery operations", group: "system", path: "/admin/backup-restore", actions: ["view", "create", "manage"], future: true },
  { id: "integrations", label: "Integrations", description: "Supabase, Drive, Maps and external services", group: "system", path: "/admin/integrations", actions: ["view", "edit", "manage"] },
  { id: "publishing", label: "Publishing", description: "Draft, preview, validation and publishing", group: "system", path: "/admin/publishing", actions: ["view", "publish", "manage"] },
  { id: "testing-diagnostics", label: "Testing & Diagnostics", description: "Pre-publish and service checks", group: "system", path: "/admin/testing-diagnostics", actions: ["view", "manage"] },
  { id: "trash-recovery", label: "Trash & Recovery", description: "Recover deleted content", group: "system", path: "/admin/trash-recovery", actions: ["view", "delete", "manage"], future: true },
  { id: "help", label: "Help & Support", description: "Documentation and troubleshooting", group: "system", path: "/admin/help", actions: ["view"] },
];

export const ADMIN_NAV_GROUPS = {
  wedding: "Wedding",
  insights: "Insights",
  management: "Management",
  system: "System",
} as const;
