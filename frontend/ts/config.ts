// Point this at wherever the FastAPI backend is running.
// When the backend serves the frontend itself (the default: `python3 run.py`
// mounts frontend/ alongside the API on one port), same-origin is always
// correct - no matter whether you open it as localhost, 127.0.0.1, or a LAN
// IP, so we default to the page's own origin. Only set window.GURUKUL_API_BASE
// (e.g. in index.html before this script loads) if you're serving the
// frontend separately from the backend (e.g. a dev server on a different port).
export const API_BASE: string = (window as any).GURUKUL_API_BASE || window.location.origin;
