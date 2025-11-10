import type { SupabaseClient } from "src/db/supabase.client";
import type { AuditEventType } from "src/types";
import type { Json } from "src/db/database.types";

export const auditLogService = {
  logEvent: async (
    supabase: SupabaseClient,
    userId: string,
    eventType: AuditEventType,
    payload: Record<string, unknown> = {}
  ) => {
    const { error } = await supabase.from("audit_events").insert({
      user_id: userId,
      event_type: eventType,
      payload: payload as Json,
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to log audit event:", error);
      // In a real application, you might want to throw a custom error
      // or handle it more gracefully, but for now, we'll just log it.
    }
  },
};
