import { test, expect } from "@playwright/test";
const profiles = ["Amara", "Tomi", "Zara", "Daniel"].map((name, i) => ({
  id: `demo-${i}`,
  name,
  age: [28, 31, 27, 30][i],
  city: i === 1 ? "Abuja" : "Lagos",
  image: `/images/demo/${name.toLowerCase()}.png`,
  removed_at: null as string | null,
}));
test("admin can review, remove and restore exactly the four demos", async ({
  page,
}) => {
  let active = 4;
  const actions: string[] = [];
  await page.route("**/api/service/**", async (route) => {
    const path = new URL(route.request().url()).pathname.split(
      "/api/service/",
    )[1];
    let data: unknown = {};
    if (path === "admin/me") data = { role: "ADMIN" };
    if (path === "admin/metrics")
      data = { total_users: 2, active_users: 2, matches: 0 };
    if (path === "admin/photos" || path === "admin/moderation") data = [];
    if (path === "admin/demo") {
      if (route.request().method() === "POST") {
        const action = route.request().postDataJSON().action;
        actions.push(action);
        active = action === "remove" ? 0 : 4;
      }
      data = {
        active,
        profiles: profiles.map((p) => ({
          ...p,
          removed_at: active ? null : "2026-10-08T12:00:00Z",
        })),
      };
    }
    await route.fulfill({ json: { data } });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Demo profiles", exact: true })
    .click();
  await expect(page.locator(".admin-demo-card")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Remove all 4 demo profiles", exact: true })
    .click();
  expect(actions).toEqual([]);
  await expect(
    page.getByText(/Remove Amara, Tomi, Zara and Daniel/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Keep the demo", exact: true })
    .click();
  expect(actions).toEqual([]);
  await page
    .getByRole("button", { name: "Remove all 4 demo profiles", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm removal of 4 demos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "The demo is removed", exact: true }),
  ).toBeVisible();
  expect(actions).toEqual(["remove"]);
  await page
    .getByRole("button", { name: "Restore the 4 demo profiles", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Switch to real members", exact: true }),
  ).toBeVisible();
  expect(actions).toEqual(["remove", "restore"]);
  await expect(page.locator(".admin-demo-card")).toHaveCount(4);
});
test("moderators cannot use demo removal controls", async ({ page }) => {
  await page.route("**/api/service/**", (route) =>
    route.fulfill({
      json: {
        data: route.request().url().endsWith("admin/me")
          ? { role: "MODERATOR" }
          : [],
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Demo profiles", exact: true })
    .click();
  await expect(
    page.getByText("Your role does not have demo management access."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove all 4 demo profiles" }),
  ).toHaveCount(0);
});
