import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("tests/fixtures", { recursive: true });
await sharp("design/references/Main.jpg")
  .extract({ left: 40, top: 102, width: 294, height: 401 })
  .jpeg({ quality: 95 })
  .toFile("tests/fixtures/reference-photo.jpg");
