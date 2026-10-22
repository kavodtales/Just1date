import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("tests/fixtures", { recursive: true });
await sharp("apps/web/public/images/editorial/amara.webp")
  .jpeg({ quality: 95 })
  .toFile("tests/fixtures/reference-photo.jpg");
