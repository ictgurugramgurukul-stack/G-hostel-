export function qs<T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T | null {
  return root.querySelector(sel) as T | null;
}

export function qsa<T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll(sel)) as T[];
}

export function escapeHtml(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleString();
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function avatarUrl(photoUrl: string | null | undefined, name: string): string {
  return photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
}

export function debounce<F extends (...args: any[]) => void>(fn: F, wait = 250): F {
  let handle: number | undefined;
  return ((...args: any[]) => {
    if (handle) window.clearTimeout(handle);
    handle = window.setTimeout(() => fn(...args), wait);
  }) as F;
}
