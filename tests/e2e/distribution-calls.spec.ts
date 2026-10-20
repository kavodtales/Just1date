import { test, expect } from "@playwright/test";
const id = "a1111111-1111-4111-8111-111111111111",
  conversation = "b2222222-2222-4222-8222-222222222222";
test("publishes install metadata and only real native-release links", async ({
  page,
}) => {
  const response = await page.request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toContain("/discover");
  for (const icon of manifest.icons) {
    const image = await page.request.get(icon.src);
    expect(image.ok()).toBe(true);
    expect(image.headers()["content-type"]).toContain("image/png");
  }
  await page.goto("/download");
  await expect(
    page.getByRole("heading", { name: "Keep a little possibility close." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open web app" }),
  ).toHaveAttribute("href", "/discover");
  await expect(
    page.getByRole("link", { name: "Download on the App Store" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Download Android APK" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/kavodtales/Just1date/releases/download/v0.1.0-rc.2/just1date-0.1.0-rc.2.apk",
  );
  await expect(
    page.getByText("Android release candidate", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByText("Verify your download", { exact: true }).click();
  await expect(page.locator(".download-card code")).toHaveText(
    /^[a-f0-9]{64}$/,
  );
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await page.screenshot({
    path: test.info().outputPath("download.png"),
    fullPage: true,
  });
});
test("shows a useful offline page without caching private API responses", async ({
  page,
  context,
}) => {
  await page.goto("/download");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.route("**/api/service/profiles/me", (route) =>
    route.fulfill({
      json: { data: { display_name: "Private test-only member" } },
    }),
  );
  await page.evaluate(() =>
    fetch("/api/service/profiles/me").then((r) => r.json()),
  );
  const entries = await page.evaluate(async () => {
    const keys = await caches.keys();
    const urls: string[] = [];
    for (const key of keys) {
      for (const request of await (await caches.open(key)).keys())
        urls.push(new URL(request.url).pathname);
    }
    return urls;
  });
  expect(entries).not.toContain("/api/service/profiles/me");
  expect(entries).toContain("/offline.html");
  await context.setOffline(true);
  await page.goto("/discover");
  await expect(
    page.getByRole("heading", { name: "A little pause. We’ll be here." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Try reconnecting" }),
  ).toBeVisible();
  await context.setOffline(false);
});
test("requires explicit invitation acceptance and never enables media automatically", async ({
  page,
}) => {
  let status = "ringing",
    tokens = 0;
  const actions: string[] = [];
  await page.route("**/api/service/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/actions")) {
      status =
        route.request().postDataJSON().action === "accept"
          ? "accepted"
          : "ended";
      actions.push(route.request().postDataJSON().action);
    }
    if (path.endsWith("/token")) tokens++;
    await route.fulfill({
      json: {
        data: {
          id,
          conversation_id: conversation,
          status,
          is_caller: false,
          other_name: "Test match",
          other_user_id: conversation,
          expires_at: new Date(Date.now() + 60000).toISOString(),
        },
      },
    });
  });
  await page.goto(`/calls/${id}`);
  await expect(
    page.getByRole("button", { name: "Accept invitation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Join video call" }),
  ).toHaveCount(0);
  expect(tokens).toBe(0);
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(
    page.getByRole("button", { name: "Join video call" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Join video call" }),
  ).toBeEnabled();
  expect(actions).toEqual(["accept"]);
  expect(tokens).toBe(0);
  await expect(
    page.getByRole("button", { name: "Turn camera on" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath("video-consent.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "End video call" }).click();
  await expect(
    page.getByRole("link", { name: "Continue chatting" }),
  ).toHaveAttribute("href", `/messages/${conversation}`);
  expect(actions).toEqual(["accept", "end"]);
});
