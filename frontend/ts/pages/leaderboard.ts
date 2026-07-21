import { icon } from "../icons.js";
import { leaderboardApi } from "../api.js";
import { Me } from "../session.js";
import { badgeMedal } from "../badges.js";
import { avatarUrl, escapeHtml } from "../dom.js";

let period: "overall" | "monthly" | "weekly" = "overall";
let house = "all";
let klass = "all";

export async function renderLeaderboardPage(container: HTMLElement, me: Me): Promise<void> {
  container.innerHTML = `<div class="loading-page">Loading leaderboard...</div>`;
  await load(container);
}

async function load(container: HTMLElement): Promise<void> {
  const data = await leaderboardApi.get({ period, house, klass, top_n: 10 });
  const ranked: any[] = data.ranked || [];
  const standings: any[] = data.house_standings || [];
  const classes: string[] = data.classes || [];
  const houses: any[] = data.houses || [];

  container.innerHTML = `
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="font-display text-lg font-bold" style="font-size:1.5rem">Leaderboard</h1>
      <div class="tabs-list" id="period-tabs">
        ${["overall", "weekly", "monthly"].map((p) => `<button type="button" class="tab-trigger ${period === p ? "active" : ""}" data-period="${p}">${p[0].toUpperCase()}${p.slice(1)}</button>`).join("")}
      </div>
    </div>

    <div class="flex flex-wrap gap-2 mt-3">
      <select class="input" id="house-filter" style="width:auto">
        <option value="all" ${house === "all" ? "selected" : ""}>All Houses</option>
        ${houses.map((h: any) => `<option value="${escapeHtml(h.name)}" ${house === h.name ? "selected" : ""}>${escapeHtml(h.name)}</option>`).join("")}
      </select>
      <select class="input" id="class-filter" style="width:auto">
        <option value="all" ${klass === "all" ? "selected" : ""}>All Classes</option>
        ${classes.map((c) => `<option value="${escapeHtml(c)}" ${klass === c ? "selected" : ""}>Class ${escapeHtml(c)}</option>`).join("")}
      </select>
    </div>

    <div class="grid lg:grid-cols-3 gap-4 mt-4">
      <div class="card lg:col-span-2">
        <div class="card-header"><h3 class="card-title flex items-center gap-2">${icon("trophy")} Top Students</h3></div>
        <div class="card-content">
          ${
            ranked.length === 0
              ? `<p class="text-sm muted">No data for this filter yet.</p>`
              : ranked
                  .map(
                    (s, i) => `
            <div class="leader-row ${i < 3 ? "top3" : ""}" style="margin-bottom:.5rem;">
              <span class="rank-badge">${i < 3 ? icon("crown") : `#${i + 1}`}</span>
              <img class="avatar" src="${avatarUrl(s.photo_url, s.name)}" alt="" />
              <div class="flex-1 truncate">
                <p class="font-medium truncate" style="margin:0">${escapeHtml(s.name)}</p>
                <p class="text-xs muted truncate" style="margin:0">${escapeHtml(s.member_id)} \u00b7 Class ${escapeHtml(s.class || "")}${escapeHtml(s.section || "")} \u00b7 ${escapeHtml(s.house || "")}</p>
              </div>
              ${badgeMedal(s.total_points, "sm")}
              <span class="font-bold" style="min-width:3.5rem;text-align:right;">${s.score} pts</span>
            </div>`
                  )
                  .join("")
          }
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3 class="card-title flex items-center gap-2">${icon("shield-check")} House Standings</h3></div>
        <div class="card-content">
          ${
            standings.length === 0
              ? `<p class="text-sm muted">No house data yet.</p>`
              : standings
                  .map(
                    (h, i) => `
            <div class="flex items-center justify-between" style="margin-bottom:.5rem;">
              <span class="flex items-center gap-2 font-medium">${i === 0 ? icon("crown") : ""} ${escapeHtml(h.name)}</span>
              <span class="font-bold">${h.points} pts</span>
            </div>`
                  )
                  .join("")
          }
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll<HTMLButtonElement>("[data-period]").forEach((btn) => {
    btn.addEventListener("click", () => {
      period = btn.dataset.period as typeof period;
      load(container);
    });
  });
  (document.getElementById("house-filter") as HTMLSelectElement).addEventListener("change", (e) => {
    house = (e.target as HTMLSelectElement).value;
    load(container);
  });
  (document.getElementById("class-filter") as HTMLSelectElement).addEventListener("change", (e) => {
    klass = (e.target as HTMLSelectElement).value;
    load(container);
  });
}
