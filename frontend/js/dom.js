export function qs(sel, root = document) {
    return root.querySelector(sel);
}
export function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
}
export function escapeHtml(value) {
    const s = value === null || value === undefined ? "" : String(value);
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
export function fmtDateTime(iso) {
    if (!iso)
        return "\u2014";
    return new Date(iso).toLocaleString();
}
export function initials(name) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("");
}
export function avatarUrl(photoUrl, name) {
    return photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
}
export function debounce(fn, wait = 250) {
    let handle;
    return ((...args) => {
        if (handle)
            window.clearTimeout(handle);
        handle = window.setTimeout(() => fn(...args), wait);
    });
}
