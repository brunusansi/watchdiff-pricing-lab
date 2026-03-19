# WatchDiff Pricing Lab

Static GitHub Pages lab that changes visible SaaS pricing every 30 minutes.

## What it is

This repo exists as a monitoring target for products like WatchDiff. The page is intentionally built so pricing changes are meaningful and easy to classify:

- prices mutate every 30 minutes
- update badges and deltas mutate with them
- the current snapshot is present in rendered HTML and JSON
- GitHub Actions refreshes the static snapshot on a fixed schedule
- the page also advances itself when a new 30-minute bucket starts

## Stack

- static HTML/CSS/JS
- Node build script for snapshot generation
- GitHub Actions schedule (`1,31 * * * *`)
- GitHub Pages served from `/docs` on `main`
- optional Stitch MCP design helper via `@google/stitch-sdk`

## Local usage

```bash
npm install
npm run build
```

Generated output lands in `docs/`.

## Stitch

This repo includes a Stitch MCP helper script for generating a design reference project.

```bash
STITCH_API_KEY=your_key npm run stitch:design
```

Output is written to `.stitch/latest-result.json`.

## GitHub Pages setup

Use GitHub Pages with:

- **Branch:** `main`
- **Folder:** `/docs`

The workflow at `.github/workflows/update-pricing-lab.yml` rebuilds and commits fresh lab snapshots shortly after each 30-minute boundary. The deployed page also recalculates pricing at the bucket boundary in the browser, so the lab keeps mutating even if GitHub scheduled runs are delayed.

## Live files

- `docs/index.html` — rendered page
- `docs/data/pricing.json` — current machine-readable snapshot
