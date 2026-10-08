import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
// Fixtures exist only at the browser-test network boundary. The application
// never imports, seeds or serves these identities in discovery.
const user = "a1111111-1111-4111-8111-111111111111",
  other = "b2222222-2222-4222-8222-222222222222",
  conversation = "c3333333-3333-4333-8333-333333333333";
const profile = {
  user_id: other,
  display_name: "Angela Paul",
  age: 25,
  gender: "woman",
  city: "Lagos, NG",
  goal: "serious",
  profession: "Professional model",
  bio: "I enjoy meeting people, sharing stories and discovering new places together. A good book and a thoughtful conversation make my day.",
  photos: ["/test-photo.jpg", "/test-photo.jpg?2"],
  interests: ["travel", "books", "music"],
  lifestyle: {},
  values: [],
  personality: [],
  prompts: [],
  verified: false,
};
const own = {
  ...profile,
  user_id: user,
  display_name: "Test member",
  date_of_birth: "1995-07-11",
  status: "ACTIVE",
  completion: 100,
  preferences: {
    age_min: 20,
    age_max: 28,
    distance_km: 40,
    genders: ["woman"],
    goals: ["serious"],
    deal_breakers: {},
  },
  photo_review: [],
};
const match = {
  id: "d4444444-4444-4444-8444-444444444444",
  profile,
  conversation_id: conversation,
  created_at: "2026-10-07T12:00:00Z",
  unread_count: 2,
  last_message: {
    body: "Looking forward to meeting you.",
    created_at: "2026-10-07T13:00:00Z",
    sender_id: other,
    deleted: false,
  },
};
const messages = [
  {
    id: "e5555555-5555-4555-8555-555555555555",
    conversation_id: conversation,
    sender_id: other,
    body: "Hey! How’s it going? I noticed that we both love travel.",
    created_at: "2026-10-07T14:55:00Z",
    client_id: user,
    reply_to: null,
    deleted_at: null,
  },
  {
    id: "f6666666-6666-4666-8666-666666666666",
    conversation_id: conversation,
    sender_id: user,
    body: "Great to meet you! How about a coffee this evening?",
    created_at: "2026-10-07T15:02:00Z",
    client_id: other,
    reply_to: null,
    deleted_at: null,
  },
];
async function fixture(page: Page) {
  await page.route("**/test-photo.jpg*", async (route) =>
    route.fulfill({
      contentType: "image/jpeg",
      body: await readFile("tests/fixtures/reference-photo.jpg"),
    }),
  );
  await page.route("**/api/service/**", async (route) => {
    const path = new URL(route.request().url()).pathname.split(
      "/api/service/",
    )[1];
    let data: unknown = [];
    if (path === "profiles/me") data = own;
    else if (path === "profiles/discover")
      data = { items: [profile], next_cursor: null };
    else if (path === `profiles/${other}`) data = profile;
    else if (path === "matches" || path === "conversations") data = [match];
    else if (path === "likes")
      data =
        route.request().method() === "POST"
          ? { matched: true, conversation_id: conversation }
          : [profile];
    else if (path === `conversations/${conversation}/messages`)
      data = route.request().method() === "POST" ? { id: user } : messages;
    else if (path === "super-likes" || path === "passes")
      data = { matched: false };
    else if (path === "catalog/interests")
      data = profile.interests.map((code) => ({ code, name: code }));
    await route.fulfill({ json: { data, request_id: "test-fixture" } });
  });
}
async function capture(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: test.info().outputPath(`${name}.png`),
    fullPage: true,
  });
}
test("premium welcome and signup navigation work", async ({ page }) => {
  await page.goto("/welcome");
  await expect(
    page.getByRole("heading", { name: /Less swiping/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Try the app", exact: true }),
  ).toHaveAttribute("href", "/demo");
  await capture(page, "welcome");
  await page
    .getByRole("link", { name: "Create an account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Let’s get to know you." }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Date of birth")).toBeVisible();
  await capture(page, "signup");
  await expect(
    page.getByRole("link", { name: "Use phone number" }),
  ).toHaveCount(0);
});
test("registration saves a private birth date and offers password visibility", async ({
  page,
}) => {
  await page.goto("/auth/register");
  await page.getByLabel("Date of birth").fill("1995-07-11");
  await expect(page.locator('input[name="date_of_birth"]')).toHaveValue(
    "1995-07-11",
  );
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.locator('input[name="password"]')).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(page.locator('input[name="password"]')).toHaveAttribute(
    "type",
    "password",
  );
  await expect(page.locator('input[name="password"]')).toHaveAttribute(
    "minlength",
    "12",
  );
});
test("the single profile form saves essential details, interests and values", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/onboarding");
  await page.getByLabel("Display name", { exact: true }).fill("A real member");
  await page.getByLabel("City", { exact: true }).fill("Lagos");
  await page
    .getByLabel("A little about me", { exact: true })
    .fill(
      "I enjoy thoughtful conversation, a good book and finding new favourite places.",
    );
  const sent = page.waitForRequest(
    (r) => r.url().endsWith("/profiles/me") && r.method() === "PATCH",
  );
  await page
    .getByRole("button", { name: "Save my profile", exact: true })
    .click();
  const payload = (await sent).postDataJSON();
  expect(payload.display_name).toBe("A real member");
  expect(payload.interests).toHaveLength(3);
  await expect(page.locator(".editor-success")).toContainText(
    "Your profile is saved.",
  );
});
test("discovery matches the reference dimensions and records a real action request", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/discover");
  await expect(
    page.getByRole("heading", { name: "Angela Paul, 25" }),
  ).toBeVisible();
  await capture(page, "discover");
  if (test.info().project.name === "reference-375") {
    const card = await page.locator(".discovery-card").boundingBox();
    expect(card?.x).toBe(40);
    expect(card?.width).toBe(295);
    expect(card?.height).toBe(484);
    expect(
      await page
        .locator(".reaction-button.like")
        .evaluate((el) => el.getBoundingClientRect().width),
    ).toBe(100);
    await expect(
      page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link"),
    ).toHaveCount(4);
  }
  const request = page.waitForRequest(
    (r) => r.url().endsWith("/api/service/likes") && r.method() === "POST",
  );
  await page
    .getByRole("button", { name: "Like this profile", exact: true })
    .click();
  const data = (await request).postDataJSON();
  expect(data.target_id).toBe(other);
  expect(data.operation_id).toMatch(/^[\da-f-]{36}$/);
  await expect(
    page.getByRole("heading", { name: "It’s a match!", exact: true }),
  ).toBeVisible();
  await capture(page, "match");
  await page.getByRole("link", { name: "Say hi" }).click();
  await expect(page).toHaveURL(new RegExp(`/messages/${conversation}`));
});
test("filters submit validated preferences and close the sheet", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/discover");
  await page.getByRole("button", { name: "Open filters" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await capture(page, "filters");
  await page.getByRole("button", { name: "Boys", exact: true }).click();
  const request = page.waitForRequest(
    (r) =>
      r.url().endsWith("/profiles/me/preferences") && r.method() === "PATCH",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  expect((await request).postDataJSON().genders).toEqual(["man"]);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("matches use approved photos and messages show actual inbox metadata", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/matches");
  await expect(
    page.getByRole("heading", { name: "Angela Paul, 25" }),
  ).toBeVisible();
  await capture(page, "matches");
  await page.goto("/messages");
  await expect(page.getByText("Looking forward to meeting you.")).toBeVisible();
  await expect(page.getByLabel("2 unread messages")).toBeVisible();
  await capture(page, "messages");
  await page
    .getByRole("textbox", { name: "Search messages by member name" })
    .fill("someone else");
  await expect(
    page.getByText("No conversations match your search."),
  ).toBeVisible();
});
test("profile gallery, read more and fullscreen photo controls work", async ({
  page,
}) => {
  await fixture(page);
  await page.goto(`/profile/${other}`);
  await expect(
    page.getByRole("heading", { name: "Angela Paul, 25" }),
  ).toBeVisible();
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    const hero = await page.locator(".profile-hero").boundingBox();
    expect(hero?.x).toBe(0);
    expect(hero?.y).toBe(0);
    expect(hero?.width).toBe(page.viewportSize()?.width);
    expect(hero?.height).toBe(393);
    await expect(
      page.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeHidden();
  }
  await capture(page, "profile");
  await page.getByRole("button", { name: "See all" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Show photo 2" }).click();
  await expect(
    page.getByRole("img", { name: "Angela Paul, photo 2", exact: true }).last(),
  ).toBeVisible();
  await capture(page, "gallery");
  await page.getByRole("button", { name: "Close gallery" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("chat composes and sends only after member confirmation", async ({
  page,
}) => {
  await fixture(page);
  await page.goto(`/messages/${conversation}`);
  await expect(
    page.getByText("Great to meet you! How about a coffee this evening?"),
  ).toBeVisible();
  await capture(page, "chat");
  await page
    .getByRole("textbox", { name: "Your message" })
    .fill("Let’s meet in a public cafe.");
  const request = page.waitForRequest(
    (r) =>
      r.url().endsWith(`/conversations/${conversation}/messages`) &&
      r.method() === "POST",
  );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const sent = (await request).postDataJSON();
  expect(sent.body).toBe("Let’s meet in a public cafe.");
  expect(sent.client_id).toMatch(/^[\da-f-]{36}$/);
});

test("phone sign-in verifies the entered code and enforces the resend cooldown", async ({
  page,
}) => {
  await fixture(page);
  await page.clock.install();
  const requests: Array<{ mode: string; phone: string; token?: string }> = [];
  await page.route("**/api/auth", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        verified: requests.at(-1)?.mode === "phone_verify",
      }),
    });
  });
  await page.goto("/auth/phone");
  await page
    .getByRole("textbox", { name: "Phone number", exact: true })
    .fill("08137925301");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "01:00" })).toBeVisible();
  expect(requests[0]).toEqual({ mode: "phone_send", phone: "+2348137925301" });
  await expect(page.getByRole("button", { name: "Send again" })).toBeDisabled();
  await page.clock.runFor(60000);
  await expect(page.getByRole("heading", { name: "00:00" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send again" })).toBeEnabled();
  await page.getByRole("textbox", { name: "Verification code" }).fill("123456");
  await page.getByRole("button", { name: "Verify code" }).click();
  await expect(page).toHaveURL(/\/discover$/);
  expect(requests[1]).toEqual({
    mode: "phone_verify",
    phone: "+2348137925301",
    token: "123456",
  });
});
