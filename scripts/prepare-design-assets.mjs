import sharp from "sharp";
import { mkdir, copyFile } from "node:fs/promises";
const crops = [
  ["Onboarding 1.jpg", { left: 16, top: 44, width: 345, height: 417 }],
  ["Onboarding 2.jpg", { left: 9, top: 48, width: 364, height: 416 }],
  ["Onboarding 3.jpg", { left: 23, top: 56, width: 326, height: 364 }],
];
await mkdir("apps/mobile/assets/welcome", { recursive: true });
for (const [index, [name, rectangle]] of crops.entries()) {
  const destination = `apps/web/public/images/welcome-${index + 1}.jpg`;
  await sharp(`design/references/${name}`)
    .extract(rectangle)
    .jpeg({ quality: 95 })
    .toFile(destination);
  await copyFile(destination, `apps/mobile/assets/welcome/${index + 1}.jpg`);
}
// Use the owner's original PNG, not the low resolution screenshot crop.
await import("./prepare-brand-assets.mjs");
// Only photography and the original owner logo are raster assets.
// Controls, permission illustrations and match compositions are rendered in code.
await mkdir("apps/admin/public/images", { recursive: true });
for (let index = 1; index <= 3; index++) {
  await copyFile(
    `apps/web/public/images/welcome-${index}.jpg`,
    `apps/admin/public/images/welcome-${index}.jpg`,
  );
}
