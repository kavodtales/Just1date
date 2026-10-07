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
// The provided brand artwork, cropped without recreating its letterforms.
await sharp("design/references/Sign up.jpg")
  .extract({ left: 86, top: 124, width: 199, height: 122 })
  .png()
  .toFile("apps/web/public/images/logo.png");
await copyFile(
  "apps/web/public/images/logo.png",
  "apps/mobile/assets/logo.png",
);
for (const [name, rectangle] of [
  ["social-facebook", { left: 88, top: 620, width: 29, height: 30 }],
  ["social-google", { left: 172, top: 620, width: 31, height: 30 }],
  ["social-apple", { left: 256, top: 620, width: 29, height: 30 }],
])
  await sharp("design/references/Sign up.jpg")
    .extract(rectangle)
    .png()
    .toFile(`apps/web/public/images/${name}.png`);
for (const [name, source, rectangle] of [
  [
    "notifications",
    "Notification.jpg",
    { left: 90, top: 195, width: 207, height: 190 },
  ],
  ["contacts", "Friends.jpg", { left: 90, top: 180, width: 200, height: 215 }],
]) {
  const destination = `apps/web/public/images/${name}.png`;
  await sharp(`design/references/${source}`)
    .extract(rectangle)
    .png()
    .toFile(destination);
  await copyFile(destination, `apps/mobile/assets/${name}.png`);
}
