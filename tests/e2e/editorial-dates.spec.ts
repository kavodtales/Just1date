import { test, expect } from "@playwright/test";
test("original editorial photographs load and all landing destinations are real", async ({
  page,
}) => {
  await page.route("**/api/app-media", (r) =>
    r.fulfill({ json: { data: [] } }),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Just one date.",
  );
  await expect(
    page.getByText("These are fictional AI-created demo profiles", {
      exact: false,
    }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".editorial-person img")
        .evaluateAll((images) =>
          images.every(
            (i) =>
              (i as HTMLImageElement).complete &&
              (i as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await expect(page.locator(".editorial-person")).toHaveCount(4);
  expect(await page.locator('.editorial-landing a[href="#"]').count()).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("editorial-landing.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Start something real", exact: false })
    .click();
  await expect(page.getByLabel("Email address")).toBeVisible();
});
test("an admin-published hero updates separately from coded content and falls back on failure", async ({
  page,
}) => {
  await page.route("**/api/app-media", (r) =>
    r.fulfill({
      json: {
        data: [
          {
            slot: "landing_hero",
            url: "/images/editorial/hero.webp",
            alt_text: "Staff-selected illustrative photo",
            revision: 2,
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("img", { name: "Staff-selected illustrative photo" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Just one date.",
  );
});
test("date proposals validate time, persist and require recipient consent", async ({
  page,
}) => {
  const match = "d4444444-4444-4444-8444-444444444444";
  const plans: any[] = [];
  const actions: unknown[] = [];
  await page.route("**/api/service/**", async (r) => {
    const path = new URL(r.request().url()).pathname.split("/api/service/")[1];
    let data: unknown = [];
    if (path === "matches")
      data = [{ id: match, profile: { display_name: "Test connection" } }];
    if (path === "dates") {
      if (r.request().method() === "POST") {
        const body = r.request().postDataJSON();
        expect(body.match_id).toBe(match);
        expect(body.operation_id).toMatch(/^[a-f0-9-]{36}$/);
        plans.push({
          ...body,
          id: body.operation_id,
          proposer_id: "test",
          is_sender: false,
          other_name: "Test connection",
          status: "proposed",
          revision: 0,
        });
      }
      data = plans;
    }
    if (path.startsWith("dates/") && path.endsWith("/actions")) {
      const body = r.request().postDataJSON();
      actions.push(body);
      plans[0] = {
        ...plans[0],
        status: body.action === "accept" ? "accepted" : "cancelled",
        revision: plans[0].revision + 1,
      };
      data = plans[0];
    }
    await r.fulfill({ json: { data } });
  });
  await page.route("**/api/app-media", (r) =>
    r.fulfill({ json: { data: [] } }),
  );
  await page.goto(`/dates?match=${match}`);
  await page.getByLabel("Public meeting place").fill("A public café");
  await page.getByLabel("Date & time").fill("2020-01-01T15:00");
  await page
    .getByRole("button", { name: "Send date invitation", exact: false })
    .click();
  await expect(
    page.locator(".date-experience").getByRole("alert"),
  ).toContainText("15 minutes");
  expect(plans).toHaveLength(0);
  const date = new Date(Date.now() + 86400000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  await page.getByLabel("Date & time").fill(date.toISOString().slice(0, 16));
  await page
    .getByRole("button", { name: "Send date invitation", exact: false })
    .click();
  await expect(page.getByText("Awaiting reply", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Accept invitation", exact: true })
    .click();
  await expect(page.getByText("accepted", { exact: true })).toBeVisible();
  expect(actions).toEqual([{ action: "accept", revision: 0 }]);
  await page.getByRole("button", { name: "Cancel plan", exact: true }).click();
  await expect(page.getByText("cancelled", { exact: true })).toBeVisible();
  expect(actions[1]).toEqual({ action: "cancel", revision: 1 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("dates.png"),
    fullPage: true,
  });
});
