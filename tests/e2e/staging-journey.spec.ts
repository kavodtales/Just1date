import { test, expect } from "@playwright/test";
// Authenticated browser journeys use real staging users, never shipped mock accounts.
// Full signup/inbox verification/Paystack checkout/device flows remain a launch gate.
test("staging sign-in → profile → discovery → matches → messages → privacy", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    "Requires a dedicated active staging account with approved photos.",
  );
  await page.goto("/auth/login");
  await page.getByLabel("Email address").fill(process.env.E2E_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/discover/);
  await page.goto("/profile");
  await expect(
    page.getByRole("link", { name: "Edit my profile" }),
  ).toBeVisible();
  await page.goto("/matches");
  await expect(
    page.getByRole("heading", { name: "Your connections" }),
  ).toBeVisible();
  await page.goto("/messages");
  await expect(
    page.getByRole("heading", { name: "Messages", exact: true }),
  ).toBeVisible();
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Privacy", exact: true }),
  ).toBeVisible();
});
