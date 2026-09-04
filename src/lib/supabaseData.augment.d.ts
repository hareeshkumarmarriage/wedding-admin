import "./supabaseData";

declare module "./supabaseData" {
  export function writeAdminAudit(
    token: string,
    action: "change_all_event_codes",
    targetId?: string | null,
    details?: Record<string, unknown>,
  ): Promise<void>;
}
