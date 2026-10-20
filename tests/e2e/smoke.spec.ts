import { test, expect } from "@playwright/test";
test("renders real empty/setup states and working navigation", async ({
  page,
}) => {
  await page.goto("/discover");
  await expect(
    page.getByRole("heading", { name: "Discover", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open filters" }),
  ).toBeVisible();
  if ((page.viewportSize()?.width ?? 1440) > 700) {
    await page
      .getByRole("link", { name: "Safety Center", exact: true })
      .first()
      .click();
  } else {
    await page.goto("/safety");
  }
  await expect(
    page.getByRole("heading", { name: "Your peace of mind matters" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Automated contact alerts and location sharing are not connected.",
      { exact: false },
    ),
  ).toBeVisible();
});
test("provides accessible authentication and legal review notices", async ({
  page,
}) => {
  await page.goto("/auth/register");
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choose birthday date" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Terms", exact: true }).click();
  await expect(
    page.getByText("LEGAL REVIEW REQUIRED — NOT FINAL LAUNCH DOCUMENTS"),
  ).toBeVisible();
});
