import { readdir, mkdir, copyFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
const destination = "design/verification/current";
const names = new Set([
  "welcome",
  "welcome-matches",
  "welcome-premium",
  "signup",
  "birthday",
  "profile-details",
  "gender",
  "interests",
  "discover",
  "match",
  "filters",
  "matches",
  "messages",
  "profile",
  "gallery",
  "chat",
  "stories",
  "enable-notifications",
  "friends",
  "swipe-left",
  "swipe-right",
  "phone",
  "verification-code",
  "editorial-landing",
  "dates",
  "date-demo",
]);
await mkdir(destination, { recursive: true });
const collected = new Set();
names.add("admin-app-images-preview");
for (const directory of await readdir("test-results")) {
  if (!directory.endsWith("reference-375")) continue;
  for (const name of await readdir(join("test-results", directory))) {
    if (!names.has(name.replace(/\.png$/, "")) || !name.endsWith(".png"))
      continue;
    await copyFile(
      join("test-results", directory, name),
      join(destination, name),
    );
    collected.add(name);
  }
}
for (const name of await readdir(destination)) {
  if (name.endsWith(".png") && names.has(name.replace(/\.png$/, "")))
    collected.add(name);
}
await writeFile(
  join(destination, "README.md"),
  `# Current rendered screen review\n\nActual rendered web screens at 375 × 812, plus the desktop staff image editor. Photography, names, matches and messages in these screenshots are browser-test fixtures; they are never seeded as live members. Photography is original AI-created illustrative content. The screens themselves are React components, not screenshot backgrounds. Only photography and the original owner logo are images; titles, controls, permission artwork and the mutual-match composition are code. Native source shares the refreshed identity; these images are not physical-device screenshots. See [the image editing guide](../../../docs/APP_IMAGES.md) for the functional admin workflow.\n\n${[
    ...collected,
  ]
    .sort()
    .map((name) => `- [${name.replace(/\.png$/, "")}](./${name})`)
    .join("\n")}\n`,
);
console.log(`Collected ${collected.size} rendered reference screens.`);
