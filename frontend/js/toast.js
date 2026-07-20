// Minimal toast system, replacing the "sonner" library used in the original app.
function ensureRoot() {
    let root = document.getElementById("toast-root");
    if (!root) {
        root = document.createElement("div");
        root.id = "toast-root";
        document.body.appendChild(root);
    }
    return root;
}
function show(message, kind) {
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
    success: (msg) => show(msg, "success"),
    error: (msg) => show(msg, "error"),
    info: (msg) => show(msg, "default"),
};
