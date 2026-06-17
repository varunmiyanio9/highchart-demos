# Highcharts Demos

A growing collection of [Highcharts](https://www.highcharts.com/) experiments. Each page explores one chart idea and answers a single recurring question:

> **How much can Highcharts do out of the box, and where do we have to write custom code to get the behavior we want?**

This repo is deliberately a **trial-and-error playground**. We try every chart type and interaction we can think of — selection, forecasts, custom legends, context menus — and for each one we record exactly which parts are **native Highcharts config** and which parts are **custom code** we had to add because Highcharts has no built-in equivalent.

## 🔗 Live Preview

Every demo is deployed via GitHub Pages — no build, no install:

**https://varunmiyanio9.github.io/highchart-demos/#bar-chart**

The URL hash selects the page, so you can deep-link to any demo:

| Demo | Link |
|------|------|
| Bar Chart | [#bar-chart](https://varunmiyanio9.github.io/highchart-demos/#bar-chart) |
| Axis Selection | [#axis-selection](https://varunmiyanio9.github.io/highchart-demos/#axis-selection) |
| Bucket Selection | [#bucket-selection](https://varunmiyanio9.github.io/highchart-demos/#bucket-selection) |
| Axis Tick Selection | [#tick-selection](https://varunmiyanio9.github.io/highchart-demos/#tick-selection) |
| Label Click Selection | [#label-click](https://varunmiyanio9.github.io/highchart-demos/#label-click) |
| Combined Selection (SVG) | [#combined-selection](https://varunmiyanio9.github.io/highchart-demos/#combined-selection) |
| Forecast (9 variants) | [#forecast](https://varunmiyanio9.github.io/highchart-demos/#forecast) |
| Stack Bar Legends — Default | [#stack-bar-legends-default](https://varunmiyanio9.github.io/highchart-demos/#stack-bar-legends-default) |
| Stack Bar Legends — min-custom | [#stack-bar-legends-min-custom](https://varunmiyanio9.github.io/highchart-demos/#stack-bar-legends-min-custom) |
| Stack Bar Legends — full-custom | [#stack-bar-legends-full-custom](https://varunmiyanio9.github.io/highchart-demos/#stack-bar-legends-full-custom) |
| Multi-Type Combined | [#multi-type-chart](https://varunmiyanio9.github.io/highchart-demos/#multi-type-chart) |
| Context Menu | [#context-menu](https://varunmiyanio9.github.io/highchart-demos/#context-menu) |

> Push to `main` → GitHub Pages republishes the site automatically.

## The "Custom vs Native" comparison

This is the heart of the project. Below **every** chart on the live site, a description panel auto-renders two things:

- **Custom notes** — the code we had to write ourselves, and *why* Highcharts couldn't do it natively.
- **Highcharts-native** — the built-in config / API that did the heavy lifting.

The three **Stack Bar Legends** demos make the spectrum explicit on purpose:

| Variant | Custom code | Idea |
|---------|-------------|------|
| **Default** (`SBL-1`) | None — 100% out of the box | What you get for free from the default legend |
| **min-custom** (`MHC-1`) | Minimal — native legend + small hooks | Maximum native Highcharts, minimum custom code |
| **full-custom** (`MSL-1`) | Entire legend is hand-built HTML | What it costs to fully control the legend |

## Running locally

It's plain HTML/JS with **no build step**. Just serve the folder over HTTP (needed so the local `library/` scripts load correctly):

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000/#bar-chart>.

Opening `index.html` directly via `file://` mostly works too, but a local server avoids browser security quirks.

### Standalone single-file demos

The [`demos/`](demos/) folder contains self-contained `.html` files (Highcharts loaded from CDN) for the three stack-bar-legend variants — handy for copy-pasting a single demo elsewhere without the rest of the project.

## Project structure

```
highchart-demos/
├── index.html            # Structural HTML only — sidebar + chart containers
├── chart-registry.js     # SINGLE SOURCE OF TRUTH for chart metadata + descriptions
├── charts.js             # Sidebar nav, lazy init, auto-renders descriptions
├── charts/*.js           # One file per chart's implementation
├── styles.css            # All styling (incl. chart ID badges)
├── library/              # Vendored Highcharts + modules (do not modify)
├── demos/                # Standalone single-file demos
└── CLAUDE.md             # Project conventions / contributor guide
```

### How a chart gets on the page

1. **`chart-registry.js`** holds page metadata and one entry per chart instance (ID, title, custom notes, native notes). The sidebar and all on-page descriptions are generated from this — descriptions are **never** hardcoded in HTML.
2. **`index.html`** provides the container `<div>` and the sidebar link.
3. **`charts/<page>.js`** builds the actual Highcharts chart.
4. **`charts.js`** lazy-initializes each chart the first time you navigate to it.

### Chart IDs

Every chart has a stable ID (e.g. `FC-1`, `CTX-2`) shown as a dark pill badge in its top-right corner. Use these IDs when referring to a specific chart in issues, PRs, or discussion. The full ID reference lives in [CLAUDE.md](CLAUDE.md#id-reference).

## Tech

- **Highcharts** (vendored in `library/`) + modules: `highcharts-more`, exporting, offline-exporting, export-data, accessibility.
- Plain ES5-style JavaScript (`var`, IIFEs / global init functions) — no bundler, no npm, no framework.

## Contributing

Read [CLAUDE.md](CLAUDE.md) first — it documents the conventions (registry-driven descriptions, ID system, the "minimum custom code" design goal). In short, to add a chart:

1. Add a registry entry in `chart-registry.js`.
2. Add a container `<div>` + sidebar link in `index.html`.
3. Create `charts/<page-name>.js`.
4. Wire it into `CHART_INIT` in `charts.js`.
