// Small helpers for building the pages.

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  Object.assign(element, props);
  element.append(...children);
  return element;
}

// The line that shows API errors.
export const errorLine = el("p", { className: "error" });
errorLine.setAttribute("role", "alert");

export function showError(err: unknown) {
  errorLine.textContent = err instanceof Error ? err.message : String(err);
}

export function clearError() {
  errorLine.textContent = "";
}

// Runs an action from a button, and shows its error if it fails.
export function run(action: () => Promise<unknown>) {
  clearError();
  action().catch(showError);
}

export function teammateOptions(
  teammates: { id: string; name: string }[],
  selected: string | null,
  emptyLabel: string,
) {
  return [
    el("option", { value: "", textContent: emptyLabel }),
    ...teammates.map((t) =>
      el("option", {
        value: t.id,
        textContent: t.name,
        selected: t.id === selected,
      }),
    ),
  ];
}
