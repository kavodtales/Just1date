import { Router, raw } from "express";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { profileSchema, preferencesSchema, uuid } from "@just1date/validation";
import { compatibility } from "@just1date/utils";
import type { Profile } from "@just1date/types";
import { Repository } from "../lib/repository";
import { AppError, ok } from "../lib/http";
import { signProfilePhotos } from "../lib/photos";
export function profilesRoutes(repo: Repository, storage: SupabaseClient) {
  const r = Router();
  const photos = (p: any) => signProfilePhotos(storage, p);
  r.get("/me", async (req, res) =>
    ok(res, await photos(await repo.call(req.actor.id, "me"))),
  );
  r.patch("/me", async (req, res) =>
    ok(
      res,
      await repo.call(req.actor.id, "saveProfile", [
        profileSchema.parse(req.body),
      ]),
    ),
  );
  r.patch("/me/preferences", async (req, res) =>
    ok(
      res,
      await repo.call(req.actor.id, "preferences", [
        preferencesSchema.parse(req.body),
      ]),
    ),
  );
  r.get("/discover", async (req, res) => {
    const cursor = req.query.cursor ? uuid.parse(req.query.cursor) : null;
    const page = await repo.call<Profile[]>(req.actor.id, "discover", [
      cursor,
      20,
    ]);
    const own = await repo.call<Profile>(req.actor.id, "me");
    const factors = await repo.read<{ code: string; weight: string }>(
      req.actor.id,
      "select code,weight from public.compatibility_factors where enabled",
    );
    const weights = Object.fromEntries(
      factors.map((f) => [f.code, Number(f.weight)]),
    );
    ok(res, {
      items: await Promise.all(
        page.map(async (p) => ({
          ...(await photos(p)),
          compatibility: compatibility(own, p, weights),
        })),
      ),
      next_cursor: page.length === 20 ? page[page.length - 1].user_id : null,
    });
  });
  r.get("/:id", async (req, res) =>
    ok(
      res,
      await photos(
        await repo.call(req.actor.id, "profile", [uuid.parse(req.params.id)]),
      ),
    ),
  );
  r.post(
    "/me/photos",
    raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "5mb" }),
    async (req, res) => {
      if (!Buffer.isBuffer(req.body) || !req.body.length)
        throw new AppError(
          "INVALID_IMAGE",
          400,
          "Upload a JPEG, PNG or WebP image.",
        );
      const position = z.coerce
        .number()
        .int()
        .min(0)
        .max(5)
        .parse(req.query.position);
      let output: Buffer;
      try {
        const image = sharp(req.body, {
          limitInputPixels: 24000000,
          failOn: "error",
        });
        const meta = await image.metadata();
        if (
          !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
          !meta.width ||
          !meta.height ||
          meta.width < 200 ||
          meta.height < 200 ||
          (meta.pages && meta.pages > 1)
        )
          throw new Error("invalid");
        output = await image
          .rotate()
          .resize({
            width: 1200,
            height: 1600,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 82, progressive: true })
          .toBuffer();
      } catch {
        throw new AppError(
          "INVALID_IMAGE",
          400,
          "Use a clear, non-animated image at least 200 pixels wide and tall.",
        );
      }
      const key = `${req.actor.id}/${randomUUID()}.jpg`;
      const { error } = await storage.storage
        .from("profile-photos")
        .upload(key, output, { contentType: "image/jpeg", upsert: false });
      if (error)
        throw new AppError(
          "UPLOAD_FAILED",
          503,
          "Your photo could not upload. Try again.",
        );
      try {
        ok(
          res,
          await repo.call(req.actor.id, "addPhoto", [
            key,
            position,
            "image/jpeg",
            output.length,
          ]),
          201,
        );
      } catch (e) {
        await storage.storage.from("profile-photos").remove([key]);
        throw e;
      }
    },
  );
  return r;
}
