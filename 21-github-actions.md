# 21 — GitHub Actions and CI/CD

## Why CI/CD

**Continuous Integration / Continuous Deployment** means every change you push is automatically tested and shipped — no manual "zip the files and upload them" ritual, no "works on my machine" surprises. You already met the idea in lesson 20 as a word to know; here we build one for real, for this course site.

The payoff: push to `main`, and a few seconds later the live site reflects your change. No SSH, no FTP client, no forgetting a step.

## What GitHub Actions is

GitHub Actions is GitHub's built-in CI/CD runner. The pieces:

- **Workflow** — a YAML file in `.github/workflows/`. Each file is one automated pipeline.
- **Trigger (`on:`)** — the event that starts the workflow: a push, a pull request, a manual click, a schedule.
- **Job** — a unit of work that runs on its own machine. A workflow can have several jobs, run in parallel or in sequence.
- **Step** — a single command or action inside a job, run in order.
- **Runner** — the GitHub-hosted virtual machine (Linux, Windows, or macOS) that executes the job. It boots fresh for every run and is thrown away afterwards.
- **Action** — a reusable step published to the [GitHub Marketplace](https://github.com/marketplace?type=actions), e.g. `actions/checkout` to pull your repo, or `actions/setup-java` to install a JDK. You compose workflows out of these instead of writing everything by hand.

A minimal example, unrelated to this repo, to see the shape:

```yaml
name: Run tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      - run: ./mvnw test
```

`on: [push]` triggers on every push. The job spins up an `ubuntu-latest` runner, checks out the code, installs Java 21, then runs Maven tests. If any step fails, the run is marked red and the job stops.

## What happened in this repo

This course site is static HTML, CSS, and JavaScript — no build step, no compiler, nothing to install. Deploying it is really just "hand these files to GitHub Pages." Here is the workflow that does that, `.github/workflows/deploy.yml`:

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

Walking through it top to bottom:

- **`on: push: branches: [main]`** — runs automatically every time a commit lands on `main`. **`workflow_dispatch:`** adds a "Run workflow" button in the Actions tab, so you can also trigger a deploy manually without pushing anything.
- **`permissions:`** — GitHub Actions jobs get no permissions by default. This workflow needs `contents: read` (to check out the repo), `pages: write` (to publish to GitHub Pages), and `id-token: write` (to mint a short-lived OIDC token that proves to Pages this run is authorized — no stored deploy secret needed).
- **`concurrency:`** — if you push twice in quick succession, the group `pages` ensures only one deploy runs at a time; a newer push cancels an in-flight older one, so you never race yourself.
- **`environment: name: github-pages`** — ties the job to GitHub's `github-pages` deployment environment, which is what makes the live URL show up on the repo's "Environments" panel. The `url:` line pulls that URL from the deploy step's output once it exists.
- **`Checkout` (`actions/checkout@v4`)** — clones the repository onto the runner so later steps have the files to work with.
- **`Configure Pages` (`actions/configure-pages@v5`)** — reads the repo's Pages settings and sets up the metadata the later steps need; it does not upload or publish anything itself.
- **`Upload site` (`actions/upload-pages-artifact@v3`, `path: .`)** — packages the *entire repo root* as the deployable artifact. This is the step that stands in for a build: because there is no compiling, bundling, or minifying to do, "package" simply means "zip up what's already here."
- **`Deploy` (`actions/deploy-pages@v4`)** — takes that artifact and publishes it to GitHub Pages. Its `id: deployment` is what lets the `environment.url` line above reference `steps.deployment.outputs.page_url`.

Contrast this with the taskhub pipeline from lesson 20: that one would need a `test` step and a `build` step (Maven, JDK, packaging a jar) before anything could deploy. This workflow skips straight to packaging and deploying because static files need no build.

## Watching it run

After pushing to `main`, open the repo on GitHub and click the **Actions** tab. You'll see a list of workflow runs, newest first, each labeled with the commit message that triggered it.

Click a run to see its jobs; click the `deploy` job to see each step listed in order, with a green check, a red X, or a spinner while in progress. Click any step to expand its log — useful when something fails and you need to know exactly which command errored.

Two things worth knowing:

- **Re-run** — a button (with a dropdown for "re-run all jobs" vs "re-run failed jobs") on a completed run, handy when a failure was a flaky network blip rather than an actual bug.
- **The deploy URL** — the `Deploy` step's output includes `page_url`, the live address of the site. GitHub also surfaces it on the run summary page and under the repo's **Settings → Pages**, so you never have to guess it.

## Last exercise

1. Open the Actions tab for this repo and find the run triggered by the commit that added this lesson.
2. Expand the `Upload site` and `Deploy` steps and read their logs — confirm which files got packaged.
3. Trigger a manual run using `workflow_dispatch` from the Actions tab, without pushing a new commit.

---
**Next:** nothing — this is the last lesson. Go build something and ship it with a pipeline like this one.
