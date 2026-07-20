import { icon } from "../icons.js";
import { dashboardApi } from "../api.js";
import { BADGE_TIERS, currentTier, nextTier, tierProgress, badgeMedal } from "../badges.js";
import { avatarUrl, fmtDateTime, escapeHtml } from "../dom.js";
export async function renderStudentPage(container, me) {
    container.innerHTML = `<div class="loading-page">Loading your dashboard...</div>`;
    let data;
    try {
        data = await dashboardApi.student();
    }
    catch (err) {
        container.innerHTML = `<div class="card"><div class="card-content text-center muted">${escapeHtml(err.message)}</div></div>`;
        return;
    }
    const student = data.student;
    const txns = data.transactions || [];
    const badges = data.badges || [];
    const certs = data.certificates || [];
    const notifs = data.notifications || [];
    const rank = data.rank;
    const qr = data.qr_code;
    const tier = currentTier(student.total_points);
    const next = nextTier(student.total_points);
    // monthly running total, oldest first
    const monthlyMap = new Map();
    [...txns].reverse().forEach((tx) => {
        const d = new Date(tx.created_at);
        const key = d.toLocaleString("en", { month: "short", year: "2-digit" });
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + tx.points);
    });
    let running = 0;
    const monthly = Array.from(monthlyMap.entries()).map(([month, pts]) => {
        running += pts;
        return { month, points: running };
    });
    container.innerHTML = `
    <div class="hero-panel flex" style="flex-wrap:wrap;gap:1.5rem;align-items:center;">
      <img class="avatar-xl" src="${avatarUrl(student.photo_url, student.name)}" alt="${escapeHtml(student.name)}" />
      <div class="flex-1">
        <p style="opacity:.8;margin:0;font-size:.875rem;">Welcome back,</p>
        <h1 class="font-display" style="font-size:1.9rem;font-weight:800;margin:.1rem 0;">${escapeHtml(student.name)}</h1>
        <div class="flex flex-wrap gap-2 mt-2">
          <span class="pill-white">ID: ${escapeHtml(student.member_id)}</span>
          ${student.class ? `<span class="pill-white">Class ${escapeHtml(student.class)}${escapeHtml(student.section || "")}</span>` : ""}
          ${student.room_number ? `<span class="pill-white">Room ${escapeHtml(student.room_number)}</span>` : ""}
          ${student.house ? `<span class="pill-white">${escapeHtml(student.house)} House</span>` : ""}
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div class="text-center">
          <p style="font-size:2.25rem;font-weight:800;margin:0;">${student.total_points}</p>
          <p style="opacity:.8;font-size:.75rem;margin:0;">Total Points</p>
        </div>
        ${badgeMedal(student.total_points, "lg")}
      </div>
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
      ${statCard("trophy", "Rank", rank ? `#${rank}` : "\u2014")}
      ${statCard("star", "Current Badge", tier?.name ?? "None yet")}
      ${statCard("award", "Badges Earned", badges.length)}
      ${statCard("scroll-text", "Certificates", certs.length)}
    </div>

    <div class="card mt-4">
      <div class="card-header"><h3 class="card-title">Progress to ${next ? escapeHtml(next.name) : "max tier"}</h3></div>
      <div class="card-content">
        <div class="progress progress-lg"><div style="width:${tierProgress(student.total_points)}%"></div></div>
        <p class="text-sm muted mt-2">
          ${next ? `${next.threshold - student.total_points} points to reach ${next.name} (${next.threshold} pts)` : "You've reached the highest tier \u2014 Legend!"}
        </p>
      </div>
    </div>

    <div class="grid lg:grid-cols-3 gap-4 mt-4">
      <div class="card lg:col-span-2 chart-card">
        <div class="card-header"><h3 class="card-title">Monthly Progress</h3></div>
        <div class="card-content">
          ${monthly.length === 0 ? `<div class="flex items-center justify-center muted text-sm" style="height:100%">No activity yet</div>` : `<canvas id="monthly-chart"></canvas>`}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3 class="card-title flex items-center gap-2">${icon("qr-code")} Student ID</h3></div>
        <div class="card-content flex flex-col items-center gap-3">
          ${qr ? `<img src="${qr}" alt="QR code" style="border-radius:.5rem;border:1px solid var(--border);" />` : ""}
          <div class="w-full text-sm muted">
            <p class="flex items-center gap-2">${icon("home")} ${escapeHtml(student.hostel || "\u2014")}</p>
            <p class="flex items-center gap-2">${icon("graduation-cap")} ${escapeHtml(student.house || "\u2014")} House</p>
          </div>
        </div>
      </div>
    </div>

    <div class="grid lg:grid-cols-2 gap-4 mt-4">
      <div class="card">
        <div class="card-header"><h3 class="card-title">Recent Activities</h3></div>
        <div class="card-content">
          ${txns.length === 0
        ? `<p class="text-sm muted">No activities yet.</p>`
        : txns
            .slice(0, 8)
            .map((tx) => `
              <div class="flex items-center justify-between" style="border:1px solid var(--border);border-radius:.6rem;padding:.6rem;margin-bottom:.5rem;">
                <div>
                  <p class="font-medium" style="margin:0">${escapeHtml(tx.activity_name || "Activity")}</p>
                  <p class="text-xs muted" style="margin:0">${fmtDateTime(tx.created_at)} \u00b7 ${escapeHtml(tx.teacher_name || "Staff")}</p>
                  ${tx.remarks ? `<p class="text-xs muted" style="margin:0">"${escapeHtml(tx.remarks)}"</p>` : ""}
                </div>
                <span class="pill ${tx.points >= 0 ? "pill-primary" : "pill-destructive"}">${tx.points >= 0 ? "+" : ""}${tx.points}</span>
              </div>`)
            .join("")}
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Achievements</h3></div>
          <div class="card-content badge-grid">
            ${BADGE_TIERS.map((t) => {
        const earned = student.total_points >= t.threshold;
        return `
              <div class="badge-item ${earned ? "" : "locked"}">
                <div style="height:2.5rem;width:2.5rem;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;background:radial-gradient(circle at 30% 30%, ${t.glow}, ${t.color})">${icon("award")}</div>
                <span>${t.name}</span>
              </div>`;
    }).join("")}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3 class="card-title flex items-center gap-2">${icon("scroll-text")} Certificates</h3></div>
          <div class="card-content">
            ${certs.length === 0
        ? `<p class="text-sm muted">No certificates yet.</p>`
        : certs
            .map((c) => `
              <div style="border:1px solid var(--border);border-radius:.6rem;padding:.6rem;margin-bottom:.5rem;">
                <p class="font-medium" style="margin:0">${escapeHtml(c.title)}</p>
                ${c.description ? `<p class="text-xs muted" style="margin:0">${escapeHtml(c.description)}</p>` : ""}
              </div>`)
            .join("")}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3 class="card-title flex items-center gap-2">${icon("bell")} Notifications</h3></div>
          <div class="card-content">
            ${notifs.length === 0
        ? `<p class="text-sm muted">No notifications.</p>`
        : notifs
            .map((n) => `
              <div style="border:1px solid var(--border);border-radius:.6rem;padding:.6rem;margin-bottom:.5rem;">
                <p class="text-sm font-medium" style="margin:0">${escapeHtml(n.title)}</p>
                <p class="text-xs muted" style="margin:0">${escapeHtml(n.message || "")}</p>
              </div>`)
            .join("")}
          </div>
        </div>
      </div>
    </div>
  `;
    if (monthly.length > 0 && typeof Chart !== "undefined") {
        const ctx = document.getElementById("monthly-chart").getContext("2d");
        new Chart(ctx, {
            type: "line",
            data: {
                labels: monthly.map((m) => m.month),
                datasets: [
                    {
                        label: "Points",
                        data: monthly.map((m) => m.points),
                        borderColor: "#7c3aed",
                        backgroundColor: "rgba(124,58,237,.15)",
                        fill: true,
                        tension: 0.35,
                    },
                ],
            },
            options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
        });
    }
}
function statCard(iconName, label, value) {
    return `
    <div class="card">
      <div class="stat-card">
        <div class="stat-icon">${icon(iconName)}</div>
        <div>
          <p class="stat-label">${label}</p>
          <p class="stat-value">${value}</p>
        </div>
      </div>
    </div>
  `;
}
