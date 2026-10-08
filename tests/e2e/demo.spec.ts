import { test, expect, type Page } from "@playwright/test";
const profiles = [
  {
    id: "d1111111-1111-4111-8111-111111111111",
    name: "Amara",
    age: 28,
    gender: "woman",
    city: "Lagos",
    profession: "Designer",
    image: "/images/demo/amara.png",
  },
  {
    id: "d2222222-2222-4222-8222-222222222222",
    name: "Tomi",
    age: 31,
    gender: "man",
    city: "Abuja",
    profession: "Architect",
    image: "/images/demo/tomi.png",
  },
  {
    id: "d3333333-3333-4333-8333-333333333333",
    name: "Zara",
    age: 27,
    gender: "woman",
    city: "Lagos",
    profession: "Creative strategist",
    image: "/images/demo/zara.png",
  },
  {
    id: "d4444444-4444-4444-8444-444444444444",
    name: "Daniel",
    age: 30,
    gender: "man",
    city: "Port Harcourt",
    profession: "Engineer",
    image: "/images/demo/daniel.png",
  },
].map((p) => ({
  ...p,
  bio: "I’m looking for a thoughtful connection, a good conversation and shared values.",
  interests: ["Travel", "Coffee", "Art"],
  values_list: ["Kindness", "Honesty"],
  prompt: "My perfect Sunday",
  answer: "A slow morning, a gallery visit and dinner with friends.",
}));
async function fixture(page: Page) {
  const state = {
    likes: [] as string[],
    passes: [] as string[],
    gender: "everyone",
    messages: {} as Record<
      string,
      Array<{ id: string; body: string; sender: string; at: string }>
    >,
  };
  await page.route("**/api/demo", async (route) => {
    const input = route.request().postDataJSON();
    if (input.action === "like") {
      state.likes.push(input.profile_id);
      state.messages[input.profile_id] = [
        {
          id: "greeting",
          body: "This is a sample conversation. What is your ideal first date?",
          sender: "sample",
          at: new Date().toISOString(),
        },
      ];
    }
    if (input.action === "message") {
      state.messages[input.profile_id].push(
        {
          id: input.client_id,
          body: input.body,
          sender: "you",
          at: new Date().toISOString(),
        },
        {
          id: "reply",
          body: "A bookshop and coffee sounds lovely. This reply is scripted.",
          sender: "sample",
          at: new Date().toISOString(),
        },
      );
    }
    if (input.action === "pass") state.passes.push(input.profile_id);
    if (input.action === "filter") state.gender = input.gender;
    if (input.action === "reset")
      Object.assign(state, {
        likes: [],
        passes: [],
        messages: {},
        gender: "everyone",
      });
    await route.fulfill({ json: { data: { profiles, state } } });
  });
}
async function nav(page: Page, label: string) {
  const name =
    (page.viewportSize()?.width ?? 1280) < 768
      ? "Demo mobile navigation"
      : "Demo navigation";
  await page
    .getByRole("navigation", { name, exact: true })
    .getByRole("button", { name: new RegExp(`^${label}`) })
    .click();
}
test("four labeled profiles support details, filtering, passing, matching, chat and reload", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/demo");
  await expect(page.locator(".demo-profile-card")).toHaveCount(4);
  await expect(
    page.getByText("INTERACTIVE PREVIEW", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Amara, fictional demo profile" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.getByRole("button", { name: "Women", exact: true }).click();
  await expect(page.locator(".demo-profile-card")).toHaveCount(2);
  await page.getByRole("button", { name: "View Amara’s profile" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByText("My perfect Sunday", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Like Amara", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "You chose each other." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Say hello", exact: true }).click();
  await page
    .getByLabel("Your demo message")
    .fill("A bookshop and coffee would be great.");
  await page.getByRole("button", { name: "Send demo message" }).click();
  await expect(
    page
      .getByRole("log")
      .getByText("A bookshop and coffee would be great.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("log").getByText(/This reply is scripted/),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".demo-profile-card")).toHaveCount(1);
  await nav(page, "Connections");
  await expect(
    page.getByRole("heading", { name: "Amara, 28", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Say hello" }).click();
  await expect(
    page
      .getByRole("log")
      .getByText("A bookshop and coffee would be great.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.locator(".demo-profile-card")).toHaveCount(4);
  await page.getByRole("button", { name: "Pass on Tomi" }).click();
  await expect(page.locator(".demo-profile-card")).toHaveCount(3);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});
test("service failures offer a recovery path without fake profiles", async ({
  page,
}) => {
  await page.route("**/api/demo", (route) =>
    route.fulfill({
      status: 410,
      json: {
        error: {
          message:
            "The preview has ended. Create an account to meet real members.",
        },
      },
    }),
  );
  await page.goto("/demo");
  await expect(page.locator(".premium-error[role=alert]")).toContainText(
    "The preview has ended",
  );
  await expect(page.locator(".demo-profile-card")).toHaveCount(0);
  await expect(
    page
      .locator(".premium-error[role=alert]")
      .getByRole("link", { name: "Create an account" }),
  ).toHaveAttribute("href", "/auth/register");
});
