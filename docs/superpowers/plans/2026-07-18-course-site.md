# Spring Boot Course Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the 22 course markdown files as a browsable static website deployed to GitHub Pages via GitHub Actions.

**Architecture:** Pure static site in the repo root. `index.html` is the app shell, `app.js` fetches markdown files and renders them client-side with marked.js + highlight.js (CDN), hash-based routing. A GitHub Actions workflow uploads the repo root as a Pages artifact and deploys it.

**Tech Stack:** Vanilla HTML/CSS/JS, marked.js (CDN), highlight.js (CDN), GitHub Actions (`actions/deploy-pages`).

## Global Constraints

- No build step, no npm, no bundler. Files served as-is.
- Markdown lesson files stay in repo root, untouched (except new `21-github-actions.md`).
- Accent color: Spring green `#6db33f`.
- Routing is hash-based: `#/<filename-without-.md>`; default route renders `00-README.md`.
- Verification is manual: `python -m http.server 8000` from repo root, check in browser.

---

### Task 1: App shell — index.html, style.css, .nojekyll

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `.nojekyll` (empty)

**Interfaces:**
- Produces: DOM ids used by Task 2/3: `#sidebar`, `#lesson-list`, `#search-input`, `#search-results`, `#content`, `#theme-toggle`, `#menu-toggle`. Loads `app.js` as last script.

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Spring Boot Course</title>
<link rel="stylesheet" href="style.css">
<link id="hljs-theme" rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css">
</head>
<body>
<button id="menu-toggle" aria-label="Toggle menu">☰</button>
<aside id="sidebar">
  <div class="sidebar-header">
    <a class="course-title" href="#/">Spring Boot Course</a>
    <button id="theme-toggle" aria-label="Toggle dark mode">🌙</button>
  </div>
  <input id="search-input" type="search" placeholder="Search lessons…" autocomplete="off">
  <div id="search-results" hidden></div>
  <nav><ol id="lesson-list"></ol></nav>
</aside>
<main id="content"><p>Loading…</p></main>
<script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"></script>
<script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `style.css`**

```css
:root {
  --accent: #6db33f;
  --bg: #ffffff;
  --fg: #24292f;
  --muted: #57606a;
  --sidebar-bg: #f6f8fa;
  --border: #d0d7de;
  --code-bg: #f6f8fa;
}
[data-theme="dark"] {
  --bg: #0d1117;
  --fg: #e6edf3;
  --muted: #8b949e;
  --sidebar-bg: #161b22;
  --border: #30363d;
  --code-bg: #161b22;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--fg);
  display: flex;
}
#sidebar {
  width: 300px;
  min-width: 300px;
  height: 100vh;
  position: sticky;
  top: 0;
  overflow-y: auto;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  padding: 1rem;
}
.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.course-title {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--accent);
  text-decoration: none;
}
#theme-toggle, #menu-toggle {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.2rem 0.5rem;
  color: var(--fg);
}
#menu-toggle {
  display: none;
  position: fixed;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 20;
  background: var(--sidebar-bg);
}
#search-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--fg);
  margin-bottom: 0.75rem;
}
#search-results { margin-bottom: 0.75rem; }
.search-hit {
  display: block;
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  text-decoration: none;
  color: var(--fg);
  font-size: 0.85rem;
}
.search-hit:hover { background: var(--border); }
.search-hit .hit-title { font-weight: 600; color: var(--accent); display: block; }
#lesson-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
#lesson-list a {
  display: block;
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  color: var(--fg);
  text-decoration: none;
  font-size: 0.9rem;
}
#lesson-list a:hover { background: var(--border); }
#lesson-list a.active {
  background: var(--accent);
  color: #fff;
  font-weight: 600;
}
.lesson-num { color: var(--muted); margin-right: 0.4rem; }
#lesson-list a.active .lesson-num { color: #e8f5e0; }
#content {
  flex: 1;
  max-width: 820px;
  padding: 2.5rem 3rem;
  margin: 0 auto;
  line-height: 1.65;
}
#content h1, #content h2, #content h3 { line-height: 1.3; }
#content h1 { border-bottom: 2px solid var(--accent); padding-bottom: 0.3rem; }
#content a { color: var(--accent); }
#content code {
  background: var(--code-bg);
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  font-size: 0.9em;
}
#content pre {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}
#content pre code { background: none; padding: 0; }
#content blockquote {
  border-left: 4px solid var(--accent);
  margin-left: 0;
  padding-left: 1rem;
  color: var(--muted);
}
#content table { border-collapse: collapse; width: 100%; }
#content th, #content td {
  border: 1px solid var(--border);
  padding: 0.5rem 0.75rem;
  text-align: left;
}
#content th { background: var(--sidebar-bg); }
.pager {
  display: flex;
  justify-content: space-between;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
  gap: 1rem;
}
.pager a {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: var(--fg);
  max-width: 48%;
}
.pager a:hover { border-color: var(--accent); }
.pager .pager-label { display: block; font-size: 0.75rem; color: var(--muted); }
.pager .pager-title { color: var(--accent); font-weight: 600; }
.pager .next { margin-left: auto; text-align: right; }
@media (max-width: 900px) {
  #menu-toggle { display: block; }
  #sidebar {
    position: fixed;
    left: 0;
    z-index: 10;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }
  #sidebar.open { transform: translateX(0); }
  #content { padding: 4rem 1.25rem 2rem; }
}
```

- [ ] **Step 3: Create empty `.nojekyll`**

Run: `New-Item -ItemType File .nojekyll`

- [ ] **Step 4: Verify shell loads**

Run: `python -m http.server 8000` (background), open `http://localhost:8000`.
Expected: sidebar with "Spring Boot Course" title, search box, empty lesson list, main area shows "Loading…". No console errors except none from app.js (doesn't exist yet — that 404 is expected).

- [ ] **Step 5: Commit**

```bash
git add index.html style.css .nojekyll
git commit -m "feat: add course site shell (layout, styles)"
```

---

### Task 2: app.js — lesson list, routing, rendering, prev/next, theme

**Files:**
- Create: `app.js`

**Interfaces:**
- Consumes: DOM ids from Task 1.
- Produces: global `LESSONS` array of `{file, title}` (used by Task 3 search); `render(slug)` navigation via `location.hash`.

- [ ] **Step 1: Create `app.js`**

```javascript
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
    <p>Could not load <code>${slug}</code>.</p>
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
```

- [ ] **Step 2: Verify in browser**

With `python -m http.server 8000` running, check at `http://localhost:8000`:
1. Sidebar lists all 22 entries in order; landing page shows course intro (00-README.md).
2. Click lesson 12 (JWT) — renders with highlighted Java code blocks; sidebar entry highlighted; URL is `#/12-jwt-authentication`.
3. Prev/Next buttons present and navigate correctly; lesson Intro has no Prev, lesson 21 has no Next (21-github-actions.md doesn't exist yet — its page shows "Lesson not found"; that's expected until Task 4).
4. Theme toggle switches dark/light; reload keeps choice.
5. Narrow window <900px: hamburger shows, sidebar slides in/out.
6. Visit `#/nonsense` — "Lesson not found" with link home.

Expected: all six behaviors work.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: add routing, markdown rendering, pager, theme toggle"
```

---

### Task 3: Search

**Files:**
- Modify: `app.js` (append at end)

**Interfaces:**
- Consumes: `LESSONS`, `slugOf` from Task 2; `#search-input`, `#search-results` from Task 1.

- [ ] **Step 1: Append search code to `app.js`**

```javascript
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
```

- [ ] **Step 2: Verify in browser**

1. Type `kafka` — results include "Kafka Messaging" with snippet; click navigates there and clears the box.
2. Type `zzzz` — "No results".
3. Type one char — no results panel.

Expected: all three behaviors work.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: add client-side full-text search"
```

---

### Task 4: Lesson 21 — GitHub Actions explainer

**Files:**
- Create: `21-github-actions.md`

**Interfaces:**
- Consumes: entry already present in `LESSONS` (Task 2) and workflow file content (must match Task 5's `deploy.yml` exactly).

- [ ] **Step 1: Write `21-github-actions.md`**

Content requirements (write in the same tutorial voice as lessons 01–20; look at `20-docker-deployment.md` for tone):

1. `# 21 — GitHub Actions and CI/CD` heading, short intro: what CI/CD is.
2. **What GitHub Actions is:** workflows (YAML in `.github/workflows/`), triggers (`on:`), jobs, steps, runners (GitHub-hosted VMs), reusable actions from the marketplace. One short example workflow snippet.
3. **What happened in this repo:** paste the full `deploy.yml` from Task 5 in a yaml code block, then a line-by-line walkthrough: `on: push` to main → `permissions` for Pages/OIDC → checkout → `configure-pages` → `upload-pages-artifact` (packages repo root) → `deploy-pages` (publishes). Explain that this site needs no build step, so the workflow only packages and deploys.
4. **Watching it run:** Actions tab, clicking a run, logs per step, re-run button, the Pages URL in the deploy step output.
5. Keep length in line with other lessons (~4–6 KB).

- [ ] **Step 2: Verify in browser**

Open `#/21-github-actions` — renders with highlighted YAML, Prev goes to Docker Deployment, no Next. Search for `workflow` after hard refresh — lesson 21 appears in results.

- [ ] **Step 3: Commit**

```bash
git add 21-github-actions.md
git commit -m "docs: add lesson 21 on GitHub Actions and CI/CD"
```

---

### Task 5: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: the workflow YAML quoted verbatim inside `21-github-actions.md` (Task 4).

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy course site to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Configure Pages
        uses: actions/configure-pages@v5
      - name: Upload site
        uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify consistency with lesson 21**

The YAML block inside `21-github-actions.md` must match this file byte-for-byte (ignoring surrounding prose). Fix whichever is stale.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Pages deploy workflow"
```

---

### Task 6: Final verification and deploy handoff

**Files:**
- Modify: none (verification + user instructions)

- [ ] **Step 1: Full local pass**

With `python -m http.server 8000` running: click through every lesson from the sidebar (all 22 render, no console errors), spot-check search, theme, mobile, error route.

- [ ] **Step 2: Branch check**

Workflow triggers on `main`; repo branch is currently `master`. Run:

```bash
git branch -m master main
```

- [ ] **Step 3: Hand off deploy steps to user**

User must (cannot be done locally):
1. Create GitHub repo, `git remote add origin <url>`, `git push -u origin main`.
2. Repo Settings → Pages → Source: **GitHub Actions**.
3. Watch the Actions tab; on green, site is live at the Pages URL.
