import { icon } from "../icons.js";
import { activitiesApi, pointsApi, inspectionsApi } from "../api.js";
import { currentTier, badgeMedal } from "../badges.js";
import { avatarUrl, debounce, escapeHtml } from "../dom.js";
import { toast } from "../toast.js";
let activities = [];
let selectedActivityId = "";
let selectedStudent = null;
let selectedRank = null;
let points = 10;
let activeTab = "points";
let inspectionRows = [];
let inspectionDate = todayStr();
function todayStr() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}
function activityLabel(id) {
    const a = activities.find((x) => x.id === id);
    return a ? `${a.name} (${a.points >= 0 ? "+" : ""}${a.points})` : "";
}
// Matches by activity name (substring) or, if the query looks like a
// number (e.g. "-3" or "5"), by exact points value - so searching "-3"
// surfaces every activity worth -3 points.
function activityMatchesQuery(a, rawQuery) {
    const query = rawQuery.trim().toLowerCase();
    if (!query)
        return true;
    if (a.name.toLowerCase().includes(query))
        return true;
    if (/^[-+]?\d+$/.test(query)) {
        return a.points === Number(query);
    }
    return false;
}
export async function renderTeacherPage(container, me) {
    container.innerHTML = `<div class="loading-page">Loading...</div>`;
    container.innerHTML = `
    <h1 class="font-display text-lg font-bold" style="font-size:1.5rem">Teacher Dashboard</h1>
    <div class="tabs-list mt-4" id="teacher-tabs">
      <button class="tab-trigger ${activeTab === "points" ? "active" : ""}" data-tab="points">${icon("award")} Give Points</button>
      <button class="tab-trigger ${activeTab === "inspection" ? "active" : ""}" data-tab="inspection">${icon("clipboard-check")} Room Inspection</button>
    </div>
    <div class="mt-4" id="teacher-tab-content"></div>
  `;
    container.querySelectorAll("#teacher-tabs [data-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
            activeTab = btn.dataset.tab;
            container.querySelectorAll("#teacher-tabs [data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === activeTab));
            renderActiveTab(container);
        });
    });
    await renderActiveTab(container);
}
async function renderActiveTab(container) {
    const box = document.getElementById("teacher-tab-content");
    box.innerHTML = `<div class="loading-page">Loading...</div>`;
    if (activeTab === "points")
        return renderPointsTab(box);
    return renderInspectionTab(box);
}
// ==================== Give Points tab ====================
async function renderPointsTab(box) {
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
    box.innerHTML = `
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div class="input-icon-wrap">
          <span class="icon">${icon("search")}</span>
          <input class="input" id="activity-search-input" placeholder="Search activity, e.g. 'Eating in study hours' or '-3'" value="${escapeHtml(activityLabel(selectedActivityId))}" autocomplete="off" />
        </div>
        <div id="activity-search-results"></div>
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
    const activitySearchInput = document.getElementById("activity-search-input");
    const activityResultsBox = document.getElementById("activity-search-results");
    const pointsInput = document.getElementById("points-input");
    const awardBtn = document.getElementById("award-btn");
    const pickActivity = (a) => {
        selectedActivityId = a.id;
        points = a.points;
        activitySearchInput.value = activityLabel(a.id);
        pointsInput.value = String(points);
        awardBtn.innerHTML = `${icon("award")} ${points >= 0 ? "Award Points" : "Deduct Points"}`;
        activityResultsBox.innerHTML = "";
    };
    const renderActivityMatches = () => {
        const query = activitySearchInput.value.trim();
        const matches = activities.filter((a) => activityMatchesQuery(a, query));
        activityResultsBox.innerHTML =
            matches.length === 0
                ? `<div class="search-results"><p class="text-xs muted" style="padding:.5rem .75rem;margin:0">No matching activities.</p></div>`
                : `<div class="search-results">${matches
                    .map((a) => `
        <button type="button" class="search-result-item" data-id="${a.id}">
          <div class="flex-1">
            <p class="text-sm font-medium" style="margin:0">${escapeHtml(a.name)}</p>
          </div>
          <span class="pill ${a.points >= 0 ? "pill-primary" : "pill-destructive"}">${a.points >= 0 ? "+" : ""}${a.points}</span>
        </button>`)
                    .join("")}</div>`;
        activityResultsBox.querySelectorAll("[data-id]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const a = activities.find((x) => x.id === btn.dataset.id);
                if (a)
                    pickActivity(a);
            });
        });
    };
    activitySearchInput.addEventListener("focus", renderActivityMatches);
    activitySearchInput.addEventListener("input", debounce(renderActivityMatches, 150));
    activitySearchInput.addEventListener("blur", () => {
        // Let a click on a result register before the list disappears.
        setTimeout(() => {
            activityResultsBox.innerHTML = "";
        }, 150);
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
            await pointsApi.award({
                student_id: selectedStudent.id,
                activity_id: selectedActivityId || null,
                points,
                remarks,
            });
            toast.success(`${points >= 0 ? "Awarded" : "Deducted"} ${Math.abs(points)} points to ${selectedStudent.name}`);
            setTimeout(() => window.location.reload(), 500);
            return;
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
// ==================== Room Inspection tab ====================
const CHECK_COLUMNS = [
    { key: "bed_arrangement", label: "Bed Arrangement" },
    { key: "cupboard", label: "Cupboard" },
    { key: "cleanliness", label: "Cleanliness" },
    { key: "blanket_folded", label: "Blanket Folded" },
];
async function renderInspectionTab(box) {
    const res = await inspectionsApi.today(inspectionDate);
    inspectionDate = res.date;
    inspectionRows = res.students;
    box.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Daily Room Inspection</h3>
        <div class="flex items-center gap-2">
          <input class="input" type="date" id="inspection-date" value="${inspectionDate}" style="width:auto" />
        </div>
      </div>
      <div class="card-content">
        <div class="input-icon-wrap mb-3">
          <span class="icon">${icon("search")}</span>
          <input class="input" id="inspection-search" placeholder="Search by name, member ID or room..." />
        </div>
        <p class="text-xs muted" style="margin:0 0 .75rem">Tick each box as you inspect a room. Changes save automatically. Any item left unticked (e.g. blanket not folded, cleanliness not done) automatically deducts 3 points per item - re-ticking it later refunds those points. An admin can download the full history as an Excel file.</p>
        <div class="table-wrap"><table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Room</th>
              ${CHECK_COLUMNS.map((c) => `<th class="text-center">${c.label}</th>`).join("")}
              <th>Remarks</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="inspection-tbody"></tbody>
        </table></div>
      </div>
    </div>
  `;
    renderInspectionRows(inspectionRows);
    const dateInput = document.getElementById("inspection-date");
    dateInput.addEventListener("change", async () => {
        if (!dateInput.value)
            return;
        inspectionDate = dateInput.value;
        await renderInspectionTab(box);
    });
    const search = document.getElementById("inspection-search");
    search.addEventListener("input", debounce(() => {
        const q = search.value.trim().toLowerCase();
        const filtered = !q
            ? inspectionRows
            : inspectionRows.filter((r) => r.name.toLowerCase().includes(q) ||
                (r.member_id || "").toLowerCase().includes(q) ||
                (r.room_number || "").toLowerCase().includes(q));
        renderInspectionRows(filtered);
    }, 200));
}
function renderInspectionRows(rows) {
    const tbody = document.getElementById("inspection-tbody");
    if (!tbody)
        return;
    tbody.innerHTML =
        rows.length === 0
            ? `<tr><td colspan="7" class="text-center muted">No students found.</td></tr>`
            : rows
                .map((r) => `
    <tr data-row="${r.student_id}">
      <td>
        <p class="text-sm font-medium" style="margin:0">${escapeHtml(r.name)}</p>
        <p class="text-xs muted" style="margin:0">${escapeHtml(r.member_id)}</p>
      </td>
      <td>${escapeHtml(r.room_number || "\u2014")}</td>
      ${CHECK_COLUMNS.map((c) => `<td class="text-center"><input type="checkbox" class="insp-check" data-key="${c.key}" ${r[c.key] ? "checked" : ""} /></td>`).join("")}
      <td><input class="input insp-remarks" data-key="remarks" value="${escapeHtml(r.remarks || "")}" placeholder="Optional" style="min-width:10rem" /></td>
      <td><span class="text-xs muted insp-status">${r.recorded ? "Saved" : ""}</span></td>
    </tr>`)
                .join("");
    tbody.querySelectorAll("tr[data-row]").forEach((tr) => {
        const studentId = tr.dataset.row;
        const save = debounce(() => saveInspectionRow(tr, studentId), 350);
        tr.querySelectorAll(".insp-check").forEach((cb) => {
            cb.addEventListener("change", () => saveInspectionRow(tr, studentId));
        });
        tr.querySelector(".insp-remarks")?.addEventListener("input", save);
    });
}
async function saveInspectionRow(tr, studentId) {
    const statusEl = tr.querySelector(".insp-status");
    const data = { student_id: studentId, date: inspectionDate };
    tr.querySelectorAll(".insp-check").forEach((cb) => {
        data[cb.dataset.key] = cb.checked;
    });
    data.remarks = tr.querySelector(".insp-remarks")?.value || "";
    if (statusEl)
        statusEl.textContent = "Saving...";
    try {
        const res = await inspectionsApi.submit(data);
        if (statusEl) {
            statusEl.textContent = res.auto_deducted_points > 0 ? `Saved (-${res.auto_deducted_points} pts)` : "Saved";
        }
        const row = inspectionRows.find((r) => r.student_id === studentId);
        if (row)
            Object.assign(row, data, { recorded: true });
    }
    catch (err) {
        if (statusEl)
            statusEl.textContent = "Failed";
        toast.error(err.message || "Could not save inspection");
    }
}
