export type AccountStatus =
  | "REGISTERED"
  | "EMAIL_VERIFIED"
  | "PROFILE_STARTED"
  | "PROFILE_COMPLETED"
  | "PHOTO_ADDED"
  | "VERIFICATION_PENDING"
  | "VERIFIED"
  | "ACTIVE"
  | "SUSPENDED"
  | "BANNED"
  | "DEACTIVATED"
  | "DELETION_PENDING"
  | "DELETED";
export type ApiResult<T> = { data: T; request_id: string };
export type Compatibility = {
  overall_score: number | null;
  factor_scores: Record<string, number>;
  positive_matches: string[];
  potential_differences: string[];
  coverage: number;
  explanation: string;
};
export type Profile = {
  user_id: string;
  display_name: string;
  age: number;
  city: string;
  bio: string;
  profession: string;
  education: string;
  gender: string;
  goal: string;
  interests: string[];
  values: string[];
  lifestyle: Record<string, string>;
  communication: string;
  personality: string[];
  photo_keys: string[];
  photos?: string[];
  verified: boolean;
  compatibility?: Compatibility;
};
export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  reply_to: string | null;
  created_at: string;
  deleted_at: string | null;
  client_id: string;
};
export type Plan = {
  id: string;
  code: string;
  name: string;
  amount_minor: number;
  currency: string;
  period_days: number;
  entitlements: Record<string, number | boolean>;
  purchasable: boolean;
};
export type VideoCall = {
  id: string;
  conversation_id: string;
  caller_id: string;
  recipient_id: string;
  room_name: string;
  status:
    "ringing" | "accepted" | "declined" | "cancelled" | "missed" | "ended";
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  ended_at: string | null;
  is_caller: boolean;
  other_user_id: string;
  other_name: string;
};
export type CallCredentials = {
  token: string;
  server_url: string;
  expires_in: number;
};
export type DatePlan = {
  id: string;
  match_id: string;
  proposer_id: string;
  activity: "coffee" | "dinner" | "gallery" | "walk";
  venue: string;
  starts_at: string;
  note: string;
  status: "proposed" | "accepted" | "declined" | "cancelled";
  revision: number;
  created_at: string;
  is_sender: boolean;
  other_name: string;
};
