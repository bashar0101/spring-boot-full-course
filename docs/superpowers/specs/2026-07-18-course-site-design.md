# Spring Boot Course Site — Design

Date: 2026-07-18
Status: Approved (pending spec review)

## Goal

Present the 21 existing markdown files (00–20) plus a new lesson 21 on GitHub Actions — 22 total — as a browsable course website, deployed to GitHub Pages via GitHub Actions.

## Approach

Custom static HTML/CSS/JS. No build step, no framework, no bundler. Markdown files stay in the repo root untouched; the site renders them client-side.

## Files added

```
repo/
├── index.html                      app shell (sidebar + content area)
├── style.css                       clean docs style, light + dark themes
├── app.js                          routing, md fetch/render, search, prev/next
├── .nojekyll                       tell GitHub Pages not to run Jekyll
├── 21-github-actions.md            new lesson: what GitHub Actions are + what our workflow does
└── .github/workflows/deploy.yml    GitHub Actions deploy workflow
```

## Architecture

- **Rendering:** `app.js` fetches the requested `.md` file and renders it with marked.js (CDN). Code blocks highlighted with highlight.js (CDN) — Java, YAML, bash, SQL, XML.
- **Routing:** hash-based (`#/12-jwt-authentication`). Deep links work with zero server config. Default route `#/` renders `00-README.md` as the landing page.
- **Lesson list:** hardcoded array in `app.js` of `{file, title}` for all 22 files (00–21). Adding a lesson later = one array line + the md file.

## Layout

- Fixed left sidebar: course title, search box, ordered lesson list with numbers, current lesson highlighted.
- Main content column, max-width ~800px.
- Prev/Next lesson buttons at the bottom of each lesson.
- Mobile: sidebar collapses behind a hamburger button.

## Search

On first keystroke, fetch all lesson files once (~100KB total), cache in memory, build a simple in-memory index. Results show lesson title + matching snippet; click navigates to the lesson.

## Style

Clean docs look: white background, Spring green accent (`#6db33f`), system font stack, styled code blocks/tables/blockquotes. Dark mode toggle — respects OS preference, persists choice in localStorage.

## Error handling

Unknown route or failed fetch → "lesson not found" message with a link home.

## Deployment (GitHub Actions)

`.github/workflows/deploy.yml`:

- Trigger: push to `main` (plus `workflow_dispatch` for manual runs).
- Jobs: checkout → configure Pages → upload repo root as Pages artifact → deploy with `actions/deploy-pages`.
- Repo Settings → Pages must be set to "GitHub Actions" as the source.
- No build step needed — the site is already static; the workflow packages and deploys it.

## Lesson 21: GitHub Actions

New course lesson `21-github-actions.md` covering:

1. What GitHub Actions is (CI/CD platform: workflows, triggers, jobs, steps, runners, actions from the marketplace).
2. Anatomy of a workflow YAML file.
3. Line-by-line walkthrough of this repo's `deploy.yml` — what happened when we pushed and how the site got deployed.
4. Where to see runs (Actions tab) and how to re-run/debug.

Added to the sidebar as lesson 21.

## Testing

Serve locally (`python -m http.server`), verify: every lesson renders, search finds content, prev/next order correct, dark mode toggle persists, mobile sidebar works, unknown route shows error page. After push: Actions run green, Pages URL serves the site.
