/* ===================================================================
 * CHART REGISTRY — Single source of truth for all chart metadata.
 *
 * Every chart instance in this project has an entry here.
 * The UI descriptions below each chart are auto-generated from this
 * registry via renderChartDescriptions(). Never hardcode descriptions
 * in HTML — update this file instead.
 * =================================================================== */

/* ── PAGE-LEVEL METADATA (drives sidebar navigation) ──────────────── */
var PAGE_META = {
    'bar-chart':                { name: 'Bar Chart', description: 'Basic bar chart with export and accessibility' },
    'axis-selection':           { name: 'Axis Selection', description: 'Click/Ctrl+Click/drag to select bars, keyboard via accessibility module' },
    'bucket-selection':         { name: 'Bucket Selection', description: 'Multi chart types (column/line/area) with shared selection state' },
    'tick-selection':           { name: 'Axis Tick Selection', description: 'External DOM buttons as axis ticks, roving tabindex, full keyboard' },
    'label-click':              { name: 'Label Click Selection', description: 'useHTML labels with event delegation' },
    'combined-selection':       { name: 'Combined Selection', description: 'Pure SVG labels, background-only mouse select, bidirectional label+grid' },
    'forecast':                 { name: 'Forecast', description: 'Historical vs forecast data with confidence bands and error bars' },
    'member-stacked-legend':    { name: 'Member Stacked Legend', description: 'Custom HTML legend: group headers, swatches, dividers, hover highlight' },
    'member-stacked-legend-hc': { name: 'Member Stacked Legend (HC)', description: 'Same chart using Highcharts native legend with minimal custom code' },
    'multi-type-chart':         { name: 'Multi-Type Combined', description: 'Bar, Stacked, Line, Area combined in one chart with dual y-axes' },
    'context-menu':             { name: 'Context Menu', description: 'Built-in exporting menu + custom right-click nested context menu' }
};

/* ── CHART REGISTRY (one entry per rendered chart instance) ────────── */
var CHART_REGISTRY = [

    // ─── Bar Chart ───
    {
        chartId: 'BAR-1',
        pageId: 'bar-chart',
        containerId: 'bar-chart-main',
        title: 'Monthly Sales Column Chart',
        customNotes: [
            'None — Pure Highcharts config. Column chart with accessibility point descriptions.'
        ],
        nativeNotes: 'Standard column chart, accessibility.point.valueDescriptionFormat.'
    },

    // ─── Axis Selection ───
    {
        chartId: 'SEL-1',
        pageId: 'axis-selection',
        containerId: 'selection-chart',
        title: 'Axis Selection (Click/Ctrl/Drag)',
        customNotes: [
            'Keyboard multi-select (Space/Enter accumulate) — Highcharts accessibility treats Space as plain click. We disable allowPointSelect and handle selection manually.',
            'Shift+Arrow range select — track shiftKeyDown globally + hook into point.events.mouseOver (fired by accessibility on navigate).',
            'Escape to clear — keydown listener deselects all points.',
            'Manual click handler — because allowPointSelect is disabled, we implement click = single, Ctrl+Click = toggle.'
        ],
        nativeNotes: 'point.select(), chart.getSelectedPoints(), states.select styling, chart.events.selection (drag), accessibility Tab/Arrow.'
    },

    // ─── Bucket Selection (3 charts) ───
    {
        chartId: 'BKT-1',
        pageId: 'bucket-selection',
        containerId: 'bucket-chart-column',
        title: 'Bucket Selection — Column',
        customNotes: [
            'Shared selection state (Set) across 3 charts — single selectedBuckets Set is the source of truth.',
            'syncAllCharts() — propagates selection to all 3 chart types by adding/removing plotBands.',
            'PlotBands as category highlight — Highcharts doesn\'t visually highlight entire categories on select.',
            'Shift+Arrow range select — global keydown tracking + mouseOver hook.'
        ],
        nativeNotes: 'xAxis.plotBands, point.select(selected, accumulate), chart.getSelectedPoints(), chart.events.selection, accessibility module.'
    },
    {
        chartId: 'BKT-2',
        pageId: 'bucket-selection',
        containerId: 'bucket-chart-line',
        title: 'Bucket Selection — Line',
        customNotes: ['Same shared selection logic as BKT-1.'],
        nativeNotes: 'Same as BKT-1.'
    },
    {
        chartId: 'BKT-3',
        pageId: 'bucket-selection',
        containerId: 'bucket-chart-area',
        title: 'Bucket Selection — Area',
        customNotes: ['Same shared selection logic as BKT-1.'],
        nativeNotes: 'Same as BKT-1.'
    },

    // ─── Tick Selection ───
    {
        chartId: 'TIK-1',
        pageId: 'tick-selection',
        containerId: 'tick-chart',
        title: 'Axis Tick Selection',
        customNotes: [
            'External DOM buttons as category selectors — Highcharts has NO native axis-label click/select event.',
            'Roving tabindex pattern — Arrow keys move focus between buttons without Tab.',
            'PlotBand sync — button toggle adds/removes plotBands to highlight categories.',
            'Multi-select via Ctrl+Click, Shift+Click for range — implemented in button click handler.',
            'Escape to clear — keydown listener deselects all.'
        ],
        nativeNotes: 'xAxis.plotBands, point.select(), chart.getSelectedPoints(). Zero conflict with accessibility module.'
    },

    // ─── Label Click ───
    {
        chartId: 'LBL-1',
        pageId: 'label-click',
        containerId: 'label-chart',
        title: 'Label Click Selection',
        customNotes: [
            'Event delegation click handler on container — Highcharts provides no label click event.',
            'Category index via textContent — data-* attributes are stripped by Highcharts HTML sanitization.',
            'PlotBand management — add/remove plotBands to highlight selected categories.',
            'CSS class toggle on labels — applies selected visual state (bold, color).',
            'Redraw callback re-applies styles — plotBand changes trigger redraws which recreate label DOM.'
        ],
        nativeNotes: 'xAxis.labels.useHTML + formatter, xAxis.plotBands, point.select(), chart.events.click (background clear).'
    },

    // ─── Combined Selection (3 charts) ───
    {
        chartId: 'CMB-1',
        pageId: 'combined-selection',
        containerId: 'combined-chart-column',
        title: 'Combined Selection — Column',
        customNotes: [
            'SVG label click via tick.label.on(\'click\') — undocumented but stable internal API.',
            'Background-only mouse select — chart.events.click translates pixel → category index. Clicking bars/lines does NOT select.',
            'Hover via .on(\'mouseover\')/.css() — SVG has no CSS :hover pseudo-class.',
            'Re-attach handlers on every redraw — plotBand add/remove destroys all tick SVG elements.',
            'Font size/weight toolbar — external buttons call xAxis[0].update() on all 3 charts.',
            'SVG filter for label background — custom <filter> adds background rect behind selected label text.'
        ],
        nativeNotes: 'xAxis.plotBands, chart.zooming.type:x + chart.events.selection, tick.label.css(), accessibility.keyboardNavigation.'
    },
    {
        chartId: 'CMB-2',
        pageId: 'combined-selection',
        containerId: 'combined-chart-line',
        title: 'Combined Selection — Line',
        customNotes: ['Same selection logic as CMB-1 (shared state).'],
        nativeNotes: 'Same as CMB-1.'
    },
    {
        chartId: 'CMB-3',
        pageId: 'combined-selection',
        containerId: 'combined-chart-area',
        title: 'Combined Selection — Area',
        customNotes: ['Same selection logic as CMB-1 (shared state).'],
        nativeNotes: 'Same as CMB-1.'
    },

    // ─── Forecast (9 charts) ───
    {
        chartId: 'FC-1',
        pageId: 'forecast',
        containerId: 'forecast-line-chart',
        title: 'Forecast Line',
        customNotes: [
            'padRight() / padLeft() — data transformation to align historical + forecast arrays with nulls.'
        ],
        nativeNotes: 'plotLines, dashStyle, zones, linkedTo.'
    },
    {
        chartId: 'FC-2',
        pageId: 'forecast',
        containerId: 'forecast-bar-chart',
        title: 'Forecast Bar',
        customNotes: [
            'hexToRgba() — converts hex colors to translucent fill for forecast bars.'
        ],
        nativeNotes: 'plotLines, color with rgba, pointPlacement.'
    },
    {
        chartId: 'FC-3',
        pageId: 'forecast',
        containerId: 'forecast-stacked-chart',
        title: 'Forecast Stacked',
        customNotes: [
            'padRight() — nulls pad historical data so stacking doesn\'t collapse forecast columns.'
        ],
        nativeNotes: 'stacking:normal, plotLines, dashStyle, linkedTo.'
    },
    {
        chartId: 'FC-4',
        pageId: 'forecast',
        containerId: 'forecast-area-chart',
        title: 'Forecast Area with Confidence Band',
        customNotes: [
            'buildAreaRange() — transforms [low,high] pairs into arearange-compatible tuples.'
        ],
        nativeNotes: 'arearange series, fillOpacity, linkedTo, dashStyle.'
    },
    {
        chartId: 'FC-5',
        pageId: 'forecast',
        containerId: 'forecast-bonus-chart',
        title: 'Forecast with Error Bars',
        customNotes: [
            'buildErrorBars() — transforms confidence data into errorbar series format.'
        ],
        nativeNotes: 'errorbar series, linkedTo, whiskerLength, stemWidth.'
    },
    {
        chartId: 'FC-6',
        pageId: 'forecast',
        containerId: 'forecast-divider-center',
        title: 'Forecast Divider — Center',
        customNotes: [
            'plotLine events (mouseover/mouseout) — native Highcharts plotLine event handlers for hover tooltip.'
        ],
        nativeNotes: 'plotLines with events, label, zIndex.'
    },
    {
        chartId: 'FC-7',
        pageId: 'forecast',
        containerId: 'forecast-divider-left',
        title: 'Forecast Divider — Left Edge',
        customNotes: [
            'plotLine events — same native hover tooltip as FC-6 but positioned at forecast start.'
        ],
        nativeNotes: 'plotLines with events, label, zIndex.'
    },
    {
        chartId: 'FC-8',
        pageId: 'forecast',
        containerId: 'forecast-tooltip-center',
        title: 'Renderer Tooltip — Center',
        customNotes: [
            'chart.renderer.path() + chart.renderer.label() — draws a custom hoverable vertical line with callout label. Highcharts plotLines don\'t support custom tooltip content on hover.'
        ],
        nativeNotes: 'chart.renderer (SVG drawing API), chart.events.load.'
    },
    {
        chartId: 'FC-9',
        pageId: 'forecast',
        containerId: 'forecast-tooltip-left',
        title: 'Renderer Tooltip — Left Edge',
        customNotes: [
            'chart.renderer.path() + chart.renderer.label() — same renderer-based approach as FC-8 at different position.'
        ],
        nativeNotes: 'chart.renderer (SVG drawing API), chart.events.load.'
    },

    // ─── Member Stacked Legend (Custom HTML) ───
    {
        chartId: 'MSL-1',
        pageId: 'member-stacked-legend',
        containerId: 'msl-chart',
        title: 'Member Stacked Legend (Custom HTML)',
        customNotes: [
            'Entire legend is external HTML — Highcharts built-in legend cannot render grouped headers with member swatches and "|" dividers.',
            'Hover-dim via series.group.attr({opacity}) — internal SVG element manipulation (not public API).',
            'Click-toggle wires to series.show()/hide() — custom click handler on legend buttons.',
            'Visual feedback via .msl-off CSS class — applies strikethrough + dimmed swatch when hidden.'
        ],
        nativeNotes: 'legend.enabled:false, series.show()/hide(), series.group (SVG internals).'
    },

    // ─── Member Stacked Legend (HC Native) ───
    {
        chartId: 'MHC-1',
        pageId: 'member-stacked-legend-hc',
        containerId: 'msl-hc-chart',
        title: 'Member Stacked Legend (Highcharts Native)',
        customNotes: [
            'Group header hover → highlight stack — Highcharts has no concept of legend item groups. mouseenter on group header calls setState(\'hover\') on member series.',
            'Dummy series as legend separators — group headers and "|" dividers are zero-data series with legendItemClick returning false.',
            'labelFormatter HTML — returns custom HTML (stacked-bar SVG icon, color swatches) since default legend symbol cannot render grouped layouts.',
            'alignColumns: false — prevents table-grid alignment; items flow sequentially.'
        ],
        nativeNotes: 'legend.maxHeight + legend.navigation (pagination), useHTML, symbolWidth/Height:0, series.setState(), itemHoverStyle, chart.events.render.'
    },

    // ─── Multi-Type Chart ───
    {
        chartId: 'MTC-1',
        pageId: 'multi-type-chart',
        containerId: 'multi-type-chart-main',
        title: 'Multi-Type Combined Chart',
        customNotes: [
            'None — Pure Highcharts config. 5 series types in one chart using dual y-axes, stack IDs, and grouping.'
        ],
        nativeNotes: 'Multiple series types, yAxis array, stack IDs, grouping, pointPlacement.'
    },

    // ─── Context Menu (2 charts) ───
    {
        chartId: 'CTX-1',
        pageId: 'context-menu',
        containerId: 'ctx-builtin-chart',
        title: 'Context Menu — Built-in Exporting',
        customNotes: [
            'None — 100% Highcharts config. The exporting module renders and manages the hamburger menu including custom menuItems for type switching.'
        ],
        nativeNotes: 'exporting.buttons.contextButton.menuItems, chart type switching via series.update().'
    },
    {
        chartId: 'CTX-2',
        pageId: 'context-menu',
        containerId: 'ctx-custom-chart',
        title: 'Context Menu — Custom Right-Click',
        customNotes: [
            'Right-click nested context menu — Highcharts provides NO right-click menu, NO nested submenus, NO highlight locking.',
            'Series detection on right-click — uses chart.hoverSeries to identify targeted series.',
            'Nested submenu positioning — pure CSS/HTML nested <ul> with :hover display toggle.',
            'Type switching per-series — calls series.update({type}) on targeted series only.'
        ],
        nativeNotes: 'chart.hoverSeries, series.setState(), series.update(), chart.exportChart(), chart.fullscreen.toggle(), chart.print().'
    }
];

/* ── HELPER FUNCTIONS ─────────────────────────────────────────────── */

function getChartsByPage(pageId) {
    return CHART_REGISTRY.filter(function (c) { return c.pageId === pageId; });
}

function getChartById(chartId) {
    for (var i = 0; i < CHART_REGISTRY.length; i++) {
        if (CHART_REGISTRY[i].chartId === chartId) return CHART_REGISTRY[i];
    }
    return null;
}

/* ── AUTO-RENDER: descriptions + ID badges from registry ──────────── */

function renderChartDescriptions() {
    var pages = {};
    CHART_REGISTRY.forEach(function (entry) {
        if (!pages[entry.pageId]) pages[entry.pageId] = [];
        pages[entry.pageId].push(entry);
    });

    Object.keys(pages).forEach(function (pageId) {
        var pageEl = document.getElementById(pageId);
        if (!pageEl) return;

        var entries = pages[pageId];

        // Inject ID badge on each chart container
        // Badge goes on a wrapper AROUND the container, not inside it,
        // because Highcharts clears container innerHTML when rendering.
        entries.forEach(function (entry) {
            var container = document.getElementById(entry.containerId);
            if (!container) return;
            // Skip if already wrapped
            if (container.parentNode && container.parentNode.classList.contains('chart-id-wrap')) return;

            var wrapper = document.createElement('div');
            wrapper.className = 'chart-id-wrap';
            wrapper.style.position = 'relative';
            container.parentNode.insertBefore(wrapper, container);
            wrapper.appendChild(container);

            var badge = document.createElement('span');
            badge.className = 'chart-id-badge';
            badge.textContent = entry.chartId;
            badge.title = entry.title;
            wrapper.appendChild(badge);
        });

        // Remove previously auto-generated descriptions (idempotent)
        var old = pageEl.querySelector('.chart-descriptions-auto');
        if (old) old.remove();

        // Build description panel
        var descDiv = document.createElement('div');
        descDiv.className = 'bucket-section-hint chart-descriptions-auto';
        descDiv.style.marginTop = '10px';

        entries.forEach(function (entry, idx) {
            // Chart heading with ID
            var heading = document.createElement('strong');
            heading.textContent = '[' + entry.chartId + '] ' + entry.title;
            descDiv.appendChild(heading);

            // Custom notes list
            var ul = document.createElement('ul');
            ul.style.cssText = 'margin:4px 0 4px 18px;padding:0;list-style:disc;line-height:1.7;';
            entry.customNotes.forEach(function (note) {
                var li = document.createElement('li');
                li.textContent = note;
                ul.appendChild(li);
            });
            descDiv.appendChild(ul);

            // Native notes
            var nativeP = document.createElement('div');
            nativeP.style.cssText = 'font-size:12px;color:#555;margin-bottom:' + (idx < entries.length - 1 ? '14px' : '0') + ';';
            nativeP.innerHTML = '<strong>Highcharts-native:</strong> ' + entry.nativeNotes;
            descDiv.appendChild(nativeP);
        });

        pageEl.appendChild(descDiv);
    });
}
