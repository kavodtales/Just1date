import sharp from "sharp";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
const sourceRoot = process.argv[2] || process.env.JUST1DATE_IMAGE_SOURCE_DIR;
if (!sourceRoot)
  throw new Error(
    "Provide the original image_gen output directory. No stock or mockup photographs are used.",
  );
const manifest = JSON.parse(
  await readFile("design/photography/generation.json", "utf8"),
);
for (const directory of [
  "apps/web/public/images/editorial",
  "apps/admin/public/images/editorial",
  "apps/mobile/assets/editorial",
])
  await mkdir(directory, { recursive: true });
for (const item of manifest.assets) {
  const source = await readFile(join(sourceRoot, item.source_file));
  const output = await sharp(source)
    .rotate()
    .resize({
      width: item.name === "hero" ? 1600 : 1000,
      withoutEnlargement: true,
    })
    .webp({ quality: 84, effort: 6 })
    .toBuffer();
  const file = `${item.name}.webp`;
  await writeFile(join("apps/web/public/images/editorial", file), output);
  await copyFile(
    join("apps/web/public/images/editorial", file),
    join("apps/mobile/assets/editorial", file),
  );
  await copyFile(
    join("apps/web/public/images/editorial", file),
    join("apps/admin/public/images/editorial", file),
  );
  item.source_sha256 = createHash("sha256").update(source).digest("hex");
  item.output_sha256 = createHash("sha256").update(output).digest("hex");
  item.bytes = output.length;
  if (item.name === "hero") {
    const mobile = await sharp(source)
      .rotate()
      .resize(1000, 1000, { fit: "cover", position: "right" })
      .webp({ quality: 84, effort: 6 })
      .toBuffer();
    for (const directory of [
      "apps/web/public/images/editorial",
      "apps/admin/public/images/editorial",
      "apps/mobile/assets/editorial",
    ])
      await writeFile(join(directory, "hero-mobile.webp"), mobile);
  }
}
await writeFile(
  "design/photography/generation.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  JSON.stringify(manifest.assets.map(({ name, bytes }) => ({ name, bytes }))),
);
