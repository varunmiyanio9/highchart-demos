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
//
// CUSTOM-vs-NATIVE QUICK REFERENCE  (so future readers can cherry-pick features)
// -----------------------------------------------------------------------------
// Each feature notes the NATIVE Highcharts options that power it and the CUSTOM
// code layered on top. To DROP a feature: remove its custom code and reset the
// listed native flags to their defaults. To REUSE one elsewhere: copy the named
// function(s) plus the native flags listed.
//
//  • Combined grouped legend
//      NATIVE : legend.useHTML:true + legend.labelFormatter; symbolWidth/
//               symbolHeight/symbolPadding:0 (hide the native colour swatches).
//      CUSTOM : legendLabelFormatter() renders the HTML rows. Every series
//               carries a `custom.*` tag (isMember/isGroupHeader/isBar/…) so the
//               formatter and click/hover handlers know each item's role.
//
//  • Member toggle — one legend click hides a member across ALL 3 stacks
//      NATIVE : legend.events.itemClick (this is where HC's default toggle lives).
//      CUSTOM : handleLegendItemClick() calls e.preventDefault() to suppress the
//               native single-series toggle, then setVisible()s every series that
//               shares `custom.sharedLegendKey`.
//
//  • Group-name toggle — click a product NAME to hide/show its whole stack
//      NATIVE : none possible — all 3 names live inside ONE legend item, so HC
//               can't tell which name was clicked.
//      CUSTOM : DOM click on `.fin-group-item` → toggleGroup(); strike-through
//               via applyGroupHiddenStyles() (re-applied on every redraw).
//
//  • Legend hover highlight (group / member / single series)
//      NATIVE? : Highcharts DOES dim-others-on-legend-hover out of the box, but
//               it's the SAME switch as plot-hover dimming
//               (plotOptions.series.states.inactive). We keep that DISABLED
//               (enabled:false) so PLOT hover stays clean — which means legend
//               hover is hand-rolled here by deliberate choice, not oversight.
//      CUSTOM : bindLegendInteractions() dims series SVG-group opacity while
//               hovering ANY legend entry. Group/member rows match by custom tag;
//               single series (Revenue/Run Rate/Trend/Volume) match by NAME via
//               textContent — NOT a data-* attribute, because Highcharts' useHTML
//               AST sanitizer strips unknown attributes (only id/class/style/… ).
//
//  • Category selection (drag / click / keyboard)
//      NATIVE : chart.zooming.type:'x' (drag rubber-band → selection event) +
//               accessibility keyboard navigation (Space/Enter fire point click).
//      CUSTOM : x-axis plot bands for the highlight, tick-label click handlers,
//               and the selectedCategories Set (see SELECTION section).
//
//  • Context menu — right-click to change chart type
//      NATIVE : the exporting module is NOT loaded, so there is no native menu.
//      CUSTOM : wireContextMenu() builds a flat DOM menu → series.update({type}).
//
//  • Forecast divider (vertical line at the current month)
//      NATIVE : chart.renderer (raw SVG primitives) — NOT a plotLine, so we can
//               control its zIndex.
//      CUSTOM : drawForecastDivider() draws a path + callout at a LOW zIndex so
//               it sits BEHIND the bars.
//
//  • Allow-scroll switch
//      NATIVE : chart.scrollablePlotArea.minWidth (pins both y-axes, scrolls the
//               plot + x-axis).
//      CUSTOM : applyScroll() rebuilds the chart to flip it on/off, plus dashed
//               edge indicators when the divider scrolls off-screen.
// -----------------------------------------------------------------------------

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

    var DUMMY_LEGEND_COUNT = 100; // extra legend items — enough to overflow 2 rows
    //                               and force NATIVE Highcharts pagination (the
    //                               legend only paginates when content exceeds the
    //                               2-row maxHeight cap; see legend config).
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
    var edgeLeft = null, edgeRight = null;    // scroll-aware dashed edge indicators (DOM)
    var selectedCategories = new Set();
    var currentFontSize = '12px';
    var currentFontWeight = 'normal';
    var allowScroll = false;
    var shiftKeyDown = false;
    var isKeyboardInteraction = false;

    document.addEventListener('keydown', function (e) { if (e.key === 'Shift') shiftKeyDown = true; });
    document.addEventListener('keyup', function (e) { if (e.key === 'Shift') shiftKeyDown = false; });

    var STACKED_ICON = '<i class="fa-solid fa-chart-column"></i>';

    /* ── SERIES BUILDER ───────────────────────────────────────────────────
       Builds every series def. The KEY CUSTOM CONVENTION used throughout this
       file: each series carries a `custom: {…}` bag tagging its ROLE
       (isMember / isGroupHeader / isBar / isLine / isArea / isDivider / isDummy)
       plus any data the handlers need (sharedLegendKey, groupId, colours). This
       is a native Highcharts passthrough (options.custom) — Highcharts ignores
       it, but our legendLabelFormatter, click/hover handlers and context menu
       all branch on these tags instead of fragile name/index matching.
       Two presentation-only tricks: group-header series use data:[] +
       color:'transparent' purely to own a legend slot; the divider series is an
       empty line whose only job is a visual separator legend entry. */

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
                // Group header is presentation only — the legend's itemClick
                // handler preventDefaults clicks on it (see legend.events.itemClick).
                custom: { isGroupHeader: true, groupId: g.id }
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
                    // Toggling this member toggles the same member across all
                    // three stacks at once — handled centrally in
                    // legend.events.itemClick (keyed off sharedLegendKey).
                    custom: {
                        isMember: true,
                        groupId: g.id,
                        sharedLegendKey: m.key,
                        memberColor: m.color
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
            // Presentation only — never toggles (see legend.events.itemClick).
            custom: { isDivider: true }
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

    /* ── LEGEND LABEL FORMATTER (combined grouped presentation) ───────────
       FEATURE : the whole custom legend look — grouped product header, coloured
                 member chips, line/area swatches, a thin divider, greyed dummies.
       NATIVE  : legend.useHTML:true lets us return HTML per item; we also set
                 legend.symbolWidth/symbolHeight/symbolPadding:0 to REMOVE the
                 native colour symbol (we draw our own swatch inside the HTML).
       CUSTOM  : this formatter returns a different HTML fragment per `custom.*`
                 role tag. The group-header fragment emits three `.fin-group-item`
                 elements (id = group id) that the hover/click handlers target. */

    function legendLabelFormatter() {
        var custom = (this.options && this.options.custom) || {};

        if (custom.isDivider) {
            return '<span style="display:inline-block;width:1px;height:14px;background:#d4d4d8;' +
                'vertical-align:middle;pointer-events:none;" tabindex="-1" aria-hidden="true"></span>';
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

        // Single real series (bar / line / area). The `fin-series-item` class lets
        // bindLegendInteractions hover-highlight just this one series (dim the
        // rest) — the same effect the group/member rows get. We match it back to
        // its series by NAME (the text content), NOT a data-* attribute: Highcharts'
        // useHTML AST sanitizer strips unknown attributes (only id/class/style/…
        // survive), so data-series-id would never reach the DOM. The visible name
        // is unique per series here, so textContent → series.name is reliable.
        if (custom.isLine) {
            return '<div class="fin-series-item" style="display:flex;align-items:center;gap:5px;">' +
                '<span style="display:inline-block;width:20px;height:3px;background:' +
                custom.lineColor + ';border-radius:1px;flex-shrink:0;"></span>' +
                '<span style="font-size:11.5px;">' + this.name + '</span></div>';
        }

        if (custom.isArea) {
            return '<div class="fin-series-item" style="display:flex;align-items:center;gap:5px;">' +
                '<span style="display:inline-block;width:14px;height:11px;background:' +
                custom.areaColor + ';opacity:0.55;border-radius:1px;flex-shrink:0;"></span>' +
                '<span style="font-size:11.5px;">' + this.name + '</span></div>';
        }

        if (custom.isBar) {
            return '<div class="fin-series-item" style="display:flex;align-items:center;gap:4px;">' + STACKED_ICON +
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

    /* ── LEGEND CLICK — MEMBER TOGGLE (native item click) ─────────────────
       FEATURE : clicking ONE member row hides/shows that member in all 3 stacks.
       NATIVE  : legend.events.itemClick — this is where Highcharts attaches its
                 DEFAULT single-series visibility toggle (the `i` default fn it
                 fires here). NOTE: series.events.legendItemClick is fired too,
                 but AFTER, with NO default fn — so preventDefault there is a
                 no-op and CANNOT stop the toggle. That was the original bug:
                 hide worked, show-again didn't, because the native toggle flipped
                 the clicked series first and desynced the three stacks.
       CUSTOM  : preventDefault() here (where it DOES gate the native toggle),
                 then setVisible() every series sharing custom.sharedLegendKey.
       TOGGLE RULE (shared with toggleGroup): if EVERYTHING this entry controls
                 is already hidden → show it all; otherwise → hide it all. This
                 matches the legend item's greyed/active look (active ⇒ next click
                 hides). Presentation-only entries (group header, divider) are
                 simply preventDefault'd so they never toggle anything. */

    function handleLegendItemClick(e) {
        var series = e.legendItem;
        var custom = (series && series.options && series.options.custom) || {};

        // Presentation-only entries (group header, divider) never toggle.
        if (custom.isGroupHeader || custom.isDivider) {
            e.preventDefault();
            return;
        }

        // Combined member: toggle this member across ALL three stacks together.
        if (custom.isMember) {
            e.preventDefault();
            var key = custom.sharedLegendKey;
            var related = chart.series.filter(function (s) {
                return s.options.custom && s.options.custom.sharedLegendKey === key;
            });
            var makeVisible = related.every(function (s) { return !s.visible; });
            related.forEach(function (s) { s.setVisible(makeVisible, false); });
            chart.redraw();
            return;
        }

        // Real bar / line / area / dummy items: let the native toggle run.
    }

    /* ── LEGEND CLICK — GROUP-NAME TOGGLE (custom, DOM-driven) ─────────────
       FEATURE : clicking a product NAME (Product-1/2/3) in the combined header
                 hides/shows that product's ENTIRE stack, and strikes the name.
       WHY CUSTOM (no native path) : all three names render inside ONE legend
                 item (the FIRST_GROUP header series). Highcharts' itemClick only
                 knows that single item — it cannot tell which of the three names
                 was clicked. So the click is caught on the DOM instead
                 (bindLegendInteractions → toggleGroup), the same `.fin-group-item`
                 elements the hover-highlight already uses.
       The two functions below are deliberately isolated so this feature can be
       lifted out wholesale: bindLegendInteractions wires the click,
       toggleGroup() flips visibility, applyGroupHiddenStyles() paints the state.

       toggleGroup — hide/show every member series in one product stack.
       Uses the SAME toggle rule as the member toggle above. */
    function toggleGroup(groupId) {
        if (!chart) return;
        var members = chart.series.filter(function (s) {
            var c = s.options.custom;
            return c && c.isMember && c.groupId === groupId;
        });
        if (!members.length) return;
        // If the whole group is already hidden → show it; otherwise hide it all.
        var makeVisible = members.every(function (s) { return !s.visible; });
        members.forEach(function (s) { s.setVisible(makeVisible, false); });
        chart.redraw(); // the redraw handler calls applyGroupHiddenStyles()
    }

    // Sync the struck-through `.fin-group-hidden` class to the live visibility of
    // each group. Highcharts does NOT grey these names natively (they belong to a
    // header series we never toggle), so we paint the state by hand. Re-run on
    // every redraw because useHTML legend labels may be re-rendered fresh.
    function applyGroupHiddenStyles() {
        if (!chart) return;
        GROUPS.forEach(function (g) {
            var members = chart.series.filter(function (s) {
                var c = s.options.custom;
                return c && c.isMember && c.groupId === g.id;
            });
            var hidden = members.length > 0 &&
                members.every(function (s) { return !s.visible; });
            var el = chart.container.querySelector('.fin-group-item[id="' + g.id + '"]');
            if (el) el.classList.toggle('fin-group-hidden', hidden);
        });
    }

    /* ── FORECAST DIVIDER (renderer line drawn BEHIND the bars) ───────────
       FEATURE : a vertical marker at the current month + hover callout naming
                 the forecast start.
       NATIVE  : chart.renderer — raw SVG primitives (path + label). We do NOT
                 use xAxis.plotLines here ON PURPOSE: a plotLine can't be pushed
                 below the column series, but a renderer path can via zIndex.
       CUSTOM  : drawForecastDivider() draws/repositions the path at zIndex 2
                 (below the series group at 3, above gridlines at 1) so it reads
                 as sitting BEHIND the bars; hover swaps stroke width + callout.
                 The elements are module-level (fcLine/fcTip) so we reposition
                 instead of recreating on every redraw. */

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
        updateEdgeIndicators();
        setTimeout(function () { if (chart) { applyLabelStyles(); attachLabelHandlers(); } }, 50);
        updateDetailPanel();
    }

    /* ── SCROLL-AWARE FORECAST EDGE INDICATORS ───────────────────────────
       With "Allow Scroll" on, the solid forecast divider lives inside the
       scrolling plot and can be scrolled out of the visible window. When it
       leaves the viewport we pin a DASHED line to the edge it exited, so the
       user always knows which side of the forecast boundary they're viewing:
         • divider scrolled off the LEFT  → only FUTURE is visible → left edge
         • divider scrolled off the RIGHT → only PAST   is visible → right edge
       The real solid divider stays the single source of truth — the dashed
       edge line is hidden the moment it scrolls back into view, or whenever
       scrolling is off. Same renderer-edge idea as FC-9, but dashed and only
       shown when the divider is off screen. */

    function scrollContainer() {
        // scrollablePlotArea (Allow Scroll = on) renders the wide plot inside a
        // .highcharts-scrolling div; that div — not the page — is what scrolls.
        // Note: the scroller WRAPS chart.container, so it isn't a descendant of
        // it — query from renderTo (#fin-chart), the outer element we mount into.
        var root = chart && (chart.renderTo || (chart.container && chart.container.parentNode));
        return root ? root.querySelector('.highcharts-scrolling') : null;
    }

    function buildEdgeIndicator(side) {
        var el = document.createElement('div');
        el.className = 'fin-edge fin-edge-' + side;
        var label = document.createElement('span');
        label.className = 'fin-edge-label';
        label.textContent = side === 'left'
            ? 'Forecast ▸ future only'   // ▸ — divider is off to the left
            : '◂ past only';             // ◂ — divider is off to the right
        el.appendChild(label);
        el.style.display = 'none';
        return el;
    }

    function ensureEdgeIndicators() {
        var wrap = document.getElementById('fin-scroll-wrap');
        if (!wrap) return;
        // Built once and parked on the wrapper, which survives chart rebuilds
        // (the Allow-Scroll toggle destroys/recreates the chart, not the wrap).
        if (!wrap._finEdgeBuilt) {
            wrap._finEdgeBuilt = true;
            edgeLeft = buildEdgeIndicator('left');
            edgeRight = buildEdgeIndicator('right');
            wrap.appendChild(edgeLeft);
            wrap.appendChild(edgeRight);
        } else {
            edgeLeft = wrap.querySelector('.fin-edge-left');
            edgeRight = wrap.querySelector('.fin-edge-right');
        }
    }

    function bindScrollIndicator() {
        // Bind on the WRAPPER (never destroyed), not the inner .highcharts-scrolling
        // (which Highcharts creates AFTER the load event and recreates on every
        // rebuild — binding to it there races and silently misses). Capture phase
        // catches the inner scroll even though scroll events don't bubble, so one
        // listener on the stable wrapper covers every rebuild with no timing risk.
        var wrap = document.getElementById('fin-scroll-wrap');
        if (wrap && !wrap._finScrollBound) {
            wrap._finScrollBound = true;
            wrap.addEventListener('scroll', updateEdgeIndicators, true);
        }
    }

    function updateEdgeIndicators() {
        if (!chart) return;
        ensureEdgeIndicators();
        if (!edgeLeft || !edgeRight) return;

        var sc = scrollContainer();
        // Scrolling off, or content fits with no scroller → the divider is
        // always on screen, so neither edge hint applies.
        if (!allowScroll || !sc) {
            edgeLeft.style.display = 'none';
            edgeRight.style.display = 'none';
            return;
        }

        var dividerX = forecastX();      // divider x in full (pre-scroll) SVG coords
        // With scrollablePlotArea, chart.plotWidth is the FULL scrollable plot
        // width while chart.chartWidth stays at the container width — so the full
        // rendered width comes from the scroller (sc.scrollWidth), and the pinned
        // right y-axis band is whatever's left of it past the plot.
        var rightAxisW = sc.scrollWidth - chart.plotLeft - chart.plotWidth;
        // Visible plot window in full-SVG coords. The pinned y-axes cover plotLeft
        // px on the left of the viewport and rightAxisW px on the right.
        var visibleLeft = sc.scrollLeft + chart.plotLeft;
        var visibleRight = sc.scrollLeft + sc.clientWidth - rightAxisW;

        function place(el, viewportX) {
            el.style.top = chart.plotTop + 'px';
            el.style.height = chart.plotHeight + 'px';
            el.style.left = viewportX + 'px';
            el.style.display = 'block';
        }

        if (dividerX < visibleLeft) {
            // Divider is left of the window → everything visible is future.
            place(edgeLeft, chart.plotLeft);
            edgeRight.style.display = 'none';
        } else if (dividerX > visibleRight) {
            // Divider is right of the window → everything visible is past.
            place(edgeRight, sc.clientWidth - rightAxisW);
            edgeLeft.style.display = 'none';
        } else {
            // Real solid divider is on screen → no edge hint needed.
            edgeLeft.style.display = 'none';
            edgeRight.style.display = 'none';
        }
    }

    /* ── SELECTION (mouse + keyboard, single chart) ───────────────────────
       FEATURE : select month categories by clicking an x-axis label, click-drag
                 across the plot, shift-hover a range, or keyboard (Space/Enter on
                 a point, Escape to clear). Selected months feed the detail panel.
       NATIVE  : chart.zooming.type:'x' turns drag into a `selection` event
                 (handleDragSelect); accessibility keyboardNavigation makes
                 Space/Enter fire a point `click` (handlePointClick); chart-level
                 `click` gives us background clicks (handleBackgroundClick).
       CUSTOM  : the selectedCategories Set is the source of truth; x-axis
                 plotBands draw the highlight; an SVG <filter> (#fin-label-bg)
                 tints the selected tick labels; tick-label handlers are
                 (re)attached after redraws with a dedupe guard (_finBound). */

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

    // Fired by chart.events.click. NOTE: this also fires when the legend is
    // activated by KEYBOARD — pressing Space/Enter on a focused legend a11y
    // proxy <button> dispatches a native DOM click that bubbles to the chart
    // container; Highcharts' onContainerClick then fires chart 'click' with axis
    // coordinates taken from the legend item's on-screen x. Without the guard
    // below that would select whatever category sits under the toggled legend
    // item. A genuine plot/background click never originates from the legend, so
    // bail when the click's target is inside the legend or its proxy group.
    function handleBackgroundClick(e) {
        var t = e.target;
        if (t && t.closest &&
            t.closest('.highcharts-legend, .highcharts-a11y-proxy-group-legend')) return;
        if (!e.xAxis) { clearSelection(); return; }
        var xValue = Math.round(e.xAxis[0].value);
        if (xValue < 0 || xValue >= CATEGORIES.length) { clearSelection(); return; }
        selectCategory(xValue, e.ctrlKey || e.metaKey);
    }

    /* ── DETAIL PANEL ─────────────────────────────────────────────────────
       Pure custom DOM (no Highcharts involvement): renders a table of the
       selected months into #fin-content, sourced from the precomputed data and
       the selectedCategories Set. Nothing here to toggle on the chart side. */

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

    /* ── TOOLBAR (font size, font weight, allow-scroll switch) ────────────
       Custom DOM controls in #fin-toolbar. Their effects reach the chart through
       NATIVE APIs: font controls → xAxis/yAxis.update({labels.style}); current
       month → moves the forecast divider; allow-scroll → flips
       chart.scrollablePlotArea (via applyScroll rebuild). The toolbar itself is
       all custom; the chart-side effects are all native option updates. */

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

    /* ── CONTEXT MENU (flat: Line / Bar / Area / Stacked Bar) ─────────────
       FEATURE : right-click the chart → flat menu → change chart type. Right-
                 clicking ON a series targets just it; right-clicking elsewhere
                 targets all real series.
       NATIVE  : NONE — the exporting module is intentionally NOT loaded, so
                 Highcharts has no built-in right-click menu to compete with.
                 The type change itself uses native series.update({type,stacking}).
       CUSTOM  : wireContextMenu() owns a DOM menu (#fin-ctx-menu), a contextmenu
                 listener that preventDefaults the browser menu, and a hover/
                 inactive "lock" (via Series.prototype.setState) to spotlight the
                 targeted series while the menu is open. isRealSeries() filters out
                 the presentation-only series (divider/header/dummy). */

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

    /* ── LEGEND INTERACTIONS — DOM-driven (hover highlight + group click) ──
       FEATURE : (a) hovering ANY legend entry highlights its series and dims the
                 rest — a group NAME → that whole stack, a MEMBER row → that
                 member across all 3 stacks, a single series (Revenue / Run Rate /
                 Trend / Volume) → just that series; (b) clicking a product NAME
                 toggles that whole stack.
       NATIVE  : plotOptions.series.states.inactive.enabled:false — we DISABLE the
                 built-in hover-dimming so that PLOT hover never greys the chart;
                 highlighting is driven ONLY from the legend, by hand.
       CUSTOM  : one delegated mouseover/mouseout/click listener on the chart
                 container (which survives chart rebuilds), acting on the
                 `.fin-group-item` / `.fin-member-item` / `.fin-series-item`
                 elements emitted by legendLabelFormatter().
       WHY DOM (not Highcharts events) : the combined header packs all three
                 product names into ONE legend item, so Highcharts' own
                 hover/click events can't address an individual name — the DOM can.
                 We route the single-series hover through the same path for one
                 consistent highlight mechanism across every legend shape.
       MATCHING: group → custom.groupId (via element id), member → sharedLegendKey
                 (via textContent), single series → series.name (via textContent).
                 We match members & single series by their VISIBLE TEXT, not a
                 data-* attribute, because useHTML strips unknown attributes.
       NOTE: member CLICK toggling is handled natively in handleLegendItemClick
                 (one member row == one legend item); only the GROUP-name click
                 needs this DOM path. */

    function bindLegendInteractions() {
        // Flag lives on the container DOM (which survives chart rebuilds) so the
        // listeners are attached once even though this runs on every chart load.
        // The handlers read the module `chart`, so they stay current.
        if (chart.container._finLegendBound) return;
        chart.container._finLegendBound = true;

        // Dim/restore by setting the series' SVG group opacity directly (the
        // native inactive state is disabled so plot hover stays clean). This is
        // the same approach as the full-custom legend (MSL-1).
        var DIM = 0.18;
        function setOpacity(s, v) {
            ['group', 'markerGroup', 'dataLabelsGroup'].forEach(function (g) {
                if (s[g]) s[g].attr({ opacity: v });
            });
        }
        // `match` receives (series, custom) so callers can key off either the
        // custom role tags (group/member) or the series itself (single series).
        function highlight(match) {
            chart.series.forEach(function (s) {
                var c = s.options.custom || {};
                if (c.isDivider || c.isGroupHeader || c.isDummy) return;
                setOpacity(s, match(s, c) ? 1 : DIM);
            });
        }
        function clearAll() {
            chart.series.forEach(function (s) {
                var c = s.options.custom || {};
                if (c.isDivider || c.isGroupHeader || c.isDummy) return;
                setOpacity(s, 1);
            });
        }

        // ── Hover highlight ──
        // Three legend shapes can be hovered: a group NAME (highlight that whole
        // stack), a MEMBER row (that member across all 3 stacks), or a single
        // real series — Revenue / Run Rate / Trend / Volume — (just that series).
        chart.container.addEventListener('mouseover', function (e) {
            var grp = e.target.closest('.fin-group-item');
            if (grp) {
                var gid = grp.getAttribute('id');
                highlight(function (s, c) { return c.groupId === gid; });
                return;
            }
            var mem = e.target.closest('.fin-member-item');
            if (mem) {
                var key = (mem.getAttribute('data-key') || mem.textContent || '').trim();
                highlight(function (s, c) { return c.sharedLegendKey === key; });
                return;
            }
            var ser = e.target.closest('.fin-series-item');
            if (ser) {
                // Match by visible name (textContent) — see the formatter note:
                // useHTML strips data-* attributes, so we can't tag the id.
                var name = (ser.textContent || '').trim();
                highlight(function (s) { return s.name === name; });
            }
        });
        chart.container.addEventListener('mouseout', function (e) {
            if (e.target.closest('.fin-group-item') ||
                e.target.closest('.fin-member-item') ||
                e.target.closest('.fin-series-item')) clearAll();
        });

        // ── Group-name click toggle ──
        // (handleLegendItemClick already preventDefault'd the native item toggle
        // for the header series, so this is the ONLY effect of the click.)
        chart.container.addEventListener('click', function (e) {
            var grp = e.target.closest('.fin-group-item');
            if (grp) toggleGroup(grp.getAttribute('id'));
        });
    }

    /* ── LEGEND KEYBOARD NAV — skip the blank divider slot ─────────────────
       FEATURE : when arrow-keying through the legend (native a11y keyboard
                 navigation, order:['series','legend']), do NOT stop on the
                 zero-width divider legend item — there's nothing to toggle or
                 read there, so focusing it is confusing.
       WHY NOT aria-hidden / tabindex (the "standard HTML" way) : it can't reach
                 the right element. Highcharts' accessibility module does NOT
                 focus our legend HTML (the divider <span> from
                 legendLabelFormatter). It builds a PARALLEL set of proxy
                 <button> elements — one per legend item — and moves keyboard
                 focus through those. So aria-hidden/tabindex on the span is a
                 no-op for legend nav. And even hiding the proxy doesn't help:
                 arrow nav walks chart.legend.allItems by ONE linear index and
                 highlightLegendItem(ix) returns true for the divider just
                 because the item EXISTS — so the keypress is consumed on the
                 divider index (focus stalls) instead of skipping. This version
                 has no native per-item "skip" option.
       CUSTOM  : shadow chart.highlightLegendItem on THIS instance so a request
                 to land on a skippable item hops to the next real item in the
                 travel direction, and re-sync the legend component's internal
                 index so the next arrow press continues from the right place.
                 Instance-only shadow → other charts/pages are untouched, and a
                 fresh chart (the Allow-Scroll rebuild) re-applies it on load.
       SCOPE   : only the divider is skipped. The product-group header stays
                 focusable — it's a legitimate first stop and screen readers
                 announce the product names there. */

    function isLegendKeyboardSkippable(item) {
        var c = item && item.options && item.options.custom;
        return !!(c && c.isDivider); // only the blank separator slot
    }

    function restrictLegendKeyboardNav() {
        // Guard: a fresh chart instance has no own `highlightLegendItem` yet, so
        // the first read resolves to the pristine prototype impl. The flag stops
        // us from wrapping our own shadow on a re-call within the same instance.
        if (!chart || chart._finLegendKbdPatched) return;
        var original = chart.highlightLegendItem;
        if (typeof original !== 'function') return; // older lib w/o legend a11y
        chart._finLegendKbdPatched = true;

        chart.highlightLegendItem = function (ix) {
            var items = this.legend.allItems;
            var comp = this.accessibility && this.accessibility.components &&
                this.accessibility.components.legend;
            // The arrow handler always requests (currentIx ± 1), so the sign of
            // (ix - currentIx) tells us which way the user is travelling.
            var curIx = comp ? comp.highlightedLegendItemIx : -1;
            var dir = (ix - curIx) >= 0 ? 1 : -1;

            var k = ix;
            while (items[k] && isLegendKeyboardSkippable(items[k])) { k += dir; }
            if (!items[k]) return false; // ran off the end → let wrap-around handle it

            var res = original.call(this, k);
            // If we hopped, the arrow handler will still do
            // `highlightedLegendItemIx += dir` after we return — pre-subtract so
            // it lands exactly on k. (No-op when k === ix, the common case.)
            if (res && comp && k !== ix) comp.highlightedLegendItemIx = k - dir;
            return res;
        };
    }

    /* ── CHART CONFIG ─────────────────────────────────────────────────────
       The native-flag hub. The options that ENABLE each custom feature live
       here — flip these to turn features off:
         • legend.useHTML + symbolWidth/Height/Padding:0  → custom HTML legend
         • legend.events.itemClick                        → member toggle hook
         • plotOptions.series.states.inactive.enabled:false → custom-only hover
         • chart.zooming.type:'x' + chart.events.selection → drag selection
         • chart.events.click                             → background-click select
         • chart.scrollablePlotArea (set in applyScroll)  → allow-scroll
         • accessibility.keyboardNavigation               → keyboard selection
         • plotOptions.column.stacking:'normal'           → the stacked towers
       chart.events.load/redraw re-run our renderer/label/legend painters that
       Highcharts can't know about. */

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
                // NO fixed marginBottom — let Highcharts auto-size the bottom
                // margin (default behaviour, same as MHC-1). A hardcoded
                // marginBottom makes HC stop reserving room for the bottom legend,
                // so the (now 2-row + pager) legend overlaps the x-axis labels.
                // Auto = axis-labels height + legend height + spacing → clean gap.
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
                        bindLegendInteractions();   // hover highlight + group-name click toggle
                        restrictLegendKeyboardNav(); // arrow-key nav hops over the divider slot
                        applyGroupHiddenStyles();   // paint any pre-hidden group names
                        bindScrollIndicator();
                        updateEdgeIndicators();
                        // .highcharts-scrolling is created just after load, so set
                        // the initial edge state once it exists (e.g. starting
                        // scrolled to the past shows the right-edge hint right away).
                        setTimeout(function () { updateEdgeIndicators(); }, 60);
                    },
                    redraw: function () {
                        chart = this;
                        drawForecastDivider();
                        // Re-apply the group-name strike-through: useHTML legend
                        // labels may be re-rendered fresh on redraw, dropping the
                        // class — so we re-sync it to live series visibility here.
                        applyGroupHiddenStyles();
                        bindScrollIndicator();
                        updateEdgeIndicators();
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
                // NATIVE pagination — fully Highcharts, no custom code:
                //   maxHeight caps the legend box. Highcharts only paginates when
                //   the legend's NATURAL height exceeds this cap; once it does, it
                //   clips to the rows that fit and renders its own pager arrows
                //   (legend.navigation below). The cap + row metrics here are copied
                //   from MHC-1 so the cutoff lands on 2 visible rows, then "1/N".
                //   IMPORTANT: this only kicks in when there are ENOUGH items to
                //   overflow 2 rows. On a wide chart a handful of items fit in 2-3
                //   rows UNDER the cap, so no pager shows — that's expected, not a
                //   bug. The 100 dummy KPI items below guarantee the overflow.
                maxHeight: 100,
                navigation: {
                    activeColor: '#2563eb',
                    inactiveColor: '#ccc',
                    arrowSize: 12,
                    animation: true,
                    style: { fontWeight: 'bold', color: '#333', fontSize: '12px' }
                },
                // Row metrics matched to MHC-1 so maxHeight:100 lands on 2 rows.
                padding: 8,
                itemMarginTop: 5,
                itemMarginBottom: 5,
                itemDistance: 15,
                symbolWidth: 0,
                symbolHeight: 0,
                symbolPadding: 0,
                itemStyle: {
                    fontWeight: 'normal', fontSize: '12px', color: '#16191d', cursor: 'pointer',
                    textOverflow: 'none', whiteSpace: 'nowrap'
                },
                labelFormatter: legendLabelFormatter,
                events: { itemClick: handleLegendItemClick }
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
                        // NATIVE FLAG (custom behaviour): inactive.enabled:false
                        // disables Highcharts' built-in "dim other series on hover"
                        // so PLOT hover never greys the chart. Highlighting is then
                        // driven ONLY by LEGEND hover (bindLegendInteractions, via
                        // SVG group opacity). hover.halo.size:0 kills the point halo.
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
                // order: ['series', 'legend'] → after the chart/series tab stop,
                // Tab moves focus to the FIRST legend item; arrow keys then cycle
                // through every legend item (Highcharts auto-paginates as you go).
                // Dropping 'legend' here (e.g. order:['series'] alone) is what
                // disabled native legend keyboard nav before.
                keyboardNavigation: { enabled: true, order: ['series', 'legend'], seriesNavigation: { mode: 'normal' } },
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
                // Ignore legend-originated clicks (incl. keyboard a11y proxy
                // activation), same as handleBackgroundClick — a legend toggle
                // must not clear the selection either.
                if (t && t.closest &&
                    t.closest('.highcharts-legend, .highcharts-a11y-proxy-group-legend')) return;
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
            if (e.key === ' ' || e.key === 'Enter') {
                // Arm point-selection ONLY for series-point keyboard activation.
                // The legend is keyboard-navigable now (order:['series','legend']),
                // so Space/Enter also fires while a legend a11y proxy <button> is
                // focused. handlePointClick won't fire for that, but arming here
                // would leave the flag stuck true, so a LATER point click could
                // select spuriously. Skip arming when the key is on a legend proxy.
                // (The actual legend-toggle-selects-category bug is handled in
                // handleBackgroundClick, where that click really lands.)
                var onLegendProxy = e.target && e.target.closest &&
                    e.target.closest('.highcharts-a11y-proxy-group-legend');
                if (!onLegendProxy) isKeyboardInteraction = true;
            }
            if (e.key === 'Escape') clearSelection();
        }, true);

        buildToolbar();
        createChart();
        wireContextMenu();
        updateDetailPanel();
    };
})();
