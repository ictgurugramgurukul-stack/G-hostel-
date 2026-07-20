import { icon } from "../icons.js";
import { activitiesApi, pointsApi } from "../api.js";
import { currentTier, badgeMedal } from "../badges.js";
import { avatarUrl, debounce, escapeHtml } from "../dom.js";
import { toast } from "../toast.js";
let activities = [];
let selectedActivityId = "";
let selectedStudent = null;
let selectedRank = null;
let points = 10;
export async function renderTeacherPage(container, me) {
    container.innerHTML = `<div class="loading-page">Loading...</div>`;
    const [acts, statsRes, top] = await Promise.all([
        activitiesApi.list(true),
        pointsApi.statsToday(),
        pointsApi.top(5),
    ]);
    activities = acts;
    if (activities[0]) {
        selectedActivityId = activities[0].id;
        points = activities[0].points;
    }
    container.innerHTML = `
    <h1 class="font-display text-lg font-bold" style="font-size:1.5rem">Teacher Dashboard</h1>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      ${statCard("users", "Students Awarded Today", statsRes.awarded_today)}
      ${statCard("zap", "Points Given Today", statsRes.points_today)}
      ${statCard("trending-up", "Active Activities", activities.length)}
    </div>

    <div class="grid lg:grid-cols-3 gap-4 mt-4">
      <div class="card lg:col-span-2">
        <div class="card-header"><h3 class="card-title">Give Points</h3></div>
        <div class="card-content">
          <div class="input-icon-wrap">
            <span class="icon">${icon("search")}</span>
            <input class="input" id="search-input" placeholder="Search by Member ID, name, admission no, phone or room..." />
          </div>
          <div id="search-results"></div>
          <div id="award-panel" class="mt-4"></div>
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Top Students</h3></div>
          <div class="card-content">
            ${top
        .map((s, i) => `
              <div class="flex items-center gap-3" style="margin-bottom:.4rem;">
                <span class="rank-badge">${i + 1}</span>
                <span class="flex-1 truncate text-sm font-medium">${escapeHtml(s.name)}</span>
                <span class="text-sm font-semibold">${s.total_points}</span>
              </div>`)
        .join("")}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">Recent Activity</h3></div>
          <div class="card-content" id="recent-activity">
            ${renderRecent(statsRes.recent)}
          </div>
        </div>
      </div>
    </div>
  `;
    const searchInput = document.getElementById("search-input");
    const resultsBox = document.getElementById("search-results");
    const doSearch = debounce(async () => {
        const q = searchInput.value.trim();
        if (q.length < 1) {
            resultsBox.innerHTML = "";
            return;
        }
        const results = await pointsApi.search(q);
        resultsBox.innerHTML =
            results.length === 0
                ? ""
                : `<div class="search-results">${results
                    .map((s) => `
        <button class="search-result-item" data-id="${s.id}">
          <img class="avatar" src="${avatarUrl(s.photo_url, s.name)}" alt="" />
          <div class="flex-1">
            <p class="text-sm font-medium" style="margin:0">${escapeHtml(s.name)}</p>
            <p class="text-xs muted" style="margin:0">${escapeHtml(s.member_id)} \u00b7 Class ${escapeHtml(s.class || "")}${escapeHtml(s.section || "")} \u00b7 Room ${escapeHtml(s.room_number || "")}</p>
          </div>
          <span class="text-sm font-semibold">${s.total_points} pts</span>
        </button>`)
                    .join("")}</div>`;
        resultsBox.querySelectorAll("[data-id]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const s = results.find((r) => r.id === btn.dataset.id);
                await selectStudent(s);
                searchInput.value = "";
                resultsBox.innerHTML = "";
            });
        });
    }, 250);
    searchInput.addEventListener("input", doSearch);
}
function renderRecent(recent) {
    if (!recent || recent.length === 0)
        return `<p class="text-sm muted">Nothing today yet.</p>`;
    return recent
        .map((tx) => `
    <div class="flex items-center justify-between text-sm" style="margin-bottom:.35rem;">
      <span class="truncate">${escapeHtml(tx.activity_name || "")}</span>
      <span class="font-semibold" style="color:${tx.points >= 0 ? "var(--primary)" : "var(--destructive)"}">${tx.points >= 0 ? "+" : ""}${tx.points}</span>
    </div>`)
        .join("");
}
async function selectStudent(s) {
    selectedStudent = s;
    const rankRes = await pointsApi.rank(s.id);
    selectedRank = rankRes.rank;
    renderAwardPanel();
}
function renderAwardPanel() {
    const panel = document.getElementById("award-panel");
    if (!panel)
        return;
    if (!selectedStudent) {
        panel.innerHTML = "";
        return;
    }
    const s = selectedStudent;
    const tier = currentTier(s.total_points);
    panel.innerHTML = `
    <div class="selected-student-card">
      <img class="avatar-lg" src="${avatarUrl(s.photo_url, s.name)}" alt="" />
      <div class="flex-1">
        <p class="font-display font-bold" style="font-size:1.1rem;margin:0">${escapeHtml(s.name)}</p>
        <p class="text-sm muted" style="margin:0">${escapeHtml(s.member_id)} \u00b7 Class ${escapeHtml(s.class || "")}${escapeHtml(s.section || "")} \u00b7 Room ${escapeHtml(s.room_number || "")} \u00b7 ${escapeHtml(s.house || "")}</p>
        <p class="text-sm" style="margin:0"><span class="font-semibold">${s.total_points}</span> pts \u00b7 Rank #${selectedRank} \u00b7 ${tier?.name ?? "No badge"}</p>
      </div>
      ${badgeMedal(s.total_points, "md")}
    </div>

    <div class="grid sm:grid-cols-2 gap-4 mt-4">
      <div class="field">
        <label>Activity</label>
        <select class="input" id="activity-select">
          ${activities
        .map((a) => `<option value="${a.id}" ${a.id === selectedActivityId ? "selected" : ""}>${escapeHtml(a.name)} (${a.points >= 0 ? "+" : ""}${a.points})</option>`)
        .join("")}
        </select>
      </div>
      <div class="field">
        <label>Points</label>
        <input class="input" type="number" id="points-input" value="${points}" />
      </div>
    </div>
    <div class="field">
      <label>Remarks</label>
      <textarea class="input" id="remarks-input" maxlength="300" placeholder="Optional note..." rows="3"></textarea>
    </div>
    <div class="flex gap-2">
      <button class="btn btn-primary flex-1" id="award-btn">${icon("award")} ${points >= 0 ? "Award Points" : "Deduct Points"}</button>
      <button class="btn btn-outline" id="clear-btn">Clear</button>
    </div>
  `;
    const activitySelect = document.getElementById("activity-select");
    const pointsInput = document.getElementById("points-input");
    const awardBtn = document.getElementById("award-btn");
    activitySelect.addEventListener("change", () => {
        selectedActivityId = activitySelect.value;
        const a = activities.find((x) => x.id === selectedActivityId);
        if (a) {
            points = a.points;
            pointsInput.value = String(points);
            awardBtn.innerHTML = `${icon("award")} ${points >= 0 ? "Award Points" : "Deduct Points"}`;
        }
    });
    pointsInput.addEventListener("input", () => {
        points = Number(pointsInput.value);
        awardBtn.innerHTML = `${icon("award")} ${points >= 0 ? "Award Points" : "Deduct Points"}`;
    });
    document.getElementById("clear-btn")?.addEventListener("click", () => {
        selectedStudent = null;
        renderAwardPanel();
    });
    awardBtn.addEventListener("click", async () => {
        if (!selectedStudent)
            return;
        awardBtn.disabled = true;
        const remarks = document.getElementById("remarks-input").value;
        try {
            const res = await pointsApi.award({
                student_id: selectedStudent.id,
                activity_id: selectedActivityId || null,
                points,
                remarks,
            });
            toast.success(`${points >= 0 ? "Awarded" : "Deducted"} ${Math.abs(points)} points to ${selectedStudent.name}`);
            selectedStudent = res.student;
            const rankRes = await pointsApi.rank(selectedStudent.id);
            selectedRank = rankRes.rank;
            renderAwardPanel();
            const statsRes = await pointsApi.statsToday();
            const recentBox = document.getElementById("recent-activity");
            if (recentBox)
                recentBox.innerHTML = renderRecent(statsRes.recent);
        }
        catch (err) {
            toast.error(err.message || "Could not award points");
        }
        finally {
            awardBtn.disabled = false;
        }
    });
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
