// Small hand-rolled icon set (stroke-based, 24x24), replacing lucide-react.
// Usage: icon("trophy", "h-5 w-5")

const PATHS: Record<string, string> = {
  sparkles: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  trophy: '<path d="M8 4h8v4a4 4 0 0 1-8 0V4z"/><path d="M8 4H5a3 3 0 0 0 3 4"/><path d="M16 4h3a3 3 0 0 1-3 4"/><path d="M10 15h4v3h-4z"/><path d="M8 21h8"/>',
  award: '<circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 21l5-3 5 3-1.5-8.5"/>',
  medal: '<circle cx="12" cy="14" r="6"/><path d="M9 3l3 8 3-8"/>',
  upload: '<path d="M12 19V6"/><path d="M6 11l6-6 6 6"/><path d="M5 21h14"/>',
  "bar-chart": '<path d="M4 20V10"/><path d="M12 20V4"/><path d="M20 20v-7"/>',
  "shield-check": '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
  "shield-alert": '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  "trending-up": '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 6h6v6"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 20c.3-2 2-3.5 4.5-3.5"/>',
  "graduation-cap": '<path d="M2 9l10-5 10 5-10 5-10-5z"/><path d="M6 11.5V17c0 1.5 3 3 6 3s6-1.5 6-3v-5.5"/>',
  zap: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  "scroll-text": '<path d="M6 4h11a2 2 0 0 1 2 2v13a1 1 0 0 1-1.5.87L15 18H8a2 2 0 0 1-2-2V4z"/><path d="M6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2"/><path d="M9 9h6"/><path d="M9 13h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  "trash-2": '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  download: '<path d="M12 4v12"/><path d="M6 12l6 6 6-6"/><path d="M5 21h14"/>',
  pencil: '<path d="M3 21l4-1 11-11-3-3L4 17z"/><path d="M14 6l3 3"/>',
  loader: '<path d="M12 3v3"/><path d="M12 18v3"/><path d="M4.2 4.2l2.1 2.1"/><path d="M17.7 17.7l2.1 2.1"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M4.2 19.8l2.1-2.1"/><path d="M17.7 6.3l2.1-2.1"/>',
  bell: '<path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  "qr-code": '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/><path d="M20 17v4h-4"/>',
  crown: '<path d="M3 8l4 4 5-6 5 6 4-4v9H3z"/>',
  star: '<path d="M12 2l3 6.5 7 .8-5.2 4.8L18 21l-6-3.5L6 21l1.2-6.9L2 9.3l7-.8z"/>',
  "check-circle": '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/>',
  "x-circle": '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6"/><path d="M15 9l-6 6"/>',
  "file-spreadsheet": '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 13v6"/>',
  "log-out": '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
};

export function icon(name: string, cls = "icon"): string {
  const path = PATHS[name] || PATHS.star;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em">${path}</svg>`;
}
