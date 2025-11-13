import type { SupabaseClient } from "src/db/supabase.client";
import type { AuditEventType } from "src/types";
import type { Json } from "src/db/database.types";

/**
 * Service for logging audit events
 * Provides methods to record user actions and system events
 */
export const auditLogService = {
  /**
   * Logs an audit event to the database
   * 
   * @param supabase - Supabase client instance
   * @param userId - ID of the user performing the action
   * @param eventType - Type of audit event (e.g., 'plan_created', 'session_started')
   * @param options - Optional parameters
   * @param options.entityType - Type of entity affected (e.g., 'plan', 'session')
   * @param options.entityId - ID of the affected entity
   * @param options.payload - Additional event data
   */
  logEvent: async (
    supabase: SupabaseClient,
    userId: string,
    eventType: AuditEventType,
    options: {
      entityType?: "plan" | "session" | null;
      entityId?: string | null;
      payload?: Record<string, unknown>;
    } = {}
  ): Promise<void> => {
    const { entityType = null, entityId = null, payload = {} } = options;

    const { error } = await supabase.from("audit_events").insert({
      user_id: userId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
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
