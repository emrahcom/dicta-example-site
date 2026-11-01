// The task list page, at /.

import * as actions from "./actions.ts";
import { listTasks, listTeammates, type Teammate } from "./api.ts";
import { el, errorLine, label, run, teammateOptions } from "./ui.ts";

export async function renderListPage(root: HTMLElement) {
  const teammates = await listTeammates();
  const list = el("ul", { className: "tasks" });

  async function refresh() {
    const tasks = await listTasks();
    list.replaceChildren(
      ...tasks.map((task) => {
        const done = el("input", {
          type: "checkbox",
          checked: task.done,
          title: "Done",
        });
        done.setAttribute("aria-label", `Done: ${task.title}`);
        done.addEventListener("change", () =>
          run(() => actions.setDone(task.id, done.checked).then(refresh)),
        );

        const remove = el("button", { type: "button", textContent: "Delete" });
        remove.setAttribute("aria-label", `Delete: ${task.title}`);
        remove.addEventListener("click", () => {
          if (confirm(`Delete "${task.title}"?`)) {
            run(() => actions.deleteTask(task.id).then(refresh));
          }
        });

        const link = el("a", {
          href: `/tasks/${encodeURIComponent(task.id)}`,
          textContent: task.title,
        });
        link.addEventListener("click", (event) => {
          event.preventDefault();
          actions.openTask(task.id);
        });

        return el(
          "li",
          {},
          done,
          " ",
          link,
          " ",
          details(task.due, task.assignee, teammates),
          " ",
          remove,
        );
      }),
    );
  }

  const title = el("input", { name: "title" });
  const due = el("input", { name: "due", type: "date" });
  const assignee = el(
    "select",
    { name: "assignee" },
    ...teammateOptions(teammates, null, "Nobody"),
  );
  const form = el(
    "form",
    { className: "add" },
    label("Title", title),
    title,
    label("Due date", due),
    due,
    label("Assignee", assignee),
    assignee,
    el("button", { type: "submit", textContent: "Add task" }),
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    run(async () => {
      await actions.addTask(
        title.value,
        due.value || null,
        assignee.value || null,
      );
      form.reset();
      await refresh();
    });
  });

  document.title = "Teamboard";
  root.replaceChildren(
    el("h1", { textContent: "Teamboard" }),
    form,
    errorLine,
    list,
  );
  await refresh();
}

function details(
  due: string | null,
  assignee: string | null,
  teammates: Teammate[],
) {
  const parts = [];
  if (due) {
    parts.push(`due ${due}`);
  }
  const person = teammates.find((t) => t.id === assignee);
  if (person) {
    parts.push(person.name);
  }
  return el("small", { textContent: parts.join(", ") });
}
