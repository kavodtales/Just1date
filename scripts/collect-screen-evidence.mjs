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
]);
await mkdir(destination, { recursive: true });
const collected = new Set();
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
await writeFile(
  join(destination, "README.md"),
  `# Reference screen review\n\nActual rendered web screens at 375 × 812. Photography, names, matches and messages in these screenshots are browser-test fixtures; they are never seeded as live members. The original owner logo and supplied introductory artwork are used. Native source uses the same visual references; these images are not physical-device screenshots.\n\n${[
    ...collected,
  ]
    .sort()
    .map((name) => `- [${name.replace(/\.png$/, "")}](./${name})`)
    .join("\n")}\n`,
);
console.log(`Collected ${collected.size} rendered reference screens.`);
