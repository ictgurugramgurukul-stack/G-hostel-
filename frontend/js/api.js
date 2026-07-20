import { API_BASE } from "./config.js";
import { getToken, clearToken } from "./session.js";
export class ApiError extends Error {
}
async function request(path, options = {}) {
    const { method = "GET", body, isForm = false, auth = true } = options;
    const headers = {};
    if (auth) {
        const token = getToken();
        if (token)
            headers["Authorization"] = `Bearer ${token}`;
    }
    let fetchBody;
    if (body !== undefined) {
        if (isForm) {
            fetchBody = body;
        }
        else {
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
        }
        catch {
            /* ignore */
        }
        throw new ApiError(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    if (res.status === 204)
        return undefined;
    return (await res.json());
}
// ---------- Auth ----------
export const authApi = {
    staffSignin: (email, password) => request("/api/auth/signin", { method: "POST", body: { email, password }, auth: false }),
    studentSignin: (member_id, password) => request("/api/auth/student-signin", { method: "POST", body: { member_id, password }, auth: false }),
    me: () => request("/api/auth/me"),
    signout: () => request("/api/auth/signout", { method: "POST" }),
};
// ---------- Students ----------
export const studentsApi = {
    list: (q) => request(`/api/students${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    create: (data) => request("/api/students", { method: "POST", body: data }),
    remove: (id) => request(`/api/students/${id}`, { method: "DELETE" }),
    issueCertificate: (id, title, description) => request(`/api/students/${id}/certificate`, { method: "POST", body: { title, description } }),
    import: (file) => {
        const fd = new FormData();
        fd.append("file", file);
        return request("/api/students/import", { method: "POST", body: fd, isForm: true });
    },
};
// ---------- Activities ----------
export const activitiesApi = {
    list: (activeOnly = false) => request(`/api/activities${activeOnly ? "?active_only=true" : ""}`),
    create: (data) => request("/api/activities", { method: "POST", body: data }),
    update: (id, data) => request(`/api/activities/${id}`, { method: "PUT", body: data }),
    toggle: (id) => request(`/api/activities/${id}/toggle`, { method: "PATCH" }),
};
// ---------- Points ----------
export const pointsApi = {
    search: (q) => request(`/api/points/search?q=${encodeURIComponent(q)}`),
    rank: (studentId) => request(`/api/points/rank/${studentId}`),
    top: (limit = 5) => request(`/api/points/top?limit=${limit}`),
    statsToday: () => request("/api/points/stats/today"),
    award: (data) => request("/api/points/award", { method: "POST", body: data }),
};
// ---------- Leaderboard ----------
export const leaderboardApi = {
    get: (params) => {
        const q = new URLSearchParams();
        if (params.period)
            q.set("period", params.period);
        if (params.house)
            q.set("house", params.house);
        if (params.klass)
            q.set("klass", params.klass);
        if (params.top_n)
            q.set("top_n", String(params.top_n));
        return request(`/api/leaderboard?${q.toString()}`);
    },
};
// ---------- Dashboard (student) ----------
export const dashboardApi = {
    student: () => request("/api/dashboard/student"),
};
// ---------- Admin ----------
export const adminApi = {
    stats: () => request("/api/admin/stats"),
};
// ---------- Analytics ----------
export const analyticsApi = {
    get: () => request("/api/analytics"),
};
