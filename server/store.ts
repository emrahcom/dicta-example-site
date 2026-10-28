// The in-memory data of Teamboard: tasks and teammates.

export type Task = {
  id: string;
  title: string;
  due: string | null;
  done: boolean;
  assignee: string | null;
};

export type Teammate = { id: string; name: string; email: string };

export const teammates: readonly Teammate[] = [
  { id: "anna", name: "Anna Weber", email: "anna@example.com" },
  { id: "ben", name: "Ben Okafor", email: "ben@example.com" },
  { id: "chen", name: "Chen Li", email: "chen@example.com" },
];

const SAMPLE_TASKS: readonly Task[] = [
  {
    id: "t1",
    title: "Send the invoice to Nordwind",
    due: "2026-11-02",
    done: true,
    assignee: "anna",
  },
  {
    id: "t2",
    title: "Review the design for the new homepage",
    due: "2026-11-05",
    done: false,
    assignee: "ben",
  },
  {
    id: "t3",
    title: "Book a room for the team lunch",
    due: null,
    done: false,
    assignee: null,
  },
];

export const tasks = new Map<string, Task>();
let lastId = 0;

export function reset() {
  tasks.clear();
  for (const task of SAMPLE_TASKS) {
    tasks.set(task.id, { ...task });
  }
  lastId = SAMPLE_TASKS.length;
}

export function nextId() {
  lastId++;
  return `t${lastId}`;
}

reset();
