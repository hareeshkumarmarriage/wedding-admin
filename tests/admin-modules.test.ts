import { describe, expect, it } from "vitest";
import { ADMIN_MODULES, ADMIN_ROLES } from "../src/admin/moduleRegistry";

const requiredModules = [
  "dashboard", "website", "styling", "alerts", "notifications", "analytics",
  "events", "rsvp", "guestbook", "social", "media", "interactions",
  "access", "administration", "security", "audit", "publishing", "diagnostics",
  "integrations", "system", "backup", "settings", "trash", "help",
] as const;

describe("admin specification coverage", () => {
  it("registers all 24 required admin modules in document order", () => {
    expect(ADMIN_MODULES).toHaveLength(24);
    expect(ADMIN_MODULES.map((module) => module.id)).toEqual(requiredModules);
    expect(ADMIN_MODULES.map((module) => module.number)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
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

  it("covers the structured document controls", () => {
    const children = (id: string) => ADMIN_MODULES.find((module) => module.id === id)?.children.map((item) => item.id) ?? [];

    expect(children("dashboard")).toEqual(expect.arrayContaining(["website-status","pending-actions","system-health","recent-activity","current-session","quick-actions"]));
    expect(children("website")).toEqual(expect.arrayContaining(["section-manager","intro","navigation","home","couple","events-story-memory","gallery-highlights","rsvp","guestbook","footer"]));
    expect(children("styling")).toEqual(["theme","colours","typography","animations","responsive","loading-screen"]);
    expect(children("alerts")).toEqual(expect.arrayContaining(["maintenance-status","maintenance-message","maintenance-apply-to","announcement-status","announcement-message","announcement-apply-to"]));
    expect(children("events")).toEqual(["event-list","event-details"]);
    expect(children("rsvp")).toEqual(["rsvp-overview","guest-list","form-fields"]);
    expect(children("media")).toEqual(["media-source","gallery-qr-links","photo-video-listing","image-performance","media-delivery","guest-uploads","media-privacy","private-media-delivery"]);
    expect(children("interactions")).toEqual(expect.arrayContaining(["event-unlock","unlock-session","event-code-storage","unlock-protection","guestbook-interaction","analytics-interaction","favorites","qr-interaction","guest-photo-upload"]));
    expect(children("access")).toEqual(["user-list","role-list","permissions"]);
    expect(children("security")).toEqual(["security-settings","alert-settings","event-security"]);
    expect(children("publishing")).toEqual(expect.arrayContaining(["publishing-status","preview-draft","publish-now","schedule-publish","unpublish","cancel-scheduled-publish","version-history","view-version","compare-version","restore-version"]));
    expect(children("diagnostics")).toEqual(["website-test","performance","automated-testing","application-cache","code-splitting","diagnostics"]);
    expect(children("integrations")).toEqual(["supabase","google-drive","github","vercel","environment-configuration","api-services","other-integrations"]);
    expect(children("backup")).toEqual(["create-backup","backup-history","restore-backup"]);
    expect(children("trash")).toEqual(["deleted-items","recovery-settings"]);
    expect(children("help")).toEqual(expect.arrayContaining(["documentation","support","support-actions","about","application-information"]));
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
