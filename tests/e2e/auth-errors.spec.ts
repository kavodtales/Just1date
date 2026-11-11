import { test, expect } from "@playwright/test";
test("missing birthdays explain what is required without sending a registration", async ({
  page,
}) => {
  let posted = false;
  await page.route("**/api/auth", (route) => {
    posted = true;
    return route.fulfill({ json: { message: "Unexpected submission" } });
  });
  await page.goto("/auth/register");
  await page.getByLabel("Email address").fill("fictional@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("long-sample-password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Choose your birthday");
  expect(posted).toBe(false);
});
test("expired links and non-JSON account failures provide useful feedback", async ({
  page,
}) => {
  await page.goto("/auth/login?expired=true");
  await expect(page.getByRole("alert")).toContainText("invalid or expired");
  await page.route("**/api/auth", (route) =>
    route.fulfill({
      status: 503,
      contentType: "text/html",
      body: "<h1>Service unavailable</h1>",
    }),
  );
  await page.getByLabel("Email address").fill("fictional@example.com");
  await page.getByLabel("Password", { exact: true }).fill("sample-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
});
