// The actions: what the buttons call. Pages wire their buttons to these.

import * as api from "./api.ts";
import type { Task, TaskChanges } from "./api.ts";

export function addTask(
  title: string,
  due: string | null = null,
  assignee: string | null = null,
): Promise<Task> {
  return api.createTask({ title, due, assignee });
}

export function updateTask(id: string, changes: TaskChanges): Promise<Task> {
  return api.patchTask(id, changes);
}

export function setDone(id: string, done: boolean): Promise<Task> {
  return api.patchTask(id, { done });
}

export function deleteTask(id: string): Promise<void> {
  return api.removeTask(id);
}

export function shareTask(id: string, teammate: string): Promise<void> {
  return api.postShare(id, teammate);
}

// Loads the task's page.
export function openTask(id: string) {
  location.assign(`/tasks/${encodeURIComponent(id)}`);
}
