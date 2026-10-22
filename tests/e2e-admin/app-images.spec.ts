import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const slots = [
  "welcome_algorithm",
  "welcome_matches",
  "welcome_premium",
  "landing_hero",
  "date_venue",
];
test("admin previews, publishes and restores welcome photography", async ({
  page,
}) => {
  let rows = slots.map((slot) => ({
    slot,
    revision: 0,
    url: null as string | null,
    alt_text: "",
    updated_at: "2026-10-20T12:00:00Z",
  }));
  const published: string[] = [];
  await page.route("**/api/service/**", async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname.split("/api/service/")[1];
    let data: unknown = [];
    if (path === "admin/me") data = { role: "ADMIN" };
    if (path === "admin/app-media")
      data = [
        ...rows,
        {
          slot: "future_slot",
          revision: 0,
          url: null,
          alt_text: "",
          updated_at: "2026-10-22T00:00:00Z",
        },
      ];
    if (path.startsWith("admin/app-media/")) {
      const slot = path.split("/")[2],
        reset = path.endsWith("/reset");
      const row = rows.find((r) => r.slot === slot)!;
      if (!reset) {
        expect(route.request().headers()["content-type"]).toBe("image/jpeg");
        expect(Number(url.searchParams.get("revision"))).toBe(row.revision);
        published.push(slot);
      }
      rows = rows.map((r) =>
        r.slot === slot
          ? {
              ...r,
              revision: r.revision + 1,
              url: reset ? null : "/images/editorial/tomi.webp",
              alt_text: url.searchParams.get("alt") ?? "",
            }
          : r,
      );
      data = rows.find((r) => r.slot === slot);
    }
    await route.fulfill({ json: { data } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "App images", exact: true }).click();
  const card = page.locator(".app-image-card").first();
  await expect(page.locator(".app-image-card")).toHaveCount(5);
  await card.getByLabel("Choose replacement photo").setInputFiles({
    name: "portrait.jpg",
    mimeType: "image/jpeg",
    buffer: await readFile("tests/fixtures/reference-photo.jpg"),
  });
  await expect(
    card.getByText("Unpublished preview", { exact: true }),
  ).toBeVisible();
  expect(published).toEqual([]);
  await card
    .getByLabel("Photo description")
    .fill("A smiling member enjoying her day");
  await page.screenshot({
    path: test.info().outputPath("admin-app-images-preview.png"),
    fullPage: true,
  });
  await card
    .getByRole("button", { name: "Publish photo", exact: true })
    .click();
  await expect(
    card.getByText("Published photo", { exact: true }),
  ).toBeVisible();
  expect(published).toEqual(["welcome_algorithm"]);
  await card
    .getByRole("button", { name: "Restore original photo", exact: true })
    .click();
  expect(rows[0].revision).toBe(1);
  await card
    .getByRole("button", { name: "Confirm restore", exact: true })
    .click();
  await expect(card.getByText("Original photo", { exact: true })).toBeVisible();
  expect(rows[0].revision).toBe(2);
});
test("moderator cannot open app image publishing controls", async ({
  page,
}) => {
  await page.route("**/api/service/**", (route) =>
    route.fulfill({
      json: {
        data: route.request().url().endsWith("/admin/me")
          ? { role: "MODERATOR" }
          : [],
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "App images", exact: true }).click();
  await expect(
    page.getByText("Your role does not have app image management access."),
  ).toBeVisible();
  await expect(page.locator("input[type=file]")).toHaveCount(0);
});
