# Highcharts Demo — Project Conventions

## Architecture
- Plain JS, no build step, no ES6 modules. All scripts loaded via `<script>` tags.
- `chart-registry.js` is the **SINGLE SOURCE OF TRUTH** for chart metadata.
- `charts.js` handles sidebar navigation and auto-renders descriptions from the registry.
- Individual chart logic lives in `charts/*.js` files.
- Vendor library in `library/` — do not modify.

## Chart ID System
Every chart instance has a unique ID (e.g., `FC-1`, `CTX-2`) defined in `chart-registry.js`.
- IDs are visible in the UI as dark-pill badges in the top-right corner of each chart.
- Use these IDs when discussing specific charts in issues, PRs, or conversations.
- Format: `PREFIX-N` where prefix identifies the page, N is sequential.

### ID Reference
| ID | Page | Container | Title |
|----|------|-----------|-------|
| BAR-1 | bar-chart | bar-chart-main | Monthly Sales Column Chart |
| SEL-1 | axis-selection | selection-chart | Axis Selection |
| BKT-1 | bucket-selection | bucket-chart-column | Bucket Selection — Column |
| BKT-2 | bucket-selection | bucket-chart-line | Bucket Selection — Line |
| BKT-3 | bucket-selection | bucket-chart-area | Bucket Selection — Area |
| TIK-1 | tick-selection | tick-chart | Axis Tick Selection |
| LBL-1 | label-click | label-chart | Label Click Selection |
| CMB-1 | combined-selection | combined-chart-column | Combined Selection — Column |
| CMB-2 | combined-selection | combined-chart-line | Combined Selection — Line |
| CMB-3 | combined-selection | combined-chart-area | Combined Selection — Area |
| FC-1 | forecast | forecast-line-chart | Forecast Line |
| FC-2 | forecast | forecast-bar-chart | Forecast Bar |
| FC-3 | forecast | forecast-stacked-chart | Forecast Stacked |
| FC-4 | forecast | forecast-area-chart | Forecast Area with Confidence Band |
| FC-5 | forecast | forecast-bonus-chart | Forecast with Error Bars |
| FC-6 | forecast | forecast-divider-center | Forecast Divider — Center |
| FC-7 | forecast | forecast-divider-left | Forecast Divider — Left Edge |
| FC-8 | forecast | forecast-tooltip-center | Renderer Tooltip — Center |
| FC-9 | forecast | forecast-tooltip-left | Renderer Tooltip — Left Edge |
| SBL-1 | stack-bar-legends-default | sbl-default-chart | Stack Bar Legends (Default) |
| MHC-1 | stack-bar-legends-min-custom | msl-hc-chart | Stack Bar Legends (min-custom) |
| MSL-1 | stack-bar-legends-full-custom | msl-chart | Stack Bar Legends (full-custom) |
| MTC-1 | multi-type-chart | multi-type-chart-main | Multi-Type Combined Chart |
| CTX-1 | context-menu | ctx-builtin-chart | Context Menu — Built-in Exporting |
| CTX-2 | context-menu | ctx-custom-chart | Context Menu — Custom Right-Click |

## When Modifying a Chart
1. Update the chart logic in `charts/<page-name>.js`
2. Update metadata in `chart-registry.js` (`customNotes`, `nativeNotes`, `title`)
3. Descriptions auto-render from the registry — **never edit HTML description divs manually**
4. If adding a new chart: add registry entry → add container div in `index.html` → create chart JS → add to `CHART_INIT` in `charts.js`

## Key Files
| File | Purpose |
|------|---------|
| `chart-registry.js` | Source of truth: IDs, metadata, auto-render function |
| `charts.js` | Navigation, lazy init, calls `renderChartDescriptions()` |
| `charts/*.js` | Individual chart implementations |
| `index.html` | Structural HTML only (no description content) |
| `styles.css` | All styling including `.chart-id-badge` |
| `CLAUDE.md` | This file — project conventions |

## Design Goal
Each chart explores a unique idea. The project compares "how much is custom code vs native Highcharts". The `stack-bar-legends-min-custom.js` chart specifically aims for **maximum native Highcharts, minimum custom code** — only add custom behavior when Highcharts has no native equivalent.

## Conventions
- All chart init functions are global (IIFEs or named functions on window)
- `CHART_INIT` in `charts.js` lazy-initializes charts on first navigation
- No npm, no package.json — vendor library in `library/`
- Use `var` not `const`/`let` for broad compatibility
- Descriptions come from `chart-registry.js` only — single source of truth
