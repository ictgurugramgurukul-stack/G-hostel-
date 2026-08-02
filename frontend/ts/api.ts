import { API_BASE } from "./config.js";
import { getToken, clearToken } from "./session.js";

export class ApiError extends Error {}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; isForm?: boolean; auth?: boolean } = {}
): Promise<T> {
  const { method = "GET", body, isForm = false, auth = true } = options;
  const headers: Record<string, string> = {};
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  let fetchBody: BodyInit | undefined;
  if (body !== undefined) {
    if (isForm) {
      fetchBody = body as FormData;
    } else {
      headers["Content-Type"] = "application/json";
      fetchBody = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: fetchBody });

  if (res.status === 401) {
    clearToken();
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

// ---------- Auth ----------
export const authApi = {
  staffSignin: (email: string, password: string) =>
    request<any>("/api/auth/signin", { method: "POST", body: { email, password }, auth: false }),
  studentSignin: (member_id: string, password: string) =>
    request<any>("/api/auth/student-signin", { method: "POST", body: { member_id, password }, auth: false }),
  me: () => request<any>("/api/auth/me"),
  signout: () => request<any>("/api/auth/signout", { method: "POST" }),
};

// ---------- Students ----------
export const studentsApi = {
  list: (q?: string) => request<any[]>(`/api/students${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  create: (data: Record<string, unknown>) => request<any>("/api/students", { method: "POST", body: data }),
  remove: (id: string) => request<any>(`/api/students/${id}`, { method: "DELETE" }),
  issueCertificate: (id: string, title: string, description?: string) =>
    request<any>(`/api/students/${id}/certificate`, { method: "POST", body: { title, description } }),
  import: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<any>("/api/students/import", { method: "POST", body: fd, isForm: true });
  },
};

// ---------- Activities ----------
export const activitiesApi = {
  list: (activeOnly = false) => request<any[]>(`/api/activities${activeOnly ? "?active_only=true" : ""}`),
  create: (data: { name: string; description?: string; points: number }) =>
    request<any>("/api/activities", { method: "POST", body: data }),
  update: (id: string, data: { name: string; description?: string; points: number }) =>
    request<any>(`/api/activities/${id}`, { method: "PUT", body: data }),
  toggle: (id: string) => request<any>(`/api/activities/${id}/toggle`, { method: "PATCH" }),
};

// ---------- Points ----------
export const pointsApi = {
  search: (q: string) => request<any[]>(`/api/points/search?q=${encodeURIComponent(q)}`),
  rank: (studentId: string) => request<{ rank: number }>(`/api/points/rank/${studentId}`),
  top: (limit = 5) => request<any[]>(`/api/points/top?limit=${limit}`),
  statsToday: () => request<any>("/api/points/stats/today"),
  award: (data: { student_id: string; activity_id?: string | null; points: number; remarks?: string }) =>
    request<any>("/api/points/award", { method: "POST", body: data }),
};

// ---------- Room Inspections ----------
export const inspectionsApi = {
  today: (date?: string) => request<any>(`/api/inspections/today${date ? `?date=${encodeURIComponent(date)}` : ""}`),
  submit: (data: {
    student_id: string;
    date?: string;
    bed_arrangement: boolean;
    cupboard: boolean;
    cleanliness: boolean;
    blanket_folded: boolean;
    remarks?: string;
  }) => request<any>("/api/inspections", { method: "POST", body: data }),
  history: (params: { start_date?: string; end_date?: string; room?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.start_date) q.set("start_date", params.start_date);
    if (params.end_date) q.set("end_date", params.end_date);
    if (params.room) q.set("room", params.room);
    if (params.limit) q.set("limit", String(params.limit));
    return request<any>(`/api/inspections/history?${q.toString()}`);
  },
  exportUrl: (params: { start_date?: string; end_date?: string; room?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.start_date) q.set("start_date", params.start_date);
    if (params.end_date) q.set("end_date", params.end_date);
    if (params.room) q.set("room", params.room);
    return `${API_BASE}/api/inspections/export?${q.toString()}`;
  },
};

// ---------- Leaderboard ----------
export const leaderboardApi = {
  get: (params: { period?: string; house?: string; klass?: string; top_n?: number }) => {
    const q = new URLSearchParams();
    if (params.period) q.set("period", params.period);
    if (params.house) q.set("house", params.house);
    if (params.klass) q.set("klass", params.klass);
    if (params.top_n) q.set("top_n", String(params.top_n));
    return request<any>(`/api/leaderboard?${q.toString()}`);
  },
};

// ---------- Dashboard (student) ----------
export const dashboardApi = {
  student: () => request<any>("/api/dashboard/student"),
};

// ---------- Admin ----------
export const adminApi = {
  stats: () => request<any>("/api/admin/stats"),
};

// ---------- Analytics ----------
export const analyticsApi = {
  get: () => request<any>("/api/analytics"),
};
