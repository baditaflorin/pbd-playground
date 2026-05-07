import { expect, test } from "@playwright/test";

test("loads the playground, initializes physics, and accepts pointer interaction", async ({
  page,
}) => {
  test.setTimeout(45_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });

  await page.goto("./?renderer=webgl");
  await expect(page).toHaveTitle("pbd-playground");
  await expect(page.getByRole("link", { name: /star on github/i })).toHaveAttribute(
    "href",
    "https://github.com/baditaflorin/pbd-playground",
  );
  await expect(page.getByRole("link", { name: /paypal/i })).toHaveAttribute(
    "href",
    "https://www.paypal.com/paypalme/florinbadita",
  );
  await expect(page.locator("[data-build-commit]")).not.toHaveText("unknown");

  await page.locator('[data-setting="preset"]').selectOption("rope");
  await page.getByRole("button", { name: /start simulation/i }).click();
  await expect(page.locator("[data-wasm-status]")).toHaveText(/C\+\+ WASM|TypeScript/, {
    timeout: 15_000,
  });
  await expect(page.locator('[data-stat="renderer"]')).not.toHaveText("pending");

  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const bounds = box!;
  await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.34);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.58, bounds.y + bounds.height * 0.48, {
    steps: 6,
  });
  await page.mouse.up();

  await page.getByRole("button", { name: /tear/i }).click({ force: true });
  await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.51, bounds.y + bounds.height * 0.46);
  await page.mouse.up();

  expect(pageErrors).toEqual([]);
});
