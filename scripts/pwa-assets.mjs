import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { Buffer } from "node:buffer";
const directory = "apps/web/public/icons";
await mkdir(directory, { recursive: true });
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#f8f7f2"/><g transform="translate(116 116) scale(11.6667)" fill="none" stroke="#884757" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/></g></svg>`;
for (const size of [192, 512])
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`${directory}/icon-${size}.png`);
await sharp(Buffer.from(svg)).png().toFile(`${directory}/maskable-512.png`);
await sharp(Buffer.from(svg))
  .resize(180, 180)
  .png()
  .toFile(`${directory}/apple-touch-icon.png`);
