// The JSON API under /api/. It checks its input, as a real backend would.

import type { IncomingMessage, ServerResponse } from "node:http";
import { nextId, reset, type Task, tasks, teammates } from "./store.ts";

// Bodies are small task fields; anything larger is refused.
const MAX_BODY_BYTES = 10_000;

class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function send(response: ServerResponse, status: number, body?: unknown) {
  if (body === undefined) {
    response.writeHead(status).end();
    return;
  }
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage) {
  let text = "";
  for await (const chunk of request) {
    text += String(chunk);
    if (text.length > MAX_BODY_BYTES) {
      throw new ApiError(400, "body is too large");
    }
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiError(400, "body is not JSON");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ApiError(400, "body is not an object");
  }
  return body as Record<string, unknown>;
}

function onlyFields(body: Record<string, unknown>, allowed: string[]) {
  for (const name of Object.keys(body)) {
    if (!allowed.includes(name)) {
      throw new ApiError(400, `unknown field: ${name}`);
    }
  }
}

function checkTitle(value: unknown) {
  if (typeof value !== "string" || value.trim() === "" || value.length > 200) {
    throw new ApiError(400, "title must be 1 to 200 characters");
  }
  return value;
}

function checkDue(value: unknown) {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)) {
      return value;
    }
  }
  throw new ApiError(400, "due must be a date as YYYY-MM-DD, or null");
}

function checkTeammate(value: unknown, name: string) {
  if (typeof value !== "string" || !teammates.some((t) => t.id === value)) {
    throw new ApiError(400, `${name} must be a teammate id`);
  }
  return value;
}

function findTask(id: string) {
  const task = tasks.get(id);
  if (!task) {
    throw new ApiError(404, "no such task");
  }
  return task;
}

async function createTask(request: IncomingMessage): Promise<Task> {
  const body = await readBody(request);
  onlyFields(body, ["title", "due", "assignee"]);
  const task: Task = {
    id: nextId(),
    title: checkTitle(body.title),
    due: body.due === undefined ? null : checkDue(body.due),
    done: false,
    assignee:
      body.assignee === undefined || body.assignee === null
        ? null
        : checkTeammate(body.assignee, "assignee"),
  };
  tasks.set(task.id, task);
  return task;
}

async function updateTask(request: IncomingMessage, task: Task) {
  const body = await readBody(request);
  onlyFields(body, ["title", "due", "done", "assignee"]);
  // Check every field before changing any.
  const changes: Partial<Task> = {};
  if (body.title !== undefined) {
    changes.title = checkTitle(body.title);
  }
  if (body.due !== undefined) {
    changes.due = checkDue(body.due);
  }
  if (body.done !== undefined) {
    if (typeof body.done !== "boolean") {
      throw new ApiError(400, "done must be true or false");
    }
    changes.done = body.done;
  }
  if (body.assignee !== undefined) {
    changes.assignee =
      body.assignee === null ? null : checkTeammate(body.assignee, "assignee");
  }
  Object.assign(task, changes);
  return task;
}

async function shareTask(request: IncomingMessage, task: Task) {
  const body = await readBody(request);
  onlyFields(body, ["teammate"]);
  const id = checkTeammate(body.teammate, "teammate");
  const teammate = teammates.find((t) => t.id === id);
  // Stands in for sending an email.
  console.log(`email to ${teammate?.email}: task "${task.title}"`);
}

async function route(
  request: IncomingMessage,
  response: ServerResponse,
  path: string,
  query: URLSearchParams,
) {
  const method = request.method ?? "GET";
  const parts = path.split("/").filter(Boolean);

  if (parts[0] === "tasks" && parts.length === 1) {
    if (method === "GET") {
      const q = query.get("q")?.toLowerCase() ?? "";
      const list = [...tasks.values()].filter((t) =>
        t.title.toLowerCase().includes(q),
      );
      return send(response, 200, list);
    }
    if (method === "POST") {
      return send(response, 201, await createTask(request));
    }
  }
  if (parts[0] === "tasks" && parts.length === 2) {
    const task = findTask(parts[1] ?? "");
    if (method === "GET") {
      return send(response, 200, task);
    }
    if (method === "PATCH") {
      return send(response, 200, await updateTask(request, task));
    }
    if (method === "DELETE") {
      tasks.delete(task.id);
      return send(response, 204);
    }
  }
  if (parts[0] === "tasks" && parts.length === 3 && parts[2] === "share") {
    const task = findTask(parts[1] ?? "");
    if (method === "POST") {
      await shareTask(request, task);
      return send(response, 204);
    }
  }
  if (path === "/teammates" && method === "GET") {
    return send(response, 200, teammates);
  }
  if (path === "/reset" && method === "POST") {
    reset();
    return send(response, 204);
  }
  throw new ApiError(404, "no such endpoint");
}

// Handles a request whose path starts with /api/.
export async function handleApi(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
) {
  try {
    await route(request, response, url.pathname.slice(4), url.searchParams);
  } catch (err) {
    if (err instanceof ApiError) {
      send(response, err.status, { error: err.message });
    } else {
      throw err;
    }
  }
}
