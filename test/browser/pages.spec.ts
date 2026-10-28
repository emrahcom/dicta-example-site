import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

test("lists the tasks with due date and assignee", async ({ page }) => {
  await page.goto("/");

  const items = page.locator("ul.tasks li");
  await expect(items).toHaveCount(3);
  await expect(items.nth(1)).toContainText(
    "Review the design for the new homepage",
  );
  await expect(items.nth(1)).toContainText("due 2026-11-05, Ben Okafor");
});

test("adds a task", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Title").fill("Call Anna");
  await page.getByLabel("Due date").fill("2026-11-06");
  await page.getByLabel("Assignee").selectOption("anna");
  await page.getByRole("button", { name: "Add task" }).click();

  const items = page.locator("ul.tasks li");
  await expect(items).toHaveCount(4);
  await expect(items.nth(3)).toContainText("Call Anna");
  await expect(items.nth(3)).toContainText("due 2026-11-06, Anna Weber");
  await expect(page.getByLabel("Title")).toHaveValue("");
});

test("marks a task done", async ({ page, request }) => {
  await page.goto("/");

  await page.getByLabel("Done: Book a room for the team lunch").check();

  await expect
    .poll(async () => (await (await request.get("/api/tasks/t3")).json()).done)
    .toBe(true);
});

test("marks a done task not done", async ({ page, request }) => {
  await page.goto("/");

  await page.getByLabel("Done: Send the invoice to Nordwind").uncheck();

  await expect
    .poll(async () => (await (await request.get("/api/tasks/t1")).json()).done)
    .toBe(false);
});

test("deletes a task after the user agrees", async ({ page }) => {
  await page.goto("/");
  page.once("dialog", (dialog) => dialog.accept());

  await page.getByLabel("Delete: Book a room for the team lunch").click();

  await expect(page.locator("ul.tasks li")).toHaveCount(2);
});

test("keeps a task when the user does not agree", async ({ page }) => {
  await page.goto("/");
  let asked = "";
  page.once("dialog", (dialog) => {
    asked = dialog.message();
    return dialog.dismiss();
  });

  await page.getByLabel("Delete: Book a room for the team lunch").click();

  await expect
    .poll(() => asked)
    .toBe('Delete "Book a room for the team lunch"?');
  await expect(page.locator("ul.tasks li")).toHaveCount(3);
});

test("opens the page of a task", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("link", { name: "Book a room for the team lunch" })
    .click();

  await expect(page).toHaveURL("/tasks/t3");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Book a room for the team lunch",
  );
});

test("changes a task on its page", async ({ page, request }) => {
  await page.goto("/tasks/t3");

  await page.getByLabel("Title").fill("Book a big room");
  await page.getByLabel("Due date").fill("2026-11-10");
  await page.getByLabel("Assignee").selectOption("chen");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Saved")).toBeVisible();
  const task = await (await request.get("/api/tasks/t3")).json();
  expect(task).toMatchObject({
    title: "Book a big room",
    due: "2026-11-10",
    assignee: "chen",
  });
});

test("shares a task", async ({ page }) => {
  await page.goto("/tasks/t2");

  await page.getByLabel("Teammate").selectOption("chen");
  await page.getByRole("button", { name: "Share" }).click();

  await expect(page.getByText("Shared")).toBeVisible();
});

test("shows the API's error", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Title").fill(" ");
  await page.getByRole("button", { name: "Add task" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "title must be 1 to 200 characters",
  );
});

test("shows a share without a teammate as an error", async ({ page }) => {
  await page.goto("/tasks/t2");

  await page.getByRole("button", { name: "Share" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "teammate must be a teammate id",
  );
});

test("goes back to all tasks", async ({ page }) => {
  await page.goto("/tasks/t2");

  await page.getByRole("link", { name: "All tasks" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.locator("ul.tasks li")).toHaveCount(3);
});

test("shows an unknown task", async ({ page }) => {
  await page.goto("/tasks/t9");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "No such task",
  );
});
