# Copilot Instructions — Highcharts Demo

Read `CLAUDE.md` at the project root for full conventions, chart ID table, and file map.

## Quick Reference

- **chart-registry.js** — Source of truth for all chart metadata (IDs, descriptions, containers)
- **charts.js** — Page navigation + calls `renderChartDescriptions()`
- **charts/*.js** — Individual chart implementations
- **index.html** — Structural HTML only (descriptions are auto-generated from registry)

## Rules

1. **Never hardcode chart descriptions in HTML.** Update `chart-registry.js` instead.
2. **Chart files use IIFEs or global init functions.** Do not convert to ES6 modules.
3. **When adding a new chart:** add a registry entry → add container div to `index.html` → create chart JS file → add to `CHART_INIT` in `charts.js`.
4. **Keep `customNotes` accurate** — it's the documentation visible in the UI.
5. **Use chart IDs** (e.g., `FC-1`, `MHC-1`) when referencing specific charts.
6. **member-stacked-legend-hc.js goal:** maximum native Highcharts, minimum custom code.

## Chart ID Lookup

When a user references a chart by ID, look up its `containerId` and `pageId` in `chart-registry.js` via `getChartById('ID')`.
