import sharp from "sharp";
import { mkdir, copyFile, writeFile } from "node:fs/promises";

// Owner supplied artwork. Keep the original intact; never redraw the logo.
const source = "design/Just1date-original.png";
const crop = { left: 120, top: 121, width: 390, height: 230 };
for (const directory of [
  "apps/web/public/images",
  "apps/web/public/icons",
  "apps/admin/public/images",
  "apps/mobile/assets",
])
  await mkdir(directory, { recursive: true });
for (const directory of [
  "apps/web/public/images",
  "apps/admin/public/images",
  "apps/mobile/assets",
])
  await copyFile(source, `${directory}/logo-original.png`);
const artwork = await sharp(source).extract(crop).png().toBuffer();
for (const directory of [
  "apps/web/public/images",
  "apps/admin/public/images",
  "apps/mobile/assets",
])
  await sharp(artwork).png().toFile(`${directory}/logo.png`);
await sharp(artwork).png().toFile("apps/mobile/assets/splash.png");
for (const [path, size, safe] of [
  ["apps/mobile/assets/icon.png", 1024, 768],
  ["apps/mobile/assets/adaptive-icon.png", 1024, 640],
  ["apps/web/public/icons/icon-192.png", 192, 144],
  ["apps/web/public/icons/icon-512.png", 512, 384],
  ["apps/web/public/icons/maskable-512.png", 512, 320],
  ["apps/web/public/icons/apple-touch-icon.png", 180, 135],
]) {
  const logo = await sharp(artwork)
    .resize(safe, safe, { fit: "inside" })
    .toBuffer();
  const image = await sharp({
    create: { width: size, height: size, channels: 4, background: "#ffffff" },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toBuffer();
  await writeFile(path, image);
}
