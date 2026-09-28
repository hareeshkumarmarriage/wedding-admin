import { describe, expect, it } from "vitest";
import { ADMIN_MODULES, ADMIN_ROLES } from "../src/admin/moduleRegistry";

const requiredModules = [
  "dashboard", "website", "appearance", "loading-intro", "events", "media",
  "guestbook", "interactions", "social", "locations", "qr", "analytics",
  "notifications", "administration", "security", "audit", "settings", "system",
  "backup", "integrations", "publishing", "diagnostics", "trash", "help",
] as const;

describe("admin specification coverage", () => {
  it("registers all 24 required admin modules", () => {
    expect(ADMIN_MODULES).toHaveLength(24);
    expect(ADMIN_MODULES.map((module) => module.id)).toEqual(requiredModules);
    expect(new Set(ADMIN_MODULES.map((module) => module.number)).size).toBe(24);
    expect(ADMIN_MODULES.every((module) => module.status !== "planned")).toBe(true);
  });

  it("keeps every module actionable and discoverable", () => {
    for (const module of ADMIN_MODULES) {
      expect(module.label.trim()).not.toBe("");
      expect(module.description.trim()).not.toBe("");
      expect(module.children.length).toBeGreaterThan(0);
      expect(module.actions).toContain("view");
    }
  });

  it("covers the specification's critical workflows", () => {
    const children = (id: string) => ADMIN_MODULES.find((module) => module.id === id)?.children.map((item) => item.id) ?? [];

    expect(children("website")).toEqual(expect.arrayContaining([
      "section-manager", "home", "couple", "story", "gallery", "events", "rsvp", "guestbook", "footer", "navigation",
    ]));
    expect(children("events")).toEqual(expect.arrayContaining(["all-events", "add-event", "schedule", "location", "gallery", "videos", "visibility", "event-settings"]));
    expect(children("media")).toEqual(expect.arrayContaining(["library", "photos", "videos", "folders", "google-drive", "event-media", "upload-queue", "failed-uploads", "statistics"]));
    expect(children("notifications")).toEqual(expect.arrayContaining(["center", "maintenance", "announcement", "email", "guestbook", "admin", "security", "system", "preferences"]));
    expect(children("administration")).toEqual(expect.arrayContaining(["my-profile", "admin-users", "roles", "permissions", "access-management"]));
    expect(children("security")).toEqual(expect.arrayContaining(["overview", "authentication", "sessions", "login-protection", "rate-limiting", "api-protection", "database-security", "storage-security", "security-events"]));
    expect(children("publishing")).toEqual(expect.arrayContaining(["draft", "preview", "validation", "published", "history", "rollback"]));
    expect(children("diagnostics")).toEqual(expect.arrayContaining(["website", "database", "media", "links", "images", "videos", "mobile", "configuration", "pre-publish"]));
    expect(children("trash")).toEqual(expect.arrayContaining(["all", "events", "media", "guestbook", "content", "restore", "permanent-delete"]));
  });

  it("defines the documented role model", () => {
    expect(Object.keys(ADMIN_ROLES)).toEqual(["administrator", "editor", "moderator", "view_only", "custom"]);
    expect(ADMIN_ROLES.administrator.permissions).toHaveProperty("dashboard");
    expect(ADMIN_ROLES.editor.permissions).not.toHaveProperty("security");
    expect(ADMIN_ROLES.moderator.permissions).toHaveProperty("guestbook");
    expect(ADMIN_ROLES.view_only.permissions.dashboard).toEqual(["view"]);
    expect(ADMIN_ROLES.custom.permissions).toEqual({});
  });
});
