import type { Database } from "@just1date/database";
const functions = {
  me: "rpc_me",
  saveProfile: "rpc_save_profile",
  preferences: "rpc_preferences",
  discover: "rpc_discover",
  profile: "rpc_profile",
  interact: "rpc_interact",
  matches: "rpc_matches",
  inbox: "rpc_inbox",
  incoming: "rpc_incoming_likes",
  block: "rpc_block",
  unmatch: "rpc_unmatch",
  messages: "rpc_messages",
  send: "rpc_send_message",
  messageAction: "rpc_message_action",
  read: "rpc_read_conversation",
  report: "rpc_report",
  privacy: "rpc_privacy",
  deletion: "rpc_deletion",
  safetyCreate: "rpc_safety_create",
  safetyAction: "rpc_safety_action",
  startPayment: "rpc_start_payment",
  cancelSubscription: "rpc_cancel_subscription",
  adminIdentity: "rpc_admin_identity",
  adminAppMedia: "rpc_admin_app_media",
  adminPublishMedia: "rpc_admin_publish_media",
  adminMetrics: "rpc_admin_metrics",
  adminQueue: "rpc_admin_queue",
  adminModerate: "rpc_admin_moderate",
  adminPhotos: "rpc_admin_photos",
  photoReview: "rpc_admin_photo_review",
  addPhoto: "rpc_add_photo",
  contact: "rpc_contact",
  notificationRead: "rpc_notification_read",
  notificationPreferences: "rpc_notification_preferences",
  deviceToken: "rpc_device_token",
  callStart: "rpc_call_start",
  callGet: "rpc_call_get",
  callAction: "rpc_call_action",
  callIncoming: "rpc_call_incoming",
} as const;
export class Repository {
  constructor(public db: Database) {}
  async call<T = any>(
    actor: string,
    key: keyof typeof functions,
    args: unknown[] = [],
  ): Promise<T> {
    return this.db.transaction(actor, async (db) => {
      const placeholders = args.map((_, i) => `$${i + 1}`).join(",");
      return (
        await db.query<{ data: T }>(
          `select public.${functions[key]}(${placeholders}) data`,
          args,
        )
      ).rows[0].data;
    });
  }
  async read<T = any>(
    actor: string,
    sql: string,
    args: unknown[] = [],
  ): Promise<T[]> {
    return this.db.transaction(actor, async (db) => {
      await db.query("set local role authenticated");
      return (await db.query<T>(sql, args)).rows;
    });
  }
}
