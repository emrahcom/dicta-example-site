import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, test } from "node:test";
import { startServer } from "../server/server.ts";

const server = startServer(0);
let base = "";

before(async () => {
  await once(server, "listening");
  base = `http://localhost:${(server.address() as AddressInfo).port}/api`;
});

after(() => server.close());

beforeEach(async () => {
  await fetch(`${base}/reset`, { method: "POST" });
});

async function call(method: string, path: string, body?: unknown) {
  const response = await fetch(base + path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : undefined };
}

test("lists the sample tasks", async () => {
  const { status, body } = await call("GET", "/tasks");

  assert.equal(status, 200);
  assert.deepEqual(
    body.map((t: { id: string }) => t.id),
    ["t1", "t2", "t3"],
  );
});

test("finds tasks by title, ignoring case", async () => {
  const { body } = await call("GET", "/tasks?q=NORDWIND");

  assert.deepEqual(
    body.map((t: { id: string }) => t.id),
    ["t1"],
  );
});

test("adds a task", async () => {
  const created = await call("POST", "/tasks", {
    title: "Call Anna",
    due: "2026-11-06",
    assignee: "anna",
  });

  assert.equal(created.status, 201);
  assert.deepEqual(created.body, {
    id: "t4",
    title: "Call Anna",
    due: "2026-11-06",
    done: false,
    assignee: "anna",
  });
  assert.equal((await call("GET", "/tasks/t4")).body.title, "Call Anna");
});

test("adds a task with only a title", async () => {
  const { body } = await call("POST", "/tasks", { title: "Call Anna" });

  assert.equal(body.due, null);
  assert.equal(body.assignee, null);
});

test("gets one task", async () => {
  const { status, body } = await call("GET", "/tasks/t2");

  assert.equal(status, 200);
  assert.equal(body.title, "Review the design for the new homepage");
});

test("changes a task", async () => {
  const { status, body } = await call("PATCH", "/tasks/t3", {
    title: "Book a big room",
    due: "2026-11-10",
    done: true,
    assignee: "chen",
  });

  assert.equal(status, 200);
  assert.deepEqual(body, {
    id: "t3",
    title: "Book a big room",
    due: "2026-11-10",
    done: true,
    assignee: "chen",
  });
});

test("clears the due date and the assignee", async () => {
  const { body } = await call("PATCH", "/tasks/t2", {
    due: null,
    assignee: null,
  });

  assert.equal(body.due, null);
  assert.equal(body.assignee, null);
});

test("deletes a task", async () => {
  assert.equal((await call("DELETE", "/tasks/t1")).status, 204);
  assert.equal((await call("GET", "/tasks/t1")).status, 404);
});

test("shares a task by logging the email", async (t) => {
  const log = t.mock.method(console, "log", () => {});

  const { status } = await call("POST", "/tasks/t2/share", {
    teammate: "chen",
  });

  assert.equal(status, 204);
  assert.equal(log.mock.callCount(), 1);
  assert.match(
    String(log.mock.calls[0]?.arguments[0]),
    /chen@example\.com.*Review the design/,
  );
});

test("lists the teammates", async () => {
  const { body } = await call("GET", "/teammates");

  assert.deepEqual(
    body.map((t: { id: string }) => t.id),
    ["anna", "ben", "chen"],
  );
});

test("reset restores the sample data", async () => {
  await call("DELETE", "/tasks/t1");
  await call("POST", "/tasks", { title: "Extra" });

  assert.equal((await call("POST", "/reset")).status, 204);

  const { body } = await call("GET", "/tasks");
  assert.deepEqual(
    body.map((t: { id: string }) => t.id),
    ["t1", "t2", "t3"],
  );
  assert.equal((await call("POST", "/tasks", { title: "New" })).body.id, "t4");
});

const UNKNOWN_TASK: [string, string, unknown][] = [
  ["GET", "/tasks/t9", undefined],
  ["PATCH", "/tasks/t9", { done: true }],
  ["DELETE", "/tasks/t9", undefined],
  ["POST", "/tasks/t9/share", { teammate: "anna" }],
];

for (const [method, path, body] of UNKNOWN_TASK) {
  test(`${method} ${path} of an unknown task: 404`, async () => {
    const response = await call(method, path, body);

    assert.equal(response.status, 404);
    assert.equal(typeof response.body.error, "string");
  });
}

const BAD_BODIES: [string, string, string, unknown][] = [
  ["no title", "POST", "/tasks", {}],
  ["an empty title", "POST", "/tasks", { title: " " }],
  ["a title over 200", "POST", "/tasks", { title: "x".repeat(201) }],
  ["a title that is not text", "POST", "/tasks", { title: 5 }],
  ["a due date in another form", "POST", "/tasks", { title: "a", due: "1.11" }],
  [
    "a due date that does not exist",
    "PATCH",
    "/tasks/t1",
    { due: "2026-02-30" },
  ],
  ["done that is not a boolean", "PATCH", "/tasks/t1", { done: "yes" }],
  ["an unknown assignee", "POST", "/tasks", { title: "a", assignee: "zoe" }],
  ["an unknown teammate", "POST", "/tasks/t1/share", { teammate: "zoe" }],
  ["no teammate", "POST", "/tasks/t1/share", {}],
  ["an unknown field", "PATCH", "/tasks/t1", { priority: 1 }],
];

for (const [name, method, path, body] of BAD_BODIES) {
  test(`refuses ${name}: 400`, async () => {
    const response = await call(method, path, body);

    assert.equal(response.status, 400);
    assert.equal(typeof response.body.error, "string");
  });
}

test("refuses a body that is not an object: 400", async () => {
  const { status, body } = await call("POST", "/tasks", ["a"]);

  assert.equal(status, 400);
  assert.equal(body.error, "body is not an object");
});

test("refuses a body that is not JSON: 400", async () => {
  const response = await fetch(`${base}/tasks`, {
    method: "POST",
    body: "{",
  });

  assert.equal(response.status, 400);
});

test("a refused change changes nothing", async () => {
  await call("PATCH", "/tasks/t2", { title: "New title", done: "yes" });

  assert.equal(
    (await call("GET", "/tasks/t2")).body.title,
    "Review the design for the new homepage",
  );
});
