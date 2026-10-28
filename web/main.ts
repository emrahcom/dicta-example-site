// The Teamboard frontend: renders the page that fits the path.

import { renderListPage } from "./list-page.ts";
import { renderTaskPage } from "./task-page.ts";

const root = document.createElement("main");
document.body.append(root);

const match = /^\/tasks\/([^/]+)$/.exec(location.pathname);
if (match?.[1]) {
  await renderTaskPage(root, decodeURIComponent(match[1]));
} else {
  await renderListPage(root);
}
