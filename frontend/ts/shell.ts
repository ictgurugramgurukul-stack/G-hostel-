import { icon } from "./icons.js";
import { Me } from "./session.js";
import { clearToken } from "./session.js";
import { authApi, dashboardApi } from "./api.js";

interface NavItem {
  hash: string;
  label: string;
  iconName: string;
}

export function renderShell(me: Me, activeHash: string): void {
  const header = document.getElementById("app-header")!;

  const nav: NavItem[] = [];
  if (me.role === "student") nav.push({ hash: "#/student", label: "My Dashboard", iconName: "bar-chart" });
  if (me.role === "teacher" || me.role === "super_admin")
    nav.push({ hash: "#/teacher", label: "Give Points", iconName: "award" });
  if (me.role === "super_admin") nav.push({ hash: "#/admin", label: "Admin", iconName: "users" });
  nav.push({ hash: "#/leaderboard", label: "Leaderboard", iconName: "trophy" });

  header.innerHTML = `
    <div class="app-header-inner">
      <a href="index.html" class="brand">
        <div class="logo gradient-primary">${icon("sparkles")}</div>
        <span class="font-display">Gurukul</span>
      </a>
      <nav class="main-nav">
        ${nav
          .map(
            (n) => `
          <a href="${n.hash}" data-hash="${n.hash}" class="${n.hash === activeHash ? "active" : ""}">
            ${icon(n.iconName)} ${n.label}
          </a>`
          )
          .join("")}
      </nav>
      <div class="flex items-center gap-3">
        <div class="hidden sm-block text-right" style="line-height:1.1">
          <p class="font-semibold text-sm" style="margin:0">${escapeName(me.full_name || "User")}</p>
          <p class="text-xs muted" style="margin:0;text-transform:capitalize">${me.role.replace("_", " ")}</p>
        </div>
        <button type="button" class="btn btn-ghost btn-icon" id="sign-out-btn" title="Sign out">${icon("log-out")}</button>
      </div>
    </div>
  `;

  document.getElementById("sign-out-btn")?.addEventListener("click", async () => {
    try {
      await authApi.signout();
    } catch {
      /* ignore */
    }
    clearToken();
    window.location.href = "auth.html";
  });
}

function escapeName(name: string): string {
  const div = document.createElement("div");
  div.textContent = name;
  return div.innerHTML;
}
