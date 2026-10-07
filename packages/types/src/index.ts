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
