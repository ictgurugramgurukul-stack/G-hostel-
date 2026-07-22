import { authApi } from "../api.js";
import { setToken, isLoggedIn } from "../session.js";
import { toast } from "../toast.js";

let activeTab: "staff" | "student" = "staff";

function studentPasswordHint(): string {
  return "Gurukul@YOURID";
}

function render(): void {
  if (isLoggedIn()) {
    window.location.href = "app.html";
    return;
  }
  const app = document.getElementById("app")!;
  app.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="text-center mb-6" style="text-align:center;">
          <span class="font-display text-lg font-bold">Gurukul Rewards</span>
        </div>
        <div class="auth-box">
          <div class="tabs-list mb-4 w-full" style="display:grid;grid-template-columns:1fr 1fr;">
            <button class="tab-trigger ${activeTab === "staff" ? "active" : ""}" data-tab="staff">Teacher / Admin</button>
            <button class="tab-trigger ${activeTab === "student" ? "active" : ""}" data-tab="student">Student</button>
          </div>

          <div class="tab-panel ${activeTab === "staff" ? "active" : ""}" id="panel-staff">
            <form id="staff-form">
              <div class="field">
                <label for="email">Email</label>
                <input class="input" id="email" type="email" required />
              </div>
              <div class="field">
                <label for="password">Password</label>
                <input class="input" id="password" type="password" required />
              </div>
              <button type="submit" class="btn btn-primary w-full" id="staff-submit">Sign in</button>
              <p class="auth-hint">Teacher and Admin accounts are set up by the school. Contact your admin if you don't have login details.</p>
            </form>
          </div>

          <div class="tab-panel ${activeTab === "student" ? "active" : ""}" id="panel-student">
            <form id="student-form">
              <div class="field">
                <label for="member">Member ID</label>
                <input class="input" id="member" placeholder="e.g. H001" required />
              </div>
              <div class="field">
                <label for="spw">Password</label>
                <input class="input" id="spw" type="password" required />
              </div>
              <button type="submit" class="btn btn-primary w-full" id="student-submit">Sign in</button>
              <p class="auth-hint">Default password format: <span style="font-family:monospace;font-weight:700">${studentPasswordHint()}</span></p>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  app.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab as "staff" | "student";
      render();
    });
  });

  document.getElementById("staff-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("staff-submit") as HTMLButtonElement;
    const email = (document.getElementById("email") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement).value;
    btn.disabled = true;
    try {
      const res = await authApi.staffSignin(email, password);
      setToken(res.access_token);
      window.location.href = "app.html";
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("student-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("student-submit") as HTMLButtonElement;
    const memberId = (document.getElementById("member") as HTMLInputElement).value;
    const pw = (document.getElementById("spw") as HTMLInputElement).value;
    btn.disabled = true;
    try {
      const res = await authApi.studentSignin(memberId, pw);
      setToken(res.access_token);
      window.location.href = "app.html";
    } catch {
      toast.error("Invalid Member ID or password");
    } finally {
      btn.disabled = false;
    }
  });
}

render();
