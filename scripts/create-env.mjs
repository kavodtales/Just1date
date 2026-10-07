import { readFile, writeFile, mkdir, access } from "node:fs/promises";
async function create(path, content) {
  try {
    await access(path);
  } catch {
    await writeFile(path, content);
  }
}
const template = await readFile(".env.example", "utf8");
await create(".env.local", template);
await create(
  ".env.production",
  template.replace("NODE_ENV=development", "NODE_ENV=production"),
);
for (const app of ["web", "admin"]) {
  await mkdir(`apps/${app}`, { recursive: true });
  const content =
    "NEXT_PUBLIC_SUPABASE_URL=\nNEXT_PUBLIC_SUPABASE_ANON_KEY=\nAPI_URL=http://localhost:4000\n";
  await create(`apps/${app}/.env.example`, content);
  await create(`apps/${app}/.env.local`, content);
}
const native =
  "EXPO_PUBLIC_SUPABASE_URL=\nEXPO_PUBLIC_SUPABASE_ANON_KEY=\nEXPO_PUBLIC_API_URL=http://localhost:4000\nEAS_PROJECT_ID=\n";
await create("apps/mobile/.env.example", native);
await create("apps/mobile/.env.local", native);
