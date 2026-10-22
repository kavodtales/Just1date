// Deploy original promotional photos through the existing private image feed.
// Preserve compatibility with the prior frontend until its replacement is live.
import { config } from "dotenv";
import { URL } from "node:url";
import { Buffer } from "node:buffer";
import { createClient } from "@supabase/supabase-js";
import { createDatabase } from "@just1date/database";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
config({ path: ".env.local", quiet: true });
if (
  new URL(process.env.SUPABASE_URL).hostname !==
  "kyfohngqetzsrqsyabey.supabase.co"
)
  throw new Error("Unexpected deployment project");
const db = createDatabase(
  process.env.DATABASE_URL,
  true,
  1,
  process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n"),
);
const storage = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
).storage.from("app-images");
try {
  await db.transaction(null, async (tx) => {
    const rows = await tx.query(
      "update public.demo_profiles set image='/images/demo/'||lower(name)||'.png' where name in('Amara','Tomi','Zara','Daniel') and image='/images/editorial/'||lower(name)||'.webp' returning id",
    );
    if (rows.rows.length)
      await tx.query(
        "insert into public.audit_logs(action,metadata) values('demo_photo_compatibility_restored',jsonb_build_object('profiles',$1::integer,'reason','prior frontend pending replacement; new frontend maps aliases to original editorial assets'))",
        [rows.rows.length],
      );
    console.log(
      JSON.stringify({ legacy_frontend_demo_links_restored: rows.rows.length }),
    );
  });
  const replacements = [
    ["welcome_algorithm", "amara"],
    ["welcome_matches", "tomi"],
    ["welcome_premium", "venue"],
  ];
  const before = (
    await db.query("select slot,revision from public.app_media_slots")
  ).rows;
  const prepared = [];
  for (const [slot, name] of replacements) {
    const bytes = await sharp(
      await readFile(`apps/web/public/images/editorial/${name}.webp`),
    )
      .rotate()
      .jpeg({ quality: 88, progressive: true })
      .toBuffer();
    const hash = createHash("sha256").update(bytes).digest("hex"),
      key = `editorial-2026-10-21/${hash}.jpg`;
    const existing = await storage.download(key);
    if (existing.data) {
      if (
        createHash("sha256")
          .update(Buffer.from(await existing.data.arrayBuffer()))
          .digest("hex") !== hash
      )
        throw new Error("Existing image digest mismatch");
    } else {
      const upload = await storage.upload(key, bytes, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (upload.error) throw new Error("Original photography upload failed");
    }
    prepared.push({
      slot,
      key,
      revision: before.find((r) => r.slot === slot).revision,
    });
  }
  await db.transaction(null, async (tx) => {
    for (const item of prepared) {
      const current = (
        await tx.query(
          "select storage_key,revision from public.app_media_slots where slot=$1 for update",
          [item.slot],
        )
      ).rows[0];
      if (current.revision !== item.revision)
        throw new Error(
          "Photography changed concurrently; review before retry",
        );
      if (current.storage_key === item.key) continue;
      await tx.query(
        "update public.app_media_slots set storage_key=$2,alt_text='Original AI-created illustrative photograph; fictional adults or setting, not members or a bookable venue',revision=revision+1,updated_at=now(),updated_by=null where slot=$1",
        [item.slot, item.key],
      );
      await tx.query(
        "insert into public.audit_logs(action,metadata) values('original_photography_deployed',jsonb_build_object('slot',$1::text,'storage_key',$2::text,'previous_key',$3::text,'source_commit','5f9399f'))",
        [item.slot, item.key, current.storage_key],
      );
    }
  });
  console.log(
    JSON.stringify({
      original_welcome_photos_published: prepared.length,
      storage_bucket_public: false,
    }),
  );
} finally {
  await db.close();
}
