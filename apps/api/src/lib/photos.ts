import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "./http";
/** Only sign keys returned by authorized, moderation-filtered database projections. */
export async function signProfilePhotos(storage: SupabaseClient, profile: any) {
  const { photo_keys: keys, ...safe } = profile;
  if (!keys?.length) return { ...safe, photos: [] };
  const { data, error } = await storage.storage
    .from("profile-photos")
    .createSignedUrls(keys, 120);
  if (error)
    throw new AppError(
      "PHOTO_LOAD_FAILED",
      503,
      "Photos could not load. Please try again.",
    );
  return { ...safe, photos: data.map((x) => x.signedUrl).filter(Boolean) };
}
