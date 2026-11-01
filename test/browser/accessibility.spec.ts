import { expect, type Locator, type Page, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

// Presses Tab until the target has the focus, so it is reached by keyboard.
async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 50; i++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((node) => node === document.activeElement)) {
      return;
    }
  }
  throw new Error("not reached by Tab");
}

// The form fields without a name: a checkbox has its own label, every other
// field a visible one.
function unnamedFields(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("input, select"))
      .filter((field) =>
        field instanceof HTMLInputElement && field.type === "checkbox"
          ? !field.getAttribute("aria-label")
          : !Array.from((field as HTMLInputElement).labels ?? []).some(
              (label) => label.textContent?.trim(),
            ),
      )
      .map((field) => field.outerHTML),
  );
}

test("each page has its own title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Teamboard");
  await page.goto("/tasks/t3");
  await expect(page).toHaveTitle("Book a room for the team lunch - Teamboard");
  await page.goto("/tasks/t9");
  await expect(page).toHaveTitle("No such task - Teamboard");
});

test("every form field has a name", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("ul.tasks li")).toHaveCount(3);
  expect(await unnamedFields(page)).toEqual([]);
  await page.goto("/tasks/t2");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await unnamedFields(page)).toEqual([]);
});

test("the list page works by keyboard alone", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator("ul.tasks li")).toHaveCount(3);

  await tabTo(page, page.getByLabel("Title"));
  await page.keyboard.type("Call Anna");
  await page.keyboard.press("Enter");
  await expect(page.locator("ul.tasks li")).toHaveCount(4);

  await tabTo(page, page.getByLabel("Done: Book a room for the team lunch"));
  await page.keyboard.press("Space");
  await expect
    .poll(async () => (await (await request.get("/api/tasks/t3")).json()).done)
    .toBe(true);

  page.once("dialog", (dialog) => dialog.accept());
  await tabTo(page, page.getByLabel("Delete: Call Anna"));
  await page.keyboard.press("Enter");
  await expect(page.locator("ul.tasks li")).toHaveCount(3);

  await tabTo(
    page,
    page.getByRole("link", { name: "Book a room for the team lunch" }),
  );
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/tasks/t3");
});

test("the task page works by keyboard alone", async ({ page, request }) => {
  await page.goto("/tasks/t3");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await tabTo(page, page.getByLabel("Title"));
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("Book a big room");
  await page.keyboard.press("Enter");
  await expect(page.locator(".saved")).toHaveText("Saved");
  const task = await (await request.get("/api/tasks/t3")).json();
  expect(task.title).toBe("Book a big room");

  await tabTo(page, page.getByLabel("Teammate"));
  await page.keyboard.press("ArrowDown");
  await tabTo(page, page.getByRole("button", { name: "Share" }));
  await page.keyboard.press("Enter");
  await expect(page.locator(".shared")).toHaveText("Shared");

  await tabTo(page, page.getByRole("link", { name: "All tasks" }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/");
});

test("Saved and Shared are announced", async ({ page }) => {
  await page.goto("/tasks/t2");

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status").first()).toHaveText("Saved");

  await page.getByLabel("Teammate").selectOption("chen");
  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.getByRole("status").last()).toHaveText("Shared");
});
