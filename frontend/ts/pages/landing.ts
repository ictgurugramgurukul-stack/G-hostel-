import { icon } from "../icons.js";
import { isLoggedIn } from "../session.js";

const features = [
  { iconName: "award", title: "Award Points", desc: "Teachers reward good behaviour, discipline and participation instantly." },
  { iconName: "trophy", title: "Live Leaderboards", desc: "Overall, house-wise, class-wise and monthly rankings." },
  { iconName: "medal", title: "Badges & Certificates", desc: "Automatic badges from Bronze to Legend as students grow." },
  { iconName: "upload", title: "Excel Import", desc: "Bulk import students with smart upsert and validation." },
  { iconName: "bar-chart", title: "Analytics", desc: "Beautiful charts for points, houses, rooms and activities." },
  { iconName: "shield-check", title: "Role-based Access", desc: "Separate secure dashboards for admins, teachers and students." },
];

function render(): void {
  const app = document.getElementById("app")!;
  const dashboardHref = isLoggedIn() ? "app.html" : "auth.html";

  app.innerHTML = `
    <header class="container-lg flex items-center justify-between" style="height:4rem;">
      <div class="brand">
        <span class="font-display text-lg font-bold">Gurukul Rewards</span>
      </div>
      <a class="btn btn-primary" href="${isLoggedIn() ? "app.html" : "auth.html"}">Sign in</a>
    </header>

    <section class="hero">
      <div class="container">
        <div class="eyebrow">${icon("trending-up")} Hostel Rewards &amp; Leaderboard System</div>
        <h1>Celebrate every student's <span class="gradient-text">good habits</span></h1>
        <p class="lead">
          A digital rewards platform where teachers award points for behaviour, cleanliness and
          participation &mdash; and students climb the leaderboard, earn badges and unlock certificates.
        </p>
        <div class="hero-actions">
          <a class="btn btn-primary btn-lg" href="${dashboardHref}">Get started</a>
          <a class="btn btn-outline btn-lg" href="#features">Learn more</a>
        </div>
      </div>
    </section>

    <section class="container" id="features">
      <div class="feature-grid">
        ${features
          .map(
            (f) => `
          <div class="feature-card">
            <div class="feature-icon">${icon(f.iconName)}</div>
            <h3>${f.title}</h3>
            <p>${f.desc}</p>
          </div>`
          )
          .join("")}
      </div>
    </section>

    <footer class="site-footer">
      &copy; ${new Date().getFullYear()} Gurukul Rewards. Built for hostels that celebrate good habits.
    </footer>
  `;
}

render();
