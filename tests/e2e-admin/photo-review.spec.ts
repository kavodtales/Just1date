import { test, expect } from "@playwright/test";
test("staff can see a signed photo directly and submit an explicit review", async ({
  page,
  baseURL,
}) => {
  const photo = "b2222222-2222-4222-8222-222222222222";
  const signed = `${baseURL}/images/editorial/amara.webp?token=fictional-test-token`;
  const reviews: unknown[] = [];
  await page.route("**/api/service/**", (route) => {
    const path = new URL(route.request().url()).pathname.split(
      "/api/service/",
    )[1];
    let data: unknown = [];
    if (path === "admin/me") data = { role: "ADMIN" };
    if (path === "admin/metrics") data = {};
    if (path === "admin/photos")
      data = [{ id: photo, user_id: "fictional-owner", url: signed }];
    if (route.request().method() === "POST")
      reviews.push(route.request().postDataJSON());
    return route.fulfill({ json: { data } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Photo review", exact: true }).click();
  const image = page.getByRole("img", {
    name: "Private profile photo submitted for review",
  });
  await expect(image).toHaveAttribute("src", signed);
  await expect
    .poll(() =>
      image.evaluate((node) => (node as HTMLImageElement).naturalWidth > 0),
    )
    .toBe(true);
  await page.getByLabel("Decision").selectOption("approve");
  await page
    .getByLabel("Reason")
    .fill("Fictional image used only for this isolated review test.");
  await page
    .getByRole("button", { name: "Record photo review", exact: true })
    .click();
  await expect(
    page.getByText("Action recorded in the audit trail.", { exact: true }),
  ).toBeVisible();
  expect(reviews).toEqual([
    {
      approved: true,
      reason: "Fictional image used only for this isolated review test.",
    },
  ]);
});
