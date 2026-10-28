// The API client: one function for each call of the Teamboard API.

export type Task = {
  id: string;
  title: string;
  due: string | null;
  done: boolean;
  assignee: string | null;
};

export type Teammate = { id: string; name: string; email: string };

export type TaskChanges = Partial<Omit<Task, "id">>;

async function call<T>(method: string, path: string, body?: unknown) {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    let message = `request failed (${response.status})`;
    try {
      message = ((await response.json()) as { error: string }).error;
    } catch {
      // Keep the generic message.
    }
    throw new Error(message);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export function listTasks(q = "") {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return call<Task[]>("GET", `/tasks${query}`);
}

export function getTask(id: string) {
  return call<Task>("GET", `/tasks/${encodeURIComponent(id)}`);
}

export function createTask(fields: {
  title: string;
  due?: string | null;
  assignee?: string | null;
}) {
  return call<Task>("POST", "/tasks", fields);
}

export function patchTask(id: string, changes: TaskChanges) {
  return call<Task>("PATCH", `/tasks/${encodeURIComponent(id)}`, changes);
}

export function removeTask(id: string) {
  return call<void>("DELETE", `/tasks/${encodeURIComponent(id)}`);
}

export function postShare(id: string, teammate: string) {
  return call<void>("POST", `/tasks/${encodeURIComponent(id)}/share`, {
    teammate,
  });
}

export function listTeammates() {
  return call<Teammate[]>("GET", "/teammates");
}
