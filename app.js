const LESSONS = [
  { file: "00-README.md", title: "Course Introduction" },
  { file: "01-what-is-spring-boot.md", title: "What Is Spring Boot" },
  { file: "02-first-project.md", title: "Your First Project" },
  { file: "03-beans-and-injection.md", title: "Beans and Dependency Injection" },
  { file: "04-configuration.md", title: "Configuration" },
  { file: "05-rest-basics.md", title: "REST Basics" },
  { file: "06-validation-and-errors.md", title: "Validation and Error Handling" },
  { file: "07-jpa-and-postgres.md", title: "JPA and PostgreSQL" },
  { file: "08-relations-paging.md", title: "Relations and Paging" },
  { file: "09-services-transactions.md", title: "Services and Transactions" },
  { file: "10-dtos-clean-structure.md", title: "DTOs and Clean Structure" },
  { file: "11-spring-security-basics.md", title: "Spring Security Basics" },
  { file: "12-jwt-authentication.md", title: "JWT Authentication" },
  { file: "13-unit-testing.md", title: "Unit Testing" },
  { file: "14-integration-testing.md", title: "Integration Testing" },
  { file: "15-redis-caching.md", title: "Redis Caching" },
  { file: "16-kafka-messaging.md", title: "Kafka Messaging" },
  { file: "17-actuator-monitoring.md", title: "Actuator and Monitoring" },
  { file: "18-microservices.md", title: "Microservices" },
  { file: "19-resilience.md", title: "Resilience" },
  { file: "20-docker-deployment.md", title: "Docker Deployment" },
  { file: "21-github-actions.md", title: "GitHub Actions and CI/CD" },
];

const content = document.getElementById("content");
const lessonList = document.getElementById("lesson-list");
const sidebar = document.getElementById("sidebar");

const slugOf = (l) => l.file.replace(/\.md$/, "");

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function buildSidebar() {
  lessonList.innerHTML = LESSONS.map((l, i) => {
    const label = i === 0 ? "Intro" : String(i).padStart(2, "0");
    return `<li><a href="#/${slugOf(l)}" data-slug="${slugOf(l)}">` +
      `<span class="lesson-num">${label}</span>${l.title}</a></li>`;
  }).join("");
}

function currentSlug() {
  const h = location.hash.replace(/^#\/?/, "");
  return h || slugOf(LESSONS[0]);
}

async function render() {
  const slug = currentSlug();
  const idx = LESSONS.findIndex((l) => slugOf(l) === slug);
  if (idx === -1) return renderError(slug);
  try {
    const res = await fetch(LESSONS[idx].file);
    if (!res.ok) throw new Error(res.status);
    const md = await res.text();
    content.innerHTML = marked.parse(md) + pagerHtml(idx);
    content.querySelectorAll("pre code").forEach((el) => hljs.highlightElement(el));
    document.querySelectorAll("#lesson-list a").forEach((a) =>
      a.classList.toggle("active", a.dataset.slug === slug));
    sidebar.classList.remove("open");
    window.scrollTo(0, 0);
    document.title = `${LESSONS[idx].title} · Spring Boot Course`;
  } catch (e) {
    renderError(slug);
  }
}

function renderError(slug) {
  content.innerHTML = `<h1>Lesson not found</h1>
    <p>Could not load <code>${escapeHtml(slug)}</code>.</p>
    <p><a href="#/">← Back to course introduction</a></p>`;
}

function pagerHtml(idx) {
  const prev = LESSONS[idx - 1];
  const next = LESSONS[idx + 1];
  let html = '<div class="pager">';
  if (prev) html += `<a class="prev" href="#/${slugOf(prev)}">` +
    `<span class="pager-label">← Previous</span>` +
    `<span class="pager-title">${prev.title}</span></a>`;
  if (next) html += `<a class="next" href="#/${slugOf(next)}">` +
    `<span class="pager-label">Next →</span>` +
    `<span class="pager-title">${next.title}</span></a>`;
  return html + "</div>";
}

// Theme
const themeToggle = document.getElementById("theme-toggle");
const hljsTheme = document.getElementById("hljs-theme");
function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  themeToggle.textContent = dark ? "☀️" : "🌙";
  hljsTheme.href = dark
    ? "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github-dark.min.css"
    : "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css";
  localStorage.setItem("theme", dark ? "dark" : "light");
}
themeToggle.addEventListener("click", () =>
  applyTheme(document.documentElement.dataset.theme !== "dark"));
applyTheme(
  localStorage.getItem("theme")
    ? localStorage.getItem("theme") === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches
);

// Mobile menu
document.getElementById("menu-toggle").addEventListener("click", () =>
  sidebar.classList.toggle("open"));

buildSidebar();
window.addEventListener("hashchange", render);
render();

// Search
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
let searchCache = null;

async function loadSearchCache() {
  if (searchCache) return searchCache;
  searchCache = await Promise.all(
    LESSONS.map(async (l) => {
      try {
        const res = await fetch(l.file);
        return { ...l, text: res.ok ? (await res.text()).toLowerCase() : "" };
      } catch {
        return { ...l, text: "" };
      }
    })
  );
  return searchCache;
}

function snippet(text, q) {
  const i = text.indexOf(q);
  const start = Math.max(0, i - 40);
  return "…" + text.slice(start, i + q.length + 60).replace(/\s+/g, " ") + "…";
}

searchInput.addEventListener("input", async () => {
  const q = searchInput.value.trim().toLowerCase();
  if (q.length < 2) {
    searchResults.hidden = true;
    searchResults.innerHTML = "";
    return;
  }
  const cache = await loadSearchCache();
  const hits = cache.filter(
    (l) => l.title.toLowerCase().includes(q) || l.text.includes(q)
  ).slice(0, 8);
  searchResults.innerHTML = hits.length
    ? hits.map((l) =>
        `<a class="search-hit" href="#/${slugOf(l)}">` +
        `<span class="hit-title">${l.title}</span>` +
        `${l.text.includes(q) ? snippet(l.text, q) : ""}</a>`
      ).join("")
    : '<span class="search-hit">No results</span>';
  searchResults.hidden = false;
});

searchResults.addEventListener("click", () => {
  searchResults.hidden = true;
  searchInput.value = "";
});
