// The page of one task, at /tasks/<id>.

import * as actions from "./actions.ts";
import { getTask, listTeammates } from "./api.ts";
import {
  el,
  errorLine,
  label,
  run,
  statusLine,
  teammateOptions,
} from "./ui.ts";

export async function renderTaskPage(root: HTMLElement, id: string) {
  const back = el("a", { href: "/", textContent: "All tasks" });
  let task;
  try {
    task = await getTask(id);
  } catch {
    document.title = "No such task - Teamboard";
    root.replaceChildren(back, el("h1", { textContent: "No such task" }));
    return;
  }
  const teammates = await listTeammates();

  const title = el("input", { name: "title", value: task.title });
  const due = el("input", { name: "due", type: "date", value: task.due ?? "" });
  const assignee = el(
    "select",
    { name: "assignee" },
    ...teammateOptions(teammates, task.assignee, "Nobody"),
  );
  const saved = statusLine("saved");
  const edit = el(
    "form",
    { className: "edit" },
    label("Title", title),
    title,
    label("Due date", due),
    due,
    label("Assignee", assignee),
    assignee,
    el("button", { type: "submit", textContent: "Save" }),
  );
  edit.addEventListener("submit", (event) => {
    event.preventDefault();
    saved.textContent = "";
    run(async () => {
      await actions.updateTask(id, {
        title: title.value,
        due: due.value || null,
        assignee: assignee.value || null,
      });
      saved.textContent = "Saved";
    });
  });

  const teammate = el(
    "select",
    { name: "teammate" },
    ...teammateOptions(teammates, null, "Choose a teammate"),
  );
  const shared = statusLine("shared");
  const share = el(
    "form",
    { className: "share" },
    label("Teammate", teammate),
    teammate,
    el("button", { type: "submit", textContent: "Share" }),
  );
  share.addEventListener("submit", (event) => {
    event.preventDefault();
    shared.textContent = "";
    run(async () => {
      await actions.shareTask(id, teammate.value);
      shared.textContent = "Shared";
    });
  });

  document.title = `${task.title} - Teamboard`;
  root.replaceChildren(
    back,
    el("h1", { textContent: task.title }),
    edit,
    saved,
    el("h2", { textContent: "Share" }),
    share,
    shared,
    errorLine,
  );
}
