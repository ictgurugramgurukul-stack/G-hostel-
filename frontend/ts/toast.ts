// Minimal toast system, replacing the "sonner" library used in the original app.

function ensureRoot(): HTMLElement {
  let root = document.getElementById("toast-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-root";
    document.body.appendChild(root);
  }
  return root;
}

function show(message: string, kind: "default" | "success" | "error"): void {
  const root = ensureRoot();
  const el = document.createElement("div");
  el.className = `toast ${kind === "default" ? "" : kind}`.trim();
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .2s ease";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 200);
  }, 3200);
}

export const toast = {
  success: (msg: string) => show(msg, "success"),
  error: (msg: string) => show(msg, "error"),
  info: (msg: string) => show(msg, "default"),
};
