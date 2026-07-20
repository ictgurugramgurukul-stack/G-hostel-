import { icon } from "../icons.js";
import { adminApi, studentsApi, activitiesApi, analyticsApi } from "../api.js";
import { avatarUrl, escapeHtml, fmtDateTime, debounce } from "../dom.js";
import { toast } from "../toast.js";
import { confirmDialog, openModal } from "../modal.js";
let activeTab = "students";
let studentsCache = [];
let activitiesCache = [];
export async function renderAdminPage(container, me) {
    container.innerHTML = `<div class="loading-page">Loading admin dashboard...</div>`;
    const stats = await adminApi.stats();
    container.innerHTML = `
    <h1 class="font-display text-lg font-bold" style="font-size:1.5rem">Admin Dashboard</h1>
    <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
      ${statCard("users", "Students", stats.students)}
      ${statCard("graduation-cap", "Teachers", stats.teachers)}
      ${statCard("zap", "Activities", stats.activities)}
      ${statCard("star", "Total Points", stats.points)}
      ${statCard("scroll-text", "Certificates", stats.certificates)}
    </div>

    <div class="tabs-list mt-6" id="admin-tabs">
      ${tabBtn("students", "Students")}
      ${tabBtn("activities", "Activities")}
      ${tabBtn("import", "Excel Import")}
      ${tabBtn("analytics", "Analytics")}
      ${tabBtn("audit", "Audit Log")}
    </div>
    <div class="mt-4" id="admin-tab-content"></div>
  `;
    container.querySelectorAll("#admin-tabs [data-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
            activeTab = btn.dataset.tab;
            renderTabs(container, stats);
        });
    });
    await renderTabs(container, stats);
}
function tabBtn(id, label) {
    return `<button class="tab-trigger ${activeTab === id ? "active" : ""}" data-tab="${id}">${label}</button>`;
}
async function renderTabs(container, stats) {
    container.querySelectorAll("#admin-tabs [data-tab]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tab === activeTab);
    });
    const box = document.getElementById("admin-tab-content");
    box.innerHTML = `<div class="loading-page">Loading...</div>`;
    if (activeTab === "students")
        return renderStudentsTab(box);
    if (activeTab === "activities")
        return renderActivitiesTab(box);
    if (activeTab === "import")
        return renderImportTab(box);
    if (activeTab === "analytics")
        return renderAnalyticsTab(box);
    if (activeTab === "audit")
        return renderAuditTab(box, stats);
}
// ---------------- Students tab ----------------
async function renderStudentsTab(box) {
    studentsCache = await studentsApi.list();
    box.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Manage Students</h3>
        <button class="btn btn-primary btn-sm" id="add-student-btn">${icon("plus")} Add Student</button>
      </div>
      <div class="card-content">
        <div class="input-icon-wrap mb-3">
          <span class="icon">${icon("search")}</span>
          <input class="input" id="student-search" placeholder="Search students..." />
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th></th><th>Name</th><th>Member ID</th><th>Class</th><th>Room</th><th>House</th><th>Points</th><th></th></tr></thead>
          <tbody id="students-tbody"></tbody>
        </table></div>
      </div>
    </div>
  `;
    renderStudentRows(studentsCache);
    const search = document.getElementById("student-search");
    search.addEventListener("input", debounce(async () => {
        const results = await studentsApi.list(search.value);
        renderStudentRows(results);
    }, 300));
    document.getElementById("add-student-btn")?.addEventListener("click", () => openStudentModal());
}
function renderStudentRows(students) {
    const tbody = document.getElementById("students-tbody");
    if (!tbody)
        return;
    tbody.innerHTML =
        students.length === 0
            ? `<tr><td colspan="8" class="text-center muted">No students found.</td></tr>`
            : students
                .map((s) => `
    <tr>
      <td><img class="avatar" src="${avatarUrl(s.photo_url, s.name)}" alt=""/></td>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.member_id)}</td>
      <td>${escapeHtml(s.class || "\u2014")}${escapeHtml(s.section || "")}</td>
      <td>${escapeHtml(s.room_number || "\u2014")}</td>
      <td>${escapeHtml(s.house || "\u2014")}</td>
      <td class="font-semibold">${s.total_points}</td>
      <td>
        <button class="btn btn-ghost btn-icon" data-cert="${s.id}" title="Issue certificate">${icon("scroll-text")}</button>
        <button class="btn btn-ghost btn-icon" data-del="${s.id}" title="Delete">${icon("trash-2")}</button>
      </td>
    </tr>`)
                .join("");
    tbody.querySelectorAll("[data-cert]").forEach((btn) => {
        btn.addEventListener("click", () => openCertificateModal(btn.dataset.cert, students));
    });
    tbody.querySelectorAll("[data-del]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const s = students.find((x) => x.id === btn.dataset.del);
            const ok = await confirmDialog({
                title: "Delete student?",
                description: `This will permanently remove ${s?.name || "this student"} and all their history.`,
                confirmLabel: "Delete",
            });
            if (!ok)
                return;
            try {
                await studentsApi.remove(btn.dataset.del);
                toast.success("Student deleted");
                studentsCache = await studentsApi.list();
                renderStudentRows(studentsCache);
            }
            catch (err) {
                toast.error(err.message || "Could not delete student");
            }
        });
    });
}
const HOUSE_OPTIONS = ["Atharvaveda", "Samveda", "Yajurveda", "Rugveda"];
function openStudentModal() {
    const { close } = openModal({
        title: "Add Student",
        bodyHtml: `
      <div class="field"><label>Member ID *</label><input class="input" id="f-member" required /></div>
      <div class="field"><label>Name *</label><input class="input" id="f-name" required /></div>
      <div class="grid sm:grid-cols-2 gap-2">
        <div class="field"><label>Admission No</label><input class="input" id="f-admission" /></div>
        <div class="field"><label>Class</label><input class="input" id="f-class" /></div>
        <div class="field"><label>Section</label><input class="input" id="f-section" /></div>
        <div class="field">
          <label>House</label>
          <select class="input" id="f-house">
            <option value="">\u2014 Select house \u2014</option>
            ${HOUSE_OPTIONS.map((h) => `<option value="${h}">${h}</option>`).join("")}
          </select>
        </div>
        <div class="field"><label>Room Number</label><input class="input" id="f-room" /></div>
        <div class="field"><label>Phone</label><input class="input" id="f-phone" /></div>
      </div>
      <div class="field">
        <label>Login Password</label>
        <input class="input" id="f-password" placeholder="Leave blank to auto-generate" />
        <p class="text-xs muted" style="margin:.25rem 0 0">This becomes the student's login (with their Member ID) for their dashboard. Leave blank to auto-generate one.</p>
      </div>
    `,
        footerHtml: `<button class="btn btn-outline" data-action="cancel">Cancel</button><button class="btn btn-primary" data-action="save">Save</button>`,
        onMount: (root) => {
            root.querySelector('[data-action="cancel"]')?.addEventListener("click", () => close());
            root.querySelector('[data-action="save"]')?.addEventListener("click", async () => {
                const val = (id) => root.querySelector(`#${id}`).value.trim();
                const payload = {
                    member_id: val("f-member"),
                    name: val("f-name"),
                    admission_no: val("f-admission") || undefined,
                    class: val("f-class") || undefined,
                    section: val("f-section") || undefined,
                    house: val("f-house") || undefined,
                    room_number: val("f-room") || undefined,
                    phone: val("f-phone") || undefined,
                    password: val("f-password") || undefined,
                };
                if (!payload.member_id || !payload.name) {
                    toast.error("Member ID and Name are required");
                    return;
                }
                try {
                    const created = await studentsApi.create(payload);
                    close();
                    studentsCache = await studentsApi.list();
                    renderStudentRows(studentsCache);
                    if (created?.generated_password) {
                        toast.success(`Student added \u2013 login: ${payload.member_id} / ${created.generated_password}`);
                    }
                    else {
                        toast.success("Student added");
                    }
                }
                catch (err) {
                    toast.error(err.message || "Could not add student");
                }
            });
        },
    });
}
function openCertificateModal(studentId, students) {
    const student = students.find((s) => s.id === studentId);
    const { close } = openModal({
        title: `Issue Certificate ${student ? `\u2013 ${escapeHtml(student.name)}` : ""}`,
        bodyHtml: `
      <div class="field"><label>Title *</label><input class="input" id="c-title" placeholder="e.g. Best Discipline Award" /></div>
      <div class="field"><label>Description</label><textarea class="input" id="c-desc" rows="3"></textarea></div>
    `,
        footerHtml: `<button class="btn btn-outline" data-action="cancel">Cancel</button><button class="btn btn-primary" data-action="issue">Issue</button>`,
        onMount: (root) => {
            root.querySelector('[data-action="cancel"]')?.addEventListener("click", () => close());
            root.querySelector('[data-action="issue"]')?.addEventListener("click", async () => {
                const title = root.querySelector("#c-title").value.trim();
                const desc = root.querySelector("#c-desc").value.trim();
                if (!title) {
                    toast.error("Title is required");
                    return;
                }
                try {
                    await studentsApi.issueCertificate(studentId, title, desc || undefined);
                    toast.success("Certificate issued");
                    close();
                }
                catch (err) {
                    toast.error(err.message || "Could not issue certificate");
                }
            });
        },
    });
}
// ---------------- Activities tab ----------------
async function renderActivitiesTab(box) {
    activitiesCache = await activitiesApi.list();
    box.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Activities</h3>
        <button class="btn btn-primary btn-sm" id="add-activity-btn">${icon("plus")} New Activity</button>
      </div>
      <div class="card-content" id="activities-list"></div>
    </div>
  `;
    renderActivityRows();
    document.getElementById("add-activity-btn")?.addEventListener("click", () => openActivityModal());
}
function renderActivityRows() {
    const box = document.getElementById("activities-list");
    if (!box)
        return;
    box.innerHTML =
        activitiesCache.length === 0
            ? `<p class="text-sm muted">No activities yet.</p>`
            : activitiesCache
                .map((a) => `
    <div class="flex items-center justify-between" style="border:1px solid var(--border);border-radius:.6rem;padding:.6rem;margin-bottom:.5rem;">
      <div class="flex-1">
        <p class="font-medium" style="margin:0">${escapeHtml(a.name)} <span class="pill ${a.points >= 0 ? "pill-primary" : "pill-destructive"}" style="margin-left:.4rem;">${a.points >= 0 ? "+" : ""}${a.points}</span></p>
        ${a.description ? `<p class="text-xs muted" style="margin:0">${escapeHtml(a.description)}</p>` : ""}
      </div>
      <div class="flex items-center gap-2">
        <label class="switch"><input type="checkbox" data-toggle="${a.id}" ${a.is_active ? "checked" : ""} /><span class="slider"></span></label>
        <button class="btn btn-ghost btn-icon" data-edit="${a.id}">${icon("pencil")}</button>
      </div>
    </div>`)
                .join("");
    box.querySelectorAll("[data-toggle]").forEach((el) => {
        el.addEventListener("change", async () => {
            await activitiesApi.toggle(el.dataset.toggle);
            activitiesCache = await activitiesApi.list();
            renderActivityRows();
        });
    });
    box.querySelectorAll("[data-edit]").forEach((el) => {
        el.addEventListener("click", () => openActivityModal(activitiesCache.find((a) => a.id === el.dataset.edit)));
    });
}
function openActivityModal(existing) {
    const { close } = openModal({
        title: existing ? "Edit Activity" : "New Activity",
        bodyHtml: `
      <div class="field"><label>Name *</label><input class="input" id="a-name" value="${existing ? escapeHtml(existing.name) : ""}" /></div>
      <div class="field"><label>Description</label><textarea class="input" id="a-desc" rows="2">${existing ? escapeHtml(existing.description || "") : ""}</textarea></div>
      <div class="field"><label>Points (negative to deduct)</label><input class="input" type="number" id="a-points" value="${existing ? existing.points : 10}" /></div>
    `,
        footerHtml: `<button class="btn btn-outline" data-action="cancel">Cancel</button><button class="btn btn-primary" data-action="save">Save</button>`,
        onMount: (root) => {
            root.querySelector('[data-action="cancel"]')?.addEventListener("click", () => close());
            root.querySelector('[data-action="save"]')?.addEventListener("click", async () => {
                const name = root.querySelector("#a-name").value.trim();
                const description = root.querySelector("#a-desc").value.trim();
                const points = Number(root.querySelector("#a-points").value);
                if (!name) {
                    toast.error("Name is required");
                    return;
                }
                try {
                    if (existing)
                        await activitiesApi.update(existing.id, { name, description, points });
                    else
                        await activitiesApi.create({ name, description, points });
                    toast.success("Activity saved");
                    close();
                    activitiesCache = await activitiesApi.list();
                    renderActivityRows();
                }
                catch (err) {
                    toast.error(err.message || "Could not save activity");
                }
            });
        },
    });
}
// ---------------- Import tab ----------------
function renderImportTab(box) {
    box.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Import Students from Excel/CSV</h3>
        <a class="btn btn-outline btn-sm" href="assets/student_import_template.xlsx" download>${icon("download")} Download Template</a>
      </div>
      <div class="card-content">
        <div class="dropzone" id="dropzone">
          ${icon("file-spreadsheet")}
          <p class="font-medium">Drag &amp; drop or click to select a .xlsx or .csv file</p>
          <p class="text-xs muted">Template columns: Member ID, Name, Password, Phone Number. Leave Password blank to auto-generate one. You can also add: Admission No, Class, Section, House, Room Number, Gender, Hostel and more.</p>
          <input type="file" id="file-input" accept=".xlsx,.xls,.csv" class="hidden" />
        </div>
        <div id="import-summary" class="mt-4"></div>
      </div>
    </div>
  `;
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("file-input");
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragging");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragging"));
    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragging");
        const file = e.dataTransfer?.files?.[0];
        if (file)
            doImport(file);
    });
    fileInput.addEventListener("change", () => {
        if (fileInput.files?.[0])
            doImport(fileInput.files[0]);
    });
}
async function doImport(file) {
    const summaryBox = document.getElementById("import-summary");
    summaryBox.innerHTML = `<p class="text-sm muted flex items-center gap-2">${icon("loader", "icon spin")} Importing ${escapeHtml(file.name)}...</p>`;
    try {
        const res = await studentsApi.import(file);
        summaryBox.innerHTML = `
      <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
        <div class="summary-stat"><div class="value">${res.total}</div><div class="text-xs muted">Total Rows</div></div>
        <div class="summary-stat"><div class="value good">${res.imported}</div><div class="text-xs muted">Imported</div></div>
        <div class="summary-stat"><div class="value good">${res.updated}</div><div class="text-xs muted">Updated</div></div>
        <div class="summary-stat"><div class="value">${res.skipped}</div><div class="text-xs muted">Skipped</div></div>
        <div class="summary-stat"><div class="value bad">${res.failed}</div><div class="text-xs muted">Failed</div></div>
      </div>
      ${res.failures.length > 0
            ? `<div class="table-wrap"><table><thead><tr><th>Row</th><th>Member ID</th><th>Reason</th></tr></thead><tbody>
          ${res.failures.map((f) => `<tr><td>${f.row}</td><td>${escapeHtml(f.member_id)}</td><td>${escapeHtml(f.reason)}</td></tr>`).join("")}
        </tbody></table></div>`
            : ""}
    `;
        toast.success(`Import complete: ${res.imported} added, ${res.updated} updated`);
        studentsCache = await studentsApi.list();
    }
    catch (err) {
        summaryBox.innerHTML = `<p class="text-sm" style="color:var(--destructive)">${escapeHtml(err.message || "Import failed")}</p>`;
    }
}
// ---------------- Analytics tab ----------------
async function renderAnalyticsTab(box) {
    const data = await analyticsApi.get();
    box.innerHTML = `
    <div class="grid lg:grid-cols-2 gap-4">
      <div class="card chart-card"><div class="card-header"><h3 class="card-title">Points Over Time</h3></div><div class="card-content"><canvas id="chart-month"></canvas></div></div>
      <div class="card chart-card"><div class="card-header"><h3 class="card-title">Top Activities</h3></div><div class="card-content"><canvas id="chart-activities"></canvas></div></div>
      <div class="card chart-card"><div class="card-header"><h3 class="card-title">Points by House</h3></div><div class="card-content"><canvas id="chart-house"></canvas></div></div>
      <div class="card chart-card"><div class="card-header"><h3 class="card-title">Teacher Contributions</h3></div><div class="card-content"><canvas id="chart-teacher"></canvas></div></div>
    </div>
  `;
    if (typeof Chart === "undefined")
        return;
    const palette = ["#7c3aed", "#eab308", "#16a34a", "#dc2626", "#0891b2", "#475569"];
    new Chart(document.getElementById("chart-month"), {
        type: "line",
        data: {
            labels: data.by_month.map((m) => m.month),
            datasets: [{ label: "Points", data: data.by_month.map((m) => m.points), borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,.15)", fill: true, tension: 0.3 }],
        },
        options: { plugins: { legend: { display: false } } },
    });
    new Chart(document.getElementById("chart-activities"), {
        type: "bar",
        data: {
            labels: data.top_activities.map((a) => a.name),
            datasets: [{ label: "Count", data: data.top_activities.map((a) => a.count), backgroundColor: "#eab308" }],
        },
        options: { plugins: { legend: { display: false } }, indexAxis: "y" },
    });
    new Chart(document.getElementById("chart-house"), {
        type: "doughnut",
        data: {
            labels: data.by_house.map((h) => h.name),
            datasets: [{ data: data.by_house.map((h) => h.value), backgroundColor: palette }],
        },
    });
    new Chart(document.getElementById("chart-teacher"), {
        type: "bar",
        data: {
            labels: data.teacher_contributions.map((t) => t.name),
            datasets: [{ label: "Awards given", data: data.teacher_contributions.map((t) => t.count), backgroundColor: "#16a34a" }],
        },
        options: { plugins: { legend: { display: false } } },
    });
}
// ---------------- Audit log tab ----------------
function renderAuditTab(box, stats) {
    const logs = stats.audit_logs || [];
    box.innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title flex items-center gap-2">${icon("shield-alert")} Audit Log</h3></div>
      <div class="card-content">
        ${logs.length === 0
        ? `<p class="text-sm muted">No audit entries yet.</p>`
        : logs
            .map((l) => `
          <div class="flex items-center justify-between text-sm" style="border-bottom:1px solid var(--border);padding:.5rem 0;">
            <div>
              <span class="font-medium">${escapeHtml(l.actor_name || "System")}</span>
              <span class="muted"> \u2013 ${escapeHtml(l.action)}</span>
              ${l.details ? `<p class="text-xs muted" style="margin:0">${escapeHtml(l.details)}</p>` : ""}
            </div>
            <span class="text-xs muted">${fmtDateTime(l.created_at)}</span>
          </div>`)
            .join("")}
      </div>
    </div>
  `;
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
