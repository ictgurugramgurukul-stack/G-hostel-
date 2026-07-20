import { authApi } from "./api.js";
import { isLoggedIn, clearToken } from "./session.js";
import { renderShell } from "./shell.js";
import { renderStudentPage } from "./pages/student.js";
import { renderTeacherPage } from "./pages/teacher.js";
import { renderAdminPage } from "./pages/admin.js";
import { renderLeaderboardPage } from "./pages/leaderboard.js";
let me = null;
function defaultHashFor(role) {
    if (role === "student")
        return "#/student";
    if (role === "teacher")
        return "#/teacher";
    return "#/admin";
}
function allowedFor(role, hash) {
    if (hash === "#/leaderboard")
        return true;
    if (hash === "#/student")
        return role === "student";
    if (hash === "#/teacher")
        return role === "teacher" || role === "super_admin";
    if (hash === "#/admin")
        return role === "super_admin";
    return false;
}
async function route() {
    if (!me)
        return;
    const content = document.getElementById("app-content");
    let hash = window.location.hash || defaultHashFor(me.role);
    if (!allowedFor(me.role, hash)) {
        hash = defaultHashFor(me.role);
        window.location.hash = hash;
    }
    renderShell(me, hash);
    if (hash === "#/student")
        return renderStudentPage(content, me);
    if (hash === "#/teacher")
        return renderTeacherPage(content, me);
    if (hash === "#/admin")
        return renderAdminPage(content, me);
    if (hash === "#/leaderboard")
        return renderLeaderboardPage(content, me);
}
async function init() {
    if (!isLoggedIn()) {
        window.location.href = "auth.html";
        return;
    }
    try {
        me = await authApi.me();
    }
    catch {
        clearToken();
        window.location.href = "auth.html";
        return;
    }
    window.addEventListener("hashchange", route);
    await route();
}
init();
