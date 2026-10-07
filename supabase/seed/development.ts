import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createDatabase } from "@just1date/database";
config({ path: ".env.local" });
const url = process.env.SUPABASE_URL;
if (
  process.env.NODE_ENV !== "development" ||
  !url ||
  !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
)
  throw new Error(
    "Development seeding is restricted to a local Supabase project.",
  );
if (
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  !process.env.DATABASE_URL ||
  !process.env.TEST_SEED_PASSWORD ||
  process.env.TEST_SEED_PASSWORD.length < 12
)
  throw new Error(
    "Set DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY and a development-only TEST_SEED_PASSWORD of at least 12 characters.",
  );
const auth = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  }),
  db = createDatabase(process.env.DATABASE_URL, false);
for (const name of ["one", "two", "three"]) {
  const email = `development-${name}@example.test`;
  const { data: existing } = await auth.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });
  let user = existing.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await auth.auth.admin.createUser({
      email,
      password: process.env.TEST_SEED_PASSWORD,
      email_confirm: true,
      user_metadata: { date_of_birth: "1995-01-01" },
    });
    if (error || !data.user)
      throw new Error("Test user could not be provisioned.");
    user = data.user;
  }
  await db.transaction(user.id, async (tx) => {
    await tx.query("update public.users set is_test=true where id=$1", [
      user!.id,
    ]);
    await tx.query("select public.rpc_save_profile($1)", [
      JSON.stringify({
        display_name: `DEVELOPMENT TEST ${name}`,
        gender: "woman",
        city: "Lagos",
        bio: "This is an explicitly marked development account used only for local testing.",
        profession: "Test profession",
        education: "Test education",
        goal: "serious",
        interests: ["travel", "reading", "music"],
        values: ["kindness"],
        lifestyle: {},
        communication: "thoughtful",
        personality: [],
        prompts: [],
      }),
    ]);
  });
  console.log(
    `Created or refreshed ${email}; upload and approve a test photo to activate.`,
  );
}
process.exit(0);
