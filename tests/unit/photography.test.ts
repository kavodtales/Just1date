import { expect, it } from "vitest";
import { editorialDemoPhoto } from "@just1date/config";
it("maps only known legacy demo aliases to newly generated optimized assets", () => {
  for (const name of ["amara", "tomi", "zara", "daniel"])
    expect(editorialDemoPhoto(`/images/demo/${name}.png`)).toBe(
      `/images/editorial/${name}.webp`,
    );
  expect(editorialDemoPhoto("/images/editorial/amara.webp")).toBe(
    "/images/editorial/amara.webp",
  );
  expect(editorialDemoPhoto("https://example.test/member-photo.jpg")).toBe(
    "https://example.test/member-photo.jpg",
  );
});
