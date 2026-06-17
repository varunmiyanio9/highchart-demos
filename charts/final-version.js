// =============================================================================
// FINAL VERSION (FIN-1) — The finalized chart presentation.
//
// This is the "everything we want, in one chart" demo. It deliberately combines
// the ideas explored separately elsewhere into a single Highcharts instance:
//
//   1. MULTI-TYPE COMBINATION  (like MTC-1)
//        Column + 3 stacked-bar groups + Line(s) + Area in one canvas, dual axes.
//   2. THREE STACKED GROUPS    (data shaped like MHC-1)
//        Product-1 / Product-2 / Product-3, each a stack of shared members.
//   3. CATEGORY SELECTION      (like CMB-1)
//        Mouse (label click / background click / drag) + keyboard (Tab/Arrow/
//        Space, Shift+Arrow range, Escape clear). Font size & weight toolbar.
//   4. COMBINED GROUPED LEGEND (like MHC-1)
//        The three product stacks are represented by ONE legend presentation:
//        one group header listing all three products, and ONE member row that
//        toggles/highlights the same member across all three stacks. Pagination
//        is demonstrated with extra dummy legend items.
//   5. CONTEXT MENU            (like CTX-2, simplified)
//        Right-click → flat menu → change chart type (Line / Bar / Area /
//        Stacked Bar). No nested submenus, no series-splitting.
//   6. FORECAST DIVIDER        (like FC-8, with one change)
//        Renderer-drawn vertical line + hover tooltip marking forecast start —
//        but drawn BEHIND the bars (low zIndex) instead of on top.
//   7. ALLOW-SCROLL SWITCH     (new)
//        Toggle horizontal scrolling. ON → chart keeps a fixed wide width and
//        the wrapper scrolls. OFF → chart shrinks to fit the visible area.
//
// Data is original to this demo (not copied from the other pages) and sized so
// every feature has something meaningful to act on.
// =============================================================================

(function () {
    /* ── DATE RANGE (dynamic: one year before → one year after now) ──── */

    var MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var MONTHS_BEFORE = 24; // two years of past
    var MONTHS_AFTER = 24;  // two years of forecast

    // Anchor on the browser's REAL current month (Date API). The range bounds
    // are fixed from this anchor at load (the "hardcoded" start/end). Only the
    // current bucket — where the forecast line sits — is movable later.
    var ANCHOR = new Date();
    var ANCHOR_Y = ANCHOR.getFullYear();
    var ANCHOR_M = ANCHOR.getMonth();

    function monthOffset(y, m, delta) {
        var total = y * 12 + m + delta;
        return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
    }
    function ymKey(d) { return d.y + '-' + (d.m + 1 < 10 ? '0' : '') + (d.m + 1); }
    function ymLabel(d) { return MONTH_ABBR[d.m] + " '" + String(d.y).slice(-2); }

    var CATEGORY_DATES = [];
    for (var ci = -MONTHS_BEFORE; ci <= MONTHS_AFTER; ci++) {
        CATEGORY_DATES.push(monthOffset(ANCHOR_Y, ANCHOR_M, ci));
    }
    var CATEGORIES = CATEGORY_DATES.map(ymLabel); // e.g. ["Jun '25", … "Jun '27"]

    function findBucketIndex(y, m) {
        for (var i = 0; i < CATEGORY_DATES.length; i++) {
            if (CATEGORY_DATES[i].y === y && CATEGORY_DATES[i].m === m) return i;
        }
        return -1;
    }

    // Forecast starts at the current bucket — defaults to today's month
    // (index = MONTHS_BEFORE) and is movable via the toolbar month input.
    var currentBucketIndex = MONTHS_BEFORE;

    /* ── DATA (generated per bucket: seasonal shape + gentle growth) ──── */

    // Seasonal multiplier keyed by CALENDAR month so seasonality repeats yearly.
    var MONTH_SEASON = [0.82, 0.86, 0.95, 1.02, 1.08, 1.16, 1.05, 1.12, 1.20, 1.10, 0.92, 1.28];

    function seriesFor(base, factor) {
        return CATEGORY_DATES.map(function (d, i) {
            var season = MONTH_SEASON[d.m];
            var growth = 1 + i * 0.012; // slow rise from past → future
            return Math.round(base * factor * season * growth);
        });
    }

    // Members are SHARED across the three product stacks. Same name + color in
    // each stack → one combined legend entry controls all three.
    var MEMBERS = [
        { key: 'Item-1', color: '#4E79A7', base: 18 },
        { key: 'Item-2', color: '#59A14F', base: 14 },
        { key: 'Item-3', color: '#E15759', base: 11 },
        { key: 'Item-4', color: '#F28E2B', base: 8 },
        { key: 'Item-5', color: '#B07AA1', base: 6 }
    ];

    // The three stacked groups. `factor` scales every member's magnitude so the
    // three stacks have visibly different heights.
    var GROUPS = [
        { id: 'p1', label: 'Product-1', factor: 1.00 },
        { id: 'p2', label: 'Product-2', factor: 0.78 },
        { id: 'p3', label: 'Product-3', factor: 0.55 }
    ];
    var GROUP_NAMES = GROUPS.map(function (g) { return { id: g.id, label: g.label }; });
    var FIRST_GROUP = GROUPS[0].id; // only this group's items appear in the legend

    // Pre-compute member series once (keyed by member+group) — avoids rebuilding
    // the same arrays repeatedly in the series builder and detail panel.
    var MEMBER_DATA = {};
    GROUPS.forEach(function (g) {
        MEMBERS.forEach(function (m) { MEMBER_DATA[m.key + '_' + g.id] = seriesFor(m.base, g.factor); });
    });
    function memberData(memberKey, groupId) { return MEMBER_DATA[memberKey + '_' + groupId]; }

    // Standalone (non-stacked) column — its own cluster next to the stacks.
    var REVENUE = { id: 'revenue', name: 'Revenue', color: '#2C3E50', data: seriesFor(150, 1) };

    // Lines & area (right axis = "units"), plus one line on the left axis.
    var RUN_RATE = { id: 'run-rate', name: 'Run Rate', color: '#16A085', yAxis: 0, data: seriesFor(115, 1) };
    var TREND = { id: 'trend', name: 'Trend', color: '#1A1A2E', yAxis: 1, data: seriesFor(720, 1) };
    var VOLUME = { id: 'volume', name: 'Volume', color: '#9E6FC8', yAxis: 1, data: seriesFor(640, 1) };

    var DUMMY_LEGEND_COUNT = 16; // extra legend rows to force pagination
    // Fixed chart width when "Allow Scroll" is on — scales with the bucket count
    // so the (now much wider) timeline has plenty of room to scroll.
    var SCROLL_WIDTH = Math.max(1600, CATEGORIES.length * 110);
    var HIGHLIGHT_COLOR = 'rgba(46, 204, 113, 0.18)';

    var FONT_SIZE_OPTIONS = ['11px', '12px', '14px', '16px', '18px'];
    var FONT_WEIGHT_OPTIONS = ['normal', '600', 'bold'];
    var FONT_WEIGHT_LABELS = ['Regular', 'Semibold', 'Bold'];

    // Per-category total of every real column value — used by the detail panel.
    var CATEGORY_TOTALS = CATEGORIES.map(function (_, i) {
        var total = REVENUE.data[i];
        GROUPS.forEach(function (g) {
            MEMBERS.forEach(function (m) { total += memberData(m.key, g.id)[i]; });
        });
        return total;
    });

    /* ── STATE ────────────────────────────────────────────────────────── */

    var chart = null;
    var fcLine = null, fcTip = null;          // forecast divider renderer elements
    var selectedCategories = new Set();
    var currentFontSize = '12px';
    var currentFontWeight = 'normal';
    var allowScroll = false;
    var shiftKeyDown = false;
    var isKeyboardInteraction = false;

    document.addEventListener('keydown', function (e) { if (e.key === 'Shift') shiftKeyDown = true; });
    document.addEventListener('keyup', function (e) { if (e.key === 'Shift') shiftKeyDown = false; });

    var STACKED_ICON = '<i class="fa-solid fa-chart-column"></i>';

    /* ── SERIES BUILDER ───────────────────────────────────────────────── */

    function buildSeries() {
        var defs = [];

        // ── Three stacked product groups ──
        // Group-header dummy series (data:[]) — one shown in the legend, it
        // renders the combined "Product-1  Product-2  Product-3:" presentation.
        GROUPS.forEach(function (g) {
            defs.push({
                id: 'grp_' + g.id,
                name: g.label,
                type: 'column',
                data: [],
                stack: g.id,
                stacking: 'normal',
                color: 'transparent',
                borderWidth: 0,
                showInLegend: g.id === FIRST_GROUP,
                enableMouseTracking: false,
                custom: { isGroupHeader: true, groupId: g.id },
                events: {
                    // Group header is presentation only — clicking it does nothing.
                    legendItemClick: function () { return false; }
                }
            });

            // Member column series — real data, stack into this group's tower.
            MEMBERS.forEach(function (m) {
                defs.push({
                    id: m.key + '_' + g.id,
                    name: m.key,
                    type: 'column',
                    color: m.color,
                    data: memberData(m.key, g.id),
                    stack: g.id,
                    stacking: 'normal',
                    yAxis: 0,
                    showInLegend: g.id === FIRST_GROUP,
                    borderWidth: 0.5,
                    borderColor: '#fff',
                    custom: {
                        isMember: true,
                        groupId: g.id,
                        sharedLegendKey: m.key,
                        memberColor: m.color
                    },
                    events: {
                        // Toggle this member across ALL three stacks at once.
                        legendItemClick: function (e) {
                            e.preventDefault();
                            var key = this.options.custom.sharedLegendKey;
                            var related = this.chart.series.filter(function (s) {
                                return s.options.custom && s.options.custom.sharedLegendKey === key;
                            });
                            var allHidden = related.every(function (s) { return !s.visible; });
                            related.forEach(function (s) { s.setVisible(allHidden, false); });
                            this.chart.redraw();
                            return false;
                        }
                    }
                });
            });
        });

        // ── Standalone bar (its own cluster) ──
        defs.push({
            id: REVENUE.id, name: REVENUE.name, type: 'column',
            color: REVENUE.color, data: REVENUE.data.slice(),
            stack: 'rev', yAxis: 0, showInLegend: true,
            custom: { isBar: true, barColor: REVENUE.color }
        });

        // ── Divider between stacks/bar and the line/area items ──
        defs.push({
            id: 'fin-divider', name: '​', type: 'line', data: [],
            color: 'transparent', lineWidth: 0, marker: { enabled: false },
            showInLegend: true, enableMouseTracking: false,
            custom: { isDivider: true },
            events: { legendItemClick: function () { return false; } }
        });

        // ── Lines & area ──
        [RUN_RATE, TREND].forEach(function (l) {
            defs.push({
                id: l.id, name: l.name, type: 'line',
                color: l.color, data: l.data.slice(), yAxis: l.yAxis,
                lineWidth: 2, marker: { enabled: false }, zIndex: 6,
                states: { hover: { lineWidthPlus: 0 } },
                showInLegend: true,
                custom: { isLine: true, lineColor: l.color }
            });
        });
        defs.push({
            id: VOLUME.id, name: VOLUME.name, type: 'area',
            color: VOLUME.color, data: VOLUME.data.slice(), yAxis: VOLUME.yAxis,
            fillOpacity: 0.18, lineWidth: 2, marker: { enabled: false }, zIndex: 4,
            showInLegend: true,
            custom: { isArea: true, areaColor: VOLUME.color }
        });

        // ── Dummy legend items (pagination demo) ──
        var palette = ['#7F8C8D', '#95A5A6', '#34495E', '#16A085', '#8E44AD', '#2980B9'];
        for (var d = 0; d < DUMMY_LEGEND_COUNT; d++) {
            defs.push({
                id: 'dummy-' + d, name: 'KPI ' + (d + 1), type: 'line', data: [],
                color: palette[d % palette.length], lineWidth: 0,
                marker: { enabled: false }, enableMouseTracking: false,
                showInLegend: true,
                custom: { isDummy: true, dummyColor: palette[d % palette.length] }
            });
        }

        return defs;
    }

    /* ── LEGEND LABEL FORMATTER (combined grouped presentation) ───────── */

    function legendLabelFormatter() {
        var custom = (this.options && this.options.custom) || {};

        if (custom.isDivider) {
            return '<span style="display:inline-block;width:1px;height:14px;background:#d4d4d8;' +
                'vertical-align:middle;pointer-events:none;"></span>';
        }

        // One header item visually represents all three product stacks.
        if (custom.isGroupHeader) {
            return '<div style="display:flex;align-items:center;gap:12px;">' +
                GROUP_NAMES.map(function (group, i) {
                    return '<div id="' + group.id + '" class="fin-group-item" ' +
                        'style="display:flex;align-items:center;gap:4px;cursor:pointer;">' +
                        STACKED_ICON +
                        '<b style="font-weight:700;color:#16191d;font-size:11.5px;pointer-events:none;">' +
                        group.label + (i === GROUP_NAMES.length - 1 ? ':' : '') +
                        '</b></div>';
                }).join('') +
                '</div>';
        }

        if (custom.isLine) {
            return '<div style="display:flex;align-items:center;gap:5px;">' +
                '<span style="display:inline-block;width:20px;height:3px;background:' +
                custom.lineColor + ';border-radius:1px;flex-shrink:0;"></span>' +
                '<span style="font-size:11.5px;">' + this.name + '</span></div>';
        }

        if (custom.isArea) {
            return '<div style="display:flex;align-items:center;gap:5px;">' +
                '<span style="display:inline-block;width:14px;height:11px;background:' +
                custom.areaColor + ';opacity:0.55;border-radius:1px;flex-shrink:0;"></span>' +
                '<span style="font-size:11.5px;">' + this.name + '</span></div>';
        }

        if (custom.isBar) {
            return '<div style="display:flex;align-items:center;gap:4px;">' + STACKED_ICON +
                '<b style="font-weight:700;color:#16191d;font-size:11.5px;">' + this.name + '</b></div>';
        }

        if (custom.isMember) {
            return '<div class="fin-member-item" data-key="' + this.name +
                '" style="display:flex;align-items:center;gap:4px;">' +
                '<span style="display:inline-block;width:10px;height:10px;background:' +
                custom.memberColor + ';border-radius:1px;flex-shrink:0;"></span>' +
                '<span style="font-size:11.5px;">' + this.name + '</span></div>';
        }

        if (custom.isDummy) {
            return '<div style="display:flex;align-items:center;gap:5px;">' +
                '<span style="display:inline-block;width:14px;height:3px;background:' +
                custom.dummyColor + ';border-radius:1px;flex-shrink:0;"></span>' +
                '<span style="font-size:11.5px;color:#6b7079;">' + this.name + '</span></div>';
        }

        return this.name;
    }

    /* ── FORECAST DIVIDER (renderer line drawn BEHIND the bars) ───────── */

    function forecastX() {
        // On the current month's tick (category center), not between two months.
        return chart.xAxis[0].toPixels(currentBucketIndex, false);
    }

    function forecastLabelText() {
        return 'Forecast → from ' + CATEGORIES[currentBucketIndex];
    }

    function drawForecastDivider() {
        var xPos = forecastX();
        var top = chart.plotTop;
        var bottom = chart.plotTop + chart.plotHeight;

        if (!fcLine) {
            fcLine = chart.renderer.path(['M', xPos, top, 'L', xPos, bottom]).attr({
                stroke: '#f39c12',
                'stroke-width': 2,
                dashstyle: 'Solid',
                // zIndex below the column series group (3) so the line sits
                // BEHIND the bars and every plotted series, but above gridlines (1).
                zIndex: 2,
                cursor: 'pointer'
            }).add();

            fcTip = chart.renderer.label(forecastLabelText(), 0, 0, 'callout')
                .attr({ fill: '#f39c12', padding: 8, r: 4, zIndex: 8 })
                .css({ color: '#fff', fontSize: '12px', fontWeight: 'bold' })
                .add().hide();

            fcLine.on('mouseover', function () {
                fcLine.attr({ 'stroke-width': 4 });
                fcTip.attr({ text: forecastLabelText(), x: forecastX() + 8, y: chart.plotTop + 18 }).show();
            });
            fcLine.on('mouseout', function () {
                fcLine.attr({ 'stroke-width': 2 });
                fcTip.hide();
            });
        } else {
            // Reposition / relabel after redraw, resize, scroll toggle, or when
            // the current month moves.
            fcLine.attr({ d: ['M', xPos, top, 'L', xPos, bottom] });
            fcTip.attr({ text: forecastLabelText(), x: xPos + 8 });
        }
    }

    // Move the forecast boundary to the chosen current month and refresh visuals.
    function updateForecastMarker() {
        if (!chart) return;
        drawForecastDivider();
        chart.redraw();
        setTimeout(function () { if (chart) { applyLabelStyles(); attachLabelHandlers(); } }, 50);
        updateDetailPanel();
    }

    /* ── SELECTION (mouse + keyboard, single chart) ───────────────────── */

    function ensureFilter() {
        var svg = chart.container.querySelector('svg');
        if (!svg || svg.querySelector('#fin-label-bg')) return;
        var defs = svg.querySelector('defs') ||
            svg.insertBefore(document.createElementNS('http://www.w3.org/2000/svg', 'defs'), svg.firstChild);
        var filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.setAttribute('id', 'fin-label-bg');
        filter.setAttribute('x', '-0.1');
        filter.setAttribute('y', '-0.2');
        filter.setAttribute('width', '1.2');
        filter.setAttribute('height', '1.5');
        filter.innerHTML = '<feFlood flood-color="' + HIGHLIGHT_COLOR + '" result="bg"/>' +
            '<feMerge><feMergeNode in="bg"/><feMergeNode in="SourceGraphic"/></feMerge>';
        defs.appendChild(filter);
    }

    function applyLabelStyles() {
        ensureFilter();
        var ticks = chart.xAxis[0].ticks;
        Object.keys(ticks).forEach(function (key) {
            var tick = ticks[key];
            if (!tick.label) return;
            var idx = parseInt(key, 10);
            if (isNaN(idx) || idx < 0) return;
            if (selectedCategories.has(idx)) {
                tick.label.css({ fontWeight: 'bold', color: '#27ae60', cursor: 'pointer' });
                tick.label.element.style.filter = 'url(#fin-label-bg)';
            } else {
                tick.label.css({ fontWeight: currentFontWeight, color: '#333333', cursor: 'pointer' });
                tick.label.element.style.filter = '';
            }
        });
    }

    function attachLabelHandlers() {
        var ticks = chart.xAxis[0].ticks;
        Object.keys(ticks).forEach(function (key) {
            var tick = ticks[key];
            if (!tick.label) return;
            var idx = parseInt(key, 10);
            if (isNaN(idx) || idx < 0) return;

            tick.label.css({ cursor: 'pointer' });
            // Guard against duplicate listeners: tick labels are recreated when
            // plotBands change (fresh element → rebinds), but a plain redraw
            // (e.g. font change) reuses the element — don't stack handlers on it.
            if (tick.label.element._finBound) return;
            tick.label.element._finBound = true;

            tick.label.on('click', function (e) {
                selectCategory(idx, e.ctrlKey || e.metaKey);
            });
            tick.label.on('mouseover', function () {
                if (!selectedCategories.has(idx)) tick.label.css({ color: '#27ae60' });
            });
            tick.label.on('mouseout', function () {
                if (!selectedCategories.has(idx)) tick.label.css({ color: '#333333' });
            });
        });
    }

    function syncSelection() {
        var axis = chart.xAxis[0];
        (axis.plotLinesAndBands || [])
            .filter(function (b) { return b.id && b.id.indexOf('fin-band-') === 0; })
            .map(function (b) { return b.id; })
            .forEach(function (id) { axis.removePlotBand(id); });

        selectedCategories.forEach(function (idx) {
            axis.addPlotBand({
                from: idx - 0.5, to: idx + 0.5,
                color: HIGHLIGHT_COLOR, id: 'fin-band-' + idx, zIndex: 0
            });
        });

        setTimeout(function () {
            if (!chart) return;
            applyLabelStyles();
            attachLabelHandlers();
        }, 50);

        updateDetailPanel();
    }

    function selectCategory(idx, accumulate) {
        if (idx < 0 || idx >= CATEGORIES.length) return;
        if (!accumulate) selectedCategories.clear();
        if (selectedCategories.has(idx)) selectedCategories.delete(idx);
        else selectedCategories.add(idx);
        syncSelection();
    }

    function clearSelection() {
        if (selectedCategories.size === 0) return;
        selectedCategories.clear();
        syncSelection();
    }

    // Keyboard: accessibility module fires point click on Space/Enter.
    function handlePointClick() {
        if (!isKeyboardInteraction) return;
        selectCategory(this.x, true);
        isKeyboardInteraction = false;
    }

    function handlePointMouseOver() {
        if (shiftKeyDown) {
            selectedCategories.add(this.x);
            syncSelection();
        }
    }

    function handleDragSelect(e) {
        if (!e.xAxis) return;
        var min = Math.floor(e.xAxis[0].min + 0.5);
        var max = Math.floor(e.xAxis[0].max + 0.5);
        for (var i = Math.max(0, min); i <= Math.min(CATEGORIES.length - 1, max); i++) {
            selectedCategories.add(i);
        }
        syncSelection();
        return false;
    }

    function handleBackgroundClick(e) {
        if (!e.xAxis) { clearSelection(); return; }
        var xValue = Math.round(e.xAxis[0].value);
        if (xValue < 0 || xValue >= CATEGORIES.length) { clearSelection(); return; }
        selectCategory(xValue, e.ctrlKey || e.metaKey);
    }

    /* ── DETAIL PANEL ─────────────────────────────────────────────────── */

    function updateDetailPanel() {
        var content = document.getElementById('fin-content');
        if (!content) return;

        if (selectedCategories.size === 0) {
            content.innerHTML = '<p class="no-selection">No categories selected. ' +
                'Drag on the chart background, click an x-axis label, or use the keyboard.</p>';
            return;
        }

        var html = '<table><thead><tr><th>Month</th><th>Revenue</th>' +
            '<th>Product-1</th><th>Product-2</th><th>Product-3</th><th>Total (all columns)</th></tr></thead><tbody>';

        var sorted = Array.from(selectedCategories).sort(function (a, b) { return a - b; });
        sorted.forEach(function (idx) {
            var p = GROUPS.map(function (g) {
                return MEMBERS.reduce(function (sum, m) { return sum + memberData(m.key, g.id)[idx]; }, 0);
            });
            var forecastTag = idx >= currentBucketIndex
                ? ' <span style="font-size:11px;color:#f39c12;font-weight:700;">(forecast)</span>' : '';
            html += '<tr><td><strong>' + CATEGORIES[idx] + '</strong>' + forecastTag + '</td>' +
                '<td>' + REVENUE.data[idx] + '</td>' +
                '<td>' + p[0] + '</td><td>' + p[1] + '</td><td>' + p[2] + '</td>' +
                '<td><strong>' + CATEGORY_TOTALS[idx] + '</strong></td></tr>';
        });
        html += '</tbody></table>';
        html += '<p style="margin-top:10px;font-size:13px;color:#2c3e50;"><strong>' +
            selectedCategories.size + '</strong> month(s) selected</p>';
        content.innerHTML = html;
    }

    /* ── TOOLBAR (font size, font weight, allow-scroll switch) ────────── */

    function buildToolbar() {
        var toolbar = document.getElementById('fin-toolbar');
        if (!toolbar) return;

        var html = '<label>Font Size: <select id="fin-font-size">';
        FONT_SIZE_OPTIONS.forEach(function (size) {
            html += '<option value="' + size + '"' + (size === currentFontSize ? ' selected' : '') +
                '>' + parseInt(size, 10) + 'px</option>';
        });
        html += '</select></label>';

        html += '<label>Font Weight: <select id="fin-font-weight">';
        FONT_WEIGHT_OPTIONS.forEach(function (w, i) {
            html += '<option value="' + w + '"' + (w === currentFontWeight ? ' selected' : '') +
                '>' + FONT_WEIGHT_LABELS[i] + '</option>';
        });
        html += '</select></label>';

        // Current month (forecast boundary) — defaults to today, constrained to
        // the fixed range, and movable to watch the forecast line follow it.
        html += '<label>Current Month: <input type="month" id="fin-current-month"' +
            ' min="' + ymKey(CATEGORY_DATES[0]) + '"' +
            ' max="' + ymKey(CATEGORY_DATES[CATEGORY_DATES.length - 1]) + '"' +
            ' value="' + ymKey(CATEGORY_DATES[currentBucketIndex]) + '"></label>';

        html += '<label class="fin-switch-label">Allow Scroll' +
            '<span class="fin-switch"><input type="checkbox" id="fin-allow-scroll"' +
            (allowScroll ? ' checked' : '') + '><span class="fin-switch-slider"></span></span></label>';

        toolbar.innerHTML = html;

        document.getElementById('fin-font-size').addEventListener('change', function () {
            currentFontSize = this.value;
            updateAxisFonts();
        });
        document.getElementById('fin-font-weight').addEventListener('change', function () {
            currentFontWeight = this.value;
            updateAxisFonts();
        });
        document.getElementById('fin-current-month').addEventListener('change', function () {
            var parts = (this.value || '').split('-');
            if (parts.length < 2) return;
            var idx = findBucketIndex(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1);
            if (idx < 0) return; // outside the fixed range (min/max usually prevent this)
            currentBucketIndex = idx;
            updateForecastMarker();
        });
        document.getElementById('fin-allow-scroll').addEventListener('change', function () {
            allowScroll = this.checked;
            applyScroll();
        });
    }

    function updateAxisFonts() {
        if (!chart) return;
        chart.xAxis[0].update({
            labels: { style: { fontSize: currentFontSize, fontWeight: currentFontWeight } }
        }, false);
        chart.yAxis.forEach(function (ax) {
            ax.update({ labels: { style: { fontSize: currentFontSize, fontWeight: currentFontWeight } } }, false);
        });
        chart.redraw();
        setTimeout(function () { if (chart) { applyLabelStyles(); attachLabelHandlers(); } }, 50);
    }

    function applyScroll() {
        // Highcharts can't tear down scrollablePlotArea via update()/reflow()
        // once it's created, so we rebuild the chart to flip scrolling on/off.
        // Selection / current month / fonts live in module vars, so we just
        // recreate and re-apply the selection afterwards.
        if (chart) { chart.destroy(); chart = null; }
        fcLine = null; fcTip = null; // old renderer elements died with the chart
        createChart();
        syncSelection();
    }

    /* ── CONTEXT MENU (flat: Line / Bar / Area / Stacked Bar) ─────────── */

    function isRealSeries(s) {
        var c = s.options.custom || {};
        return !c.isDivider && !c.isGroupHeader && !c.isDummy;
    }

    function wireContextMenu() {
        var menu = document.getElementById('fin-ctx-menu');
        var label = document.getElementById('fin-ctx-label');
        var container = document.getElementById('fin-chart');
        if (!menu || !container) return;

        var targetSeries = null;

        function lock() {
            if (!targetSeries) return;
            chart.series.forEach(function (s) {
                Highcharts.Series.prototype.setState.call(s, s === targetSeries ? 'hover' : 'inactive');
            });
        }
        function clearLock() {
            chart.series.forEach(function (s) {
                Highcharts.Series.prototype.setState.call(s, '');
            });
            targetSeries = null;
        }
        function hide() { menu.style.display = 'none'; clearLock(); }

        container.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            targetSeries = (chart.hoverSeries && isRealSeries(chart.hoverSeries)) ? chart.hoverSeries : null;
            lock();
            label.textContent = targetSeries ? ('Change Type — ' + targetSeries.name) : 'Change Type — all series';
            updateActive();

            menu.style.display = 'block';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
            requestAnimationFrame(function () {
                var rect = menu.getBoundingClientRect();
                if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
                if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
            });
        });

        document.addEventListener('click', function (e) { if (!menu.contains(e.target)) hide(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });

        menu.addEventListener('click', function (e) {
            var item = e.target.closest('[data-fintype]');
            if (!item) return;
            var type = item.dataset.fintype;

            if (targetSeries) {
                applyType([targetSeries], type);
            } else {
                applyType(chart.series.filter(isRealSeries), type);
            }
            chart.redraw();
            setTimeout(function () { if (chart) { applyLabelStyles(); attachLabelHandlers(); } }, 50);
            hide();
        });

        function applyType(seriesList, type) {
            seriesList.forEach(function (s) {
                if (type === 'stacked') {
                    s.update({ type: 'column', stacking: 'normal' }, false);
                } else {
                    s.update({ type: type, stacking: undefined }, false);
                }
            });
        }

        function updateActive() {
            var current = '';
            if (targetSeries) {
                current = (targetSeries.options.stacking === 'normal' && targetSeries.type === 'column')
                    ? 'stacked' : targetSeries.type;
            }
            menu.querySelectorAll('[data-fintype]').forEach(function (el) {
                el.classList.toggle('ctx-menu-item--active', el.dataset.fintype === current);
            });
        }
    }

    /* ── LEGEND HOVER (grouped highlight, DOM-driven) ─────────────────── */
    //
    // Plot hover is left 100% to Highcharts (states.inactive) so hovering a bar
    // or line focuses exactly that one series. The ONLY custom highlight is for
    // the combined legend, driven off the legend DOM — never by overriding
    // setState, which previously hijacked plot hover and greyed everything out:
    //   • hover a product NAME in the group header → highlight that whole stack
    //   • hover a MEMBER item                       → highlight that member in all 3 stacks

    function bindLegendHover() {
        // Flag lives on the container DOM (which survives chart rebuilds) so the
        // listeners are attached once even though bindLegendHover runs on every
        // chart load. The handlers read the module `chart`, so they stay current.
        if (chart.container._finLegendHoverBound) return;
        chart.container._finLegendHoverBound = true;

        // Dim/restore by setting the series' SVG group opacity directly (the
        // native inactive state is disabled so plot hover stays clean). This is
        // the same approach as the full-custom legend (MSL-1).
        var DIM = 0.18;
        function setOpacity(s, v) {
            ['group', 'markerGroup', 'dataLabelsGroup'].forEach(function (g) {
                if (s[g]) s[g].attr({ opacity: v });
            });
        }
        function highlight(match) {
            chart.series.forEach(function (s) {
                var c = s.options.custom || {};
                if (c.isDivider || c.isGroupHeader || c.isDummy) return;
                setOpacity(s, match(c) ? 1 : DIM);
            });
        }
        function clearAll() {
            chart.series.forEach(function (s) {
                var c = s.options.custom || {};
                if (c.isDivider || c.isGroupHeader || c.isDummy) return;
                setOpacity(s, 1);
            });
        }

        chart.container.addEventListener('mouseover', function (e) {
            var grp = e.target.closest('.fin-group-item');
            if (grp) {
                var gid = grp.getAttribute('id');
                highlight(function (c) { return c.groupId === gid; });
                return;
            }
            var mem = e.target.closest('.fin-member-item');
            if (mem) {
                var key = (mem.getAttribute('data-key') || mem.textContent || '').trim();
                highlight(function (c) { return c.sharedLegendKey === key; });
            }
        });
        chart.container.addEventListener('mouseout', function (e) {
            if (e.target.closest('.fin-group-item') || e.target.closest('.fin-member-item')) clearAll();
        });
    }

    /* ── CHART CONFIG ─────────────────────────────────────────────────── */

    function createChart() {
        chart = Highcharts.chart('fin-chart', {
            chart: {
                type: 'column',
                height: 560,
                // width stays null (responsive); the Allow-Scroll switch turns on
                // scrollablePlotArea (applyScroll) which pins both y-axes and
                // scrolls only the plot + x-axis.
                width: null,
                backgroundColor: '#ffffff',
                marginBottom: 130,
                style: { fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
                zooming: { type: 'x' },
                plotBackgroundColor: 'rgba(0,0,0,0)',
                // When scroll is on, the plot is forced to SCROLL_WIDTH and only
                // the plot + x-axis scroll — both y-axes stay pinned.
                scrollablePlotArea: allowScroll
                    ? { minWidth: SCROLL_WIDTH, scrollPositionX: 0 }
                    : undefined,
                events: {
                    load: function () {
                        // `this` is the chart; module `chart` isn't assigned
                        // until the constructor returns, so set it here for the
                        // helpers that read it during initial load.
                        chart = this;
                        drawForecastDivider();
                        attachLabelHandlers();
                        applyLabelStyles();
                        bindLegendHover();
                    },
                    redraw: function () {
                        chart = this;
                        drawForecastDivider();
                        setTimeout(function () {
                            if (!chart) return;
                            attachLabelHandlers();
                            applyLabelStyles();
                        }, 50);
                    },
                    selection: handleDragSelect,
                    click: handleBackgroundClick
                }
            },

            title: {
                text: 'Final Version — Combined Chart',
                style: { fontSize: '15px', fontWeight: '600', color: '#16191d' }
            },
            subtitle: {
                text: 'Past actuals → forecast, divider at the current month &nbsp;|&nbsp; ' +
                    'Bar · 3× Stacked Bar · Line · Area &nbsp;|&nbsp; right-click to change type · drag/click/keyboard to select',
                useHTML: true
            },

            xAxis: {
                categories: CATEGORIES,
                crosshair: { width: 1, color: '#aaa', dashStyle: 'Dash' },
                tickmarkPlacement: 'on',
                tickWidth: 1, tickLength: 6, tickColor: '#333',
                lineColor: '#9aa0a8',
                labels: { style: { fontSize: currentFontSize, fontWeight: currentFontWeight, color: '#333333' } }
            },

            yAxis: [
                {
                    title: { text: 'Value ($k)' },
                    min: 0,
                    labels: {
                        format: '{value}k',
                        style: { fontSize: currentFontSize, fontWeight: currentFontWeight, color: '#6b7079' }
                    },
                    gridLineColor: '#ededf0',
                    stackLabels: {
                        enabled: false
                    }
                },
                {
                    title: { text: 'Volume (units)' },
                    min: 0,
                    opposite: true,
                    gridLineWidth: 0,
                    labels: { style: { fontSize: currentFontSize, fontWeight: currentFontWeight, color: '#6b7079' } }
                }
            ],

            legend: {
                enabled: true,
                useHTML: true,
                layout: 'horizontal',
                align: 'left',
                verticalAlign: 'bottom',
                alignColumns: false,
                maxHeight: 88,
                navigation: {
                    activeColor: '#2563eb',
                    inactiveColor: '#ccc',
                    arrowSize: 12,
                    animation: true,
                    style: { fontWeight: 'bold', color: '#333', fontSize: '12px' }
                },
                padding: 8,
                itemMarginTop: 4,
                itemMarginBottom: 4,
                itemDistance: 14,
                symbolWidth: 0,
                symbolHeight: 0,
                symbolPadding: 0,
                itemStyle: {
                    fontWeight: 'normal', fontSize: '12px', color: '#16191d', cursor: 'pointer',
                    textOverflow: 'none', whiteSpace: 'nowrap'
                },
                labelFormatter: legendLabelFormatter
            },

            tooltip: {
                // shared:false → hovering shows ONLY the series/point under the
                // cursor, not a batched snapshot of every series at that month.
                shared: false,
                useHTML: true,
                headerFormat: '<span style="font-size:11px;color:#6b7079">{point.key}</span><br/>',
                pointFormat:
                    '<span style="display:inline-flex;align-items:center;gap:6px">' +
                    '<span style="width:9px;height:9px;border-radius:2px;background:{series.color};display:inline-block"></span>' +
                    '<span>{series.name}: <b>{point.y}</b></span></span>',
                style: { fontSize: '12px' }
            },

            plotOptions: {
                column: {
                    grouping: true,
                    stacking: 'normal',
                    borderRadius: 1,
                    groupPadding: 0.12,
                    pointPadding: 0.02,
                    maxPointWidth: 26,
                    states: { hover: { brightness: 0 } } // no per-bar emphasis on mouse hover
                },
                area: { fillOpacity: 0.18, marker: { enabled: false }, lineWidth: 2 },
                line: { marker: { enabled: false }, lineWidth: 2 },
                series: {
                    allowPointSelect: false,
                    states: {
                        // Mouse hover over the plot must NOT dim/focus anything —
                        // it made the chart hard to read. Highlighting is driven
                        // ONLY by legend hover (bindLegendHover, via group opacity).
                        inactive: { enabled: false },
                        hover: { halo: { size: 0 } }
                    },
                    point: {
                        events: {
                            click: handlePointClick,
                            mouseOver: handlePointMouseOver
                        }
                    }
                }
            },

            credits: { enabled: false },

            accessibility: {
                enabled: true,
                landmarkVerbosity: 'disabled',
                screenReaderSection: { beforeChartFormat: '', afterChartFormat: '' },
                series: { describeSingleSeries: false },
                keyboardNavigation: { enabled: true, order: ['series'], seriesNavigation: { mode: 'normal' } },
                point: { valueDescriptionFormat: '{point.category}, {series.name}: {point.y}' }
            },

            series: buildSeries()
        });

        window.finalChart = chart;

        // Background-margin click clears selection (mirrors CMB-1).
        // Bound once per container (survives chart rebuilds); reads module `chart`.
        if (!chart.container._finMarginClickBound) {
            chart.container._finMarginClickBound = true;
            chart.container.addEventListener('click', function (e) {
                if (!chart) return;
                var t = e.target;
                while (t && t !== chart.container) {
                    if (t.classList && t.classList.contains('highcharts-axis-labels')) return;
                    t = t.parentNode;
                }
                var box = chart.plotBox;
                var off = chart.container.getBoundingClientRect();
                var x = e.clientX - off.left, y = e.clientY - off.top;
                var inside = x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
                if (!inside) clearSelection();
            });
        }
    }

    /* ── INIT ─────────────────────────────────────────────────────────── */

    window.initFinalVersionChart = function () {
        var wrapper = document.getElementById('final-version');
        wrapper.addEventListener('keydown', function (e) {
            if (e.key === ' ' || e.key === 'Enter') isKeyboardInteraction = true;
            if (e.key === 'Escape') clearSelection();
        }, true);

        buildToolbar();
        createChart();
        wireContextMenu();
        updateDetailPanel();
    };
})();
