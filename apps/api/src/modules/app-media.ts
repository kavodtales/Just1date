import { Router, raw } from "express";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Repository } from "../lib/repository";
import { AppError, ok, log } from "../lib/http";

const slotSchema = z.enum([
  "welcome_algorithm",
  "welcome_matches",
  "welcome_premium",
  "landing_hero",
  "date_venue",
]);
type MediaRow = {
  slot: string;
  storage_key: string | null;
  alt_text: string;
  revision: number;
  updated_at: string;
};
const bucket = "app-images";
async function projection(rows: MediaRow[], storage: SupabaseClient) {
  return Promise.all(
    rows.map(async ({ storage_key, ...row }) => {
      if (!storage_key) return { ...row, url: null };
      const { data, error } = await storage.storage
        .from(bucket)
        .createSignedUrl(storage_key, 3600);
      if (error)
        throw new AppError(
          "MEDIA_LOAD_FAILED",
          503,
          "App images are temporarily unavailable.",
        );
      return { ...row, url: data.signedUrl };
    }),
  );
}
export function publicAppMediaRoutes(
  repo: Repository,
  storage: SupabaseClient,
) {
  const r = Router();
  r.get("/", async (_req, res) => {
    const rows = await repo.db.transaction(
      null,
      async (db) =>
        (
          await db.query<MediaRow>(
            "select slot,storage_key,alt_text,revision,updated_at from public.app_media_slots order by slot",
          )
        ).rows,
    );
    res.setHeader("Cache-Control", "no-store");
    ok(res, await projection(rows, storage));
  });
  return r;
}
export function adminAppMediaRoutes(repo: Repository, storage: SupabaseClient) {
  const r = Router();
  // Authorize before parsing image bytes or touching object storage.
  r.use(async (req, _res, next) => {
    await repo.call(req.actor.id, "adminAppMedia");
    next();
  });
  r.get("/", async (req, res) =>
    ok(
      res,
      await projection(
        await repo.call<MediaRow[]>(req.actor.id, "adminAppMedia"),
        storage,
      ),
    ),
  );
  r.post(
    "/:slot",
    raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "4mb" }),
    async (req, res) => {
      const slot = slotSchema.parse(req.params.slot);
      const revision = z.coerce
        .number()
        .int()
        .nonnegative()
        .parse(req.query.revision);
      const alt = z.string().trim().min(3).max(180).parse(req.query.alt);
      if (!Buffer.isBuffer(req.body) || !req.body.length)
        throw new AppError(
          "INVALID_IMAGE",
          400,
          "Choose a JPEG, PNG or WebP photo.",
        );
      let output: Buffer;
      try {
        const photo = sharp(req.body, {
          limitInputPixels: 24000000,
          failOn: "error",
        });
        const meta = await photo.metadata();
        if (
          !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
          !meta.width ||
          !meta.height ||
          meta.width < 400 ||
          meta.height < 400 ||
          (meta.pages ?? 1) > 1
        )
          throw new Error("invalid");
        output = await photo
          .rotate()
          .resize({
            width: 1440,
            height: 1800,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 88, progressive: true })
          .toBuffer();
      } catch {
        throw new AppError(
          "INVALID_IMAGE",
          400,
          "Use a non-animated photo at least 400 × 400 pixels.",
        );
      }
      const key = `${req.actor.id}/${randomUUID()}.jpg`;
      const { error } = await storage.storage
        .from(bucket)
        .upload(key, output, { contentType: "image/jpeg", upsert: false });
      if (error)
        throw new AppError(
          "UPLOAD_FAILED",
          503,
          "The image could not upload. Try again.",
        );
      let result: MediaRow & { previous_key: string | null };
      try {
        result = await repo.call(req.actor.id, "adminPublishMedia", [
          slot,
          revision,
          key,
          alt,
        ]);
      } catch (e) {
        await storage.storage.from(bucket).remove([key]);
        throw e;
      }
      // A failed cleanup must never turn a committed publication into a failed response.
      if (result.previous_key) {
        const { error: cleanupError } = await storage.storage
          .from(bucket)
          .remove([result.previous_key]);
        if (cleanupError)
          log.warn(
            { code: "APP_MEDIA_CLEANUP_PENDING" },
            "app_media_cleanup_pending",
          );
      }
      const { previous_key: _previous, ...row } = result;
      ok(res, (await projection([row], storage))[0], 201);
    },
  );
  r.post("/:slot/reset", async (req, res) => {
    const { revision } = z
      .object({ revision: z.number().int().nonnegative() })
      .strict()
      .parse(req.body);
    const result = await repo.call<MediaRow & { previous_key: string | null }>(
      req.actor.id,
      "adminPublishMedia",
      [slotSchema.parse(req.params.slot), revision, null, ""],
    );
    if (result.previous_key) {
      const { error } = await storage.storage
        .from(bucket)
        .remove([result.previous_key]);
      if (error)
        log.warn(
          { code: "APP_MEDIA_CLEANUP_PENDING" },
          "app_media_cleanup_pending",
        );
    }
    const { previous_key: _previous, ...row } = result;
    ok(res, (await projection([row], storage))[0]);
  });
  return r;
}
