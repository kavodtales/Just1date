import sharp from "sharp";
import { mkdir } from "node:fs/promises";
const directory = "apps/mobile/assets";
await mkdir(directory, { recursive: true });
// Run prepare-design-assets.mjs first when regenerating the supplied brand.
const logo = `${directory}/logo.png`;
async function canvas(output, width, height, logoWidth, background) {
  const artwork = await sharp(logo)
    .resize({ width: logoWidth })
    .png()
    .toBuffer();
  await sharp({ create: { width, height, channels: 4, background } })
    .composite([{ input: artwork, gravity: "center" }])
    .png()
    .toFile(`${directory}/${output}`);
}
await canvas("icon.png", 1024, 1024, 832, "white");
await canvas("adaptive-icon.png", 1024, 1024, 512, {
  r: 255,
  g: 255,
  b: 255,
  alpha: 0,
});
await sharp(logo)
  .resize({ width: 600 })
  .png()
  .toFile(`${directory}/splash.png`);
