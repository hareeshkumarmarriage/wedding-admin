import type { AdminArea, AdminPermissionAction, AdminRole } from "./navigation";

export const DEFAULT_ROLE_PERMISSIONS: Record<AdminRole, Partial<Record<AdminArea, AdminPermissionAction[]>>> = {
  administrator: {},
  editor: {
    website: ["view", "create", "edit", "publish"],
    appearance: ["view", "edit", "publish"],
    "loading-intro": ["view", "edit", "publish"],
    events: ["view", "create", "edit", "publish"],
    media: ["view", "create", "edit"],
    guestbook: ["view", "edit"],
    interactions: ["view", "manage"],
    "social-contact": ["view", "edit", "publish"],
    locations: ["view", "create", "edit", "publish"],
    "qr-codes": ["view", "create", "edit"],
    analytics: ["view"],
    notifications: ["view"],
  },
  moderator: {
    guestbook: ["view", "edit", "delete", "manage"],
    interactions: ["view", "manage"],
    notifications: ["view", "create"],
  },
  "view-only": {
    dashboard: ["view"],
    website: ["view"],
    events: ["view"],
    media: ["view"],
    guestbook: ["view"],
    interactions: ["view"],
    "social-contact": ["view"],
    locations: ["view"],
    "qr-codes": ["view"],
    analytics: ["view"],
  },
  custom: {},
};

export function hasPermission(role: AdminRole, area: AdminArea, action: AdminPermissionAction, custom?: Partial<Record<AdminArea, AdminPermissionAction[]>>) {
  if (role === "administrator") return true;
  const permissions = role === "custom" ? custom ?? {} : DEFAULT_ROLE_PERMISSIONS[role];
  return permissions[area]?.includes(action) ?? false;
}
