/* =======================================================================
 * Member Stacked Legend — HIGHCHARTS NATIVE LEGEND version
 *
 * GOAL: Replicate the grouped legend (group headers, member swatches,
 *       "|" dividers, hover-dim, click-toggle) using Highcharts'
 *       own legend engine — no DOM built outside the chart.
 *
 * ── HIGHCHARTS OPTIONS & APIs used ──────────────────────────────────
 *
 *  legend.enabled: true           Turns on Highcharts' legend engine
 *  legend.useHTML: true           Legend item labels become real HTML
 *  legend.labelFormatter          Callback → returns HTML string per item
 *  legend.symbolWidth/Height: 0   Suppresses the auto SVG symbol so our
 *                                 HTML label is the sole visual indicator
 *  legend.symbolPadding: 0        Removes gap between (now-invisible)
 *                                 symbol slot and label text
 *  plotOptions.series.states
 *    .inactive.opacity            Highcharts controls the dim level
 *                                 when a series is in "inactive" state
 *  series.events.legendItemClick  Fires before default toggle; returning
 *                                 false cancels default (used on dummy
 *                                 group-header and divider series)
 *  chart.events.render            Lifecycle hook; fires after every
 *                                 redraw — used to wire mouseenter/leave
 *                                 on Highcharts-generated legend elements
 *  series.setState('inactive'|'') PUBLIC API — dims / restores a series
 *  chart.get(id)                  PUBLIC API — looks up series by id
 *  series.show() / series.hide()  PUBLIC API — visibility toggle
 *
 * ── CUSTOM (minimal) ────────────────────────────────────────────────
 *
 *  Inside chart.events.render (group headers ONLY):
 *    • Individual series hover-dim is handled natively by Highcharts
 *    • Group headers are dummy series (data:[]) — Highcharts' built-in
 *      hover would dim everything except the empty dummy, which is wrong.
 *      We attach mouseenter on group headers to setState('hover') on
 *      their member series and setState('inactive') on the rest.
 *
 *  labelFormatter HTML strings (the colored square/line/icon/divider
 *  visuals are inline HTML returned from a Highcharts callback)
 *
 *  Dummy series (data: []) used as group headers and dividers —
 *  a documented Highcharts pattern; events.legendItemClick returns false
 *  on these to prevent default show/hide behavior
 * ======================================================================= */

function initMemberStackedLegendHCChart() {

    /* ── DATA ─────────────────────────────────────────────────────── */

    const MONTHS = [
        'M01-2026','M02-2026','M03-2026','M04-2026','M05-2026','M06-2026','M07-2026',
        'M08-2026','M09-2026','M10-2026','M11-2026','M12-2026','M13-2026'
    ];

    const GROUPS = [
        {
            id: 'forecast',
            label: '30d Forecast Accuracy',
            members: [
                { id: 'sup_a', name: 'Supplier_A',     color: '#FFC107', data: [82,98,76,66,104,93,82,87,102,112,91,80,87] },
                { id: 'sup_b', name: 'Supplier_B',     color: '#E07B28', data: [72,84,68,62, 88,78,72,74, 88, 98,80,70,74] },
                { id: 'sup_c', name: 'Supplier_C',     color: '#8B5E2E', data: [66,72,62,56, 78,72,67,70, 80, 88,74,65,70] },
                { id: 'sup_d', name: 'Supplier_D',     color: '#5A3010', data: [60,66,56,50, 72,66,61,64, 74, 82,67,59,64] },
                { id: 'sup_e', name: 'Supplier_E',     color: '#2E1408', data: [55,61,51,46, 66,61,56,59, 69, 76,62,54,59] }
            ]
        },
        {
            id: 'fulfillment',
            label: 'Order Fulfillment Vol',
            members: [
                { id: 'reg_n', name: 'Region_North',   color: '#1A3A5C', data: [78,82,72,67, 88,80,74,77, 90, 98,82,74,78] },
                { id: 'reg_s', name: 'Region_South',   color: '#00BCD4', data: [68,74,64,60, 78,70,65,68, 80, 88,72,65,69] },
                { id: 'reg_e', name: 'Region_East',    color: '#0097A7', data: [62,67,60,54, 72,65,60,63, 73, 80,67,60,64] },
                { id: 'reg_w', name: 'Region_West',    color: '#F48FB1', data: [57,62,54,49, 67,60,55,58, 68, 74,62,55,59] },
                { id: 'reg_c', name: 'Region_Central', color: '#1565C0', data: [52,57,50,45, 62,55,50,53, 63, 68,57,50,54] }
            ]
        },
        {
            id: 'safety',
            label: 'Safety Stock Exceptions',
            members: [
                { id: 'sku_ph', name: 'SKU_Pharma',      color: '#E91E63', data: [62,70,57,52, 74,67,60,64, 74, 82,70,62,66] },
                { id: 'sku_el', name: 'SKU_Electronics', color: '#F8BBD0', data: [54,60,50,46, 64,58,52,55, 65, 72,60,54,58] },
                { id: 'sku_fm', name: 'SKU_FMCG',        color: '#E53935', data: [50,55,46,42, 59,53,48,51, 60, 67,55,49,53] },
                { id: 'sku_au', name: 'SKU_Auto',        color: '#B71C1C', data: [46,50,42,38, 54,48,44,46, 55, 61,50,45,48] },
                { id: 'sku_ap', name: 'SKU_Apparel',     color: '#7B0012', data: [42,46,38,34, 49,44,40,42, 50, 56,45,40,44] }
            ]
        }
    ];

    const LINES = [
        { id: 'tsc',  name: 'Total Supplier Capacity',    color: '#1a2940', yAxis: 0, data: [840,875,810,780,840,835,800,820,910,870,800,765,830] },
        { id: 'llti', name: 'Logistics Lead Time Index',  color: '#808080', yAxis: 0, data: [455,440,475,445,490,465,450,460,500,520,475,450,465] },
        { id: 'mdb',  name: 'Market Demand Baseline',     color: '#27AE60', yAxis: 1, data: [255,295,315,270,355,335,305,290,360,335,360,328,340] }
    ];

    /* ── SVG BAR ICON (embedded in labelFormatter HTML) ──────────── */

    const BAR_ICON =
        '<svg style="display:inline-block;vertical-align:middle;margin-right:3px;flex-shrink:0"' +
        ' width="13" height="13" viewBox="0 0 16 16" fill="none"' +
        ' stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' +
        '<line x1="4" y1="13" x2="4" y2="7"/>' +
        '<line x1="8" y1="13" x2="8" y2="4"/>' +
        '<line x1="12" y1="13" x2="12" y2="9.5"/>' +
        '<line x1="2" y1="13.5" x2="14" y2="13.5"/></svg>';

    /* ── SVG STACKED BAR ICON (segmented bars indicating stacking) ── */

    const STACKED_BAR_ICON =
        '<svg style="display:inline-block;vertical-align:middle;margin-right:3px;flex-shrink:0"' +
        ' width="13" height="13" viewBox="0 0 16 16" fill="none">' +
        '<rect x="2" y="8" width="3.5" height="2.5" fill="#6b7079" rx="0.3"/>' +
        '<rect x="2" y="5" width="3.5" height="2.5" fill="#9aa0a8" rx="0.3"/>' +
        '<rect x="2" y="2" width="3.5" height="2.5" fill="#c4c8cd" rx="0.3"/>' +
        '<rect x="6.5" y="6" width="3.5" height="4.5" fill="#6b7079" rx="0.3"/>' +
        '<rect x="6.5" y="3" width="3.5" height="2.5" fill="#9aa0a8" rx="0.3"/>' +
        '<rect x="6.5" y="0.5" width="3.5" height="2" fill="#c4c8cd" rx="0.3"/>' +
        '<rect x="11" y="7" width="3.5" height="3.5" fill="#6b7079" rx="0.3"/>' +
        '<rect x="11" y="4.5" width="3.5" height="2" fill="#9aa0a8" rx="0.3"/>' +
        '<rect x="11" y="2.5" width="3.5" height="1.5" fill="#c4c8cd" rx="0.3"/>' +
        '<line x1="1" y1="11" x2="15" y2="11" stroke="#6b7079" stroke-width="0.8"/></svg>';

    /* ── BUILD SERIES ARRAY ───────────────────────────────────────── */

    const seriesDefs = [];
    let divCounter = 0;

    /*
     * addDivider — HIGHCHARTS PATTERN
     * A dummy series with data:[] acts as a visual "|" separator in the legend.
     * enableMouseTracking:false keeps it invisible in the chart area.
     * legendItemClick returns false to cancel the default show/hide toggle.
     */
    function addDivider() {
        seriesDefs.push({
            id: 'div' + (divCounter++),
            name: '\u200b' + divCounter,   // unique zero-width-space names
            type: 'line',
            data: [],
            color: 'transparent',
            lineWidth: 0,
            marker: { enabled: false },
            showInLegend: true,
            enableMouseTracking: false,     // HIGHCHARTS OPTION: no chart hover
            custom: { isDivider: true },
            events: {
                legendItemClick: function () { return false; }  // HIGHCHARTS EVENT
            }
        });
    }

    /* Line series 1 & 2 — primary (left) axis */
    [LINES[0], LINES[1]].forEach(function (l) {
        seriesDefs.push({
            id: l.id,
            type: 'line',
            name: l.name,
            color: l.color,
            data: l.data,
            yAxis: l.yAxis,
            showInLegend: true,
            lineWidth: 1.5,
            marker: { enabled: false },
            states: { hover: { lineWidthPlus: 0 } },
            zIndex: 5,
            custom: { isLine: true, lineColor: l.color }
        });
    });

    addDivider();

    /*
     * Each group = one dummy group-header series + N member column series.
     * Group header has data:[] so it renders nothing in the chart area.
     * Its legendItemClick toggles all member series at once via chart.get(id).
     */
    GROUPS.forEach(function (g) {
        var memberIds = g.members.map(function (m) { return m.id; });

        /* Group header dummy series — HIGHCHARTS DUMMY SERIES PATTERN */
        seriesDefs.push({
            id: 'grp_' + g.id,
            name: g.label,
            type: 'column',
            data: [],
            stack: g.id,
            stacking: 'normal',
            color: 'transparent',
            borderWidth: 0,
            showInLegend: true,
            enableMouseTracking: false,
            custom: { isGroupHeader: true, groupId: g.id, memberIds: memberIds },
            events: {
                /*
                 * legendItemClick — HIGHCHARTS EVENT
                 * Intercept: return false cancels default (which would hide
                 * the dummy series). Instead we toggle all member series.
                 * chart.get(id) and series.show()/hide() are PUBLIC APIs.
                 */
                legendItemClick: function (e) {
                    e.preventDefault();
                    var chart = this.chart;
                    var ids = this.options.custom.memberIds;
                    var allHidden = ids.every(function (id) {
                        var s = chart.get(id);           // Highcharts PUBLIC API
                        return s && !s.visible;
                    });
                    ids.forEach(function (id) {
                        var s = chart.get(id);           // Highcharts PUBLIC API
                        if (!s) return;
                        allHidden ? s.show() : s.hide(); // Highcharts PUBLIC API
                    });
                    return false;
                }
            }
        });

        /* Member column series — real data, stack into this group's tower */
        g.members.forEach(function (m) {
            seriesDefs.push({
                id: m.id,
                name: m.name,
                type: 'column',
                color: m.color,
                data: m.data,
                stack: g.id,           // HIGHCHARTS OPTION: cumulative within group
                stacking: 'normal',    // HIGHCHARTS OPTION: stack mode
                showInLegend: true,
                borderWidth: 0.5,
                borderColor: '#fff',
                custom: { isMember: true, groupId: g.id, memberColor: m.color }
            });
        });

        addDivider();
    });

    /* Market Demand Baseline — secondary (right) axis */
    seriesDefs.push({
        id: LINES[2].id,
        type: 'line',
        name: LINES[2].name,
        color: LINES[2].color,
        data: LINES[2].data,
        yAxis: LINES[2].yAxis,          // HIGHCHARTS OPTION: bind to right axis
        showInLegend: true,
        lineWidth: 1.5,
        marker: { enabled: false },
        states: { hover: { lineWidthPlus: 0 } },
        zIndex: 5,
        custom: { isLine: true, lineColor: LINES[2].color }
    });

    /* ── HIGHCHARTS CHART CONFIG ──────────────────────────────────── */

    Highcharts.chart('msl-hc-chart', {

        chart: {
            type: 'column',
            marginLeft: 68,
            marginRight: 62,
            marginTop: 44,
            marginBottom: 120,
            style: {
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            },

            /*
             * chart.events.render — HIGHCHARTS LIFECYCLE HOOK
             *
             * Individual series legend hover (dim others, highlight self)
             * is handled 100% natively by Highcharts via states.inactive.
             *
             * Group headers are dummy series (data:[]) — Highcharts'
             * built-in hover would dim everything except the empty dummy.
             * We override ONLY group headers to highlight their members.
             */
            events: {
                render: function () {
                    var c = this;
                    /*
                     * Minimal custom wiring — ONLY for group headers.
                     * Individual series get Highcharts' built-in legend
                     * hover (dims others via states.inactive) for free.
                     *
                     * Group headers are dummy series (data:[]) so Highcharts'
                     * built-in hover would dim everything except the empty
                     * dummy — wrong. We override to highlight the group's
                     * member series instead.
                     */
                    c.series.forEach(function (s) {
                        var custom = (s.options && s.options.custom) || {};
                        if (!custom.isGroupHeader || !custom.memberIds) return;
                        if (!s.legendItem || !s.legendItem.group) return;

                        var el = s.legendItem.group.element;
                        if (el._hcGroupHover) return;
                        el._hcGroupHover = true;

                        el.addEventListener('mouseenter', function () {
                            var focusSet = {};
                            custom.memberIds.forEach(function (id) { focusSet[id] = true; });

                            c.series.forEach(function (other) {
                                var oc = (other.options && other.options.custom) || {};
                                if (oc.isDivider || oc.isGroupHeader) return;
                                if (focusSet[other.options.id]) {
                                    other.setState('hover');
                                } else {
                                    other.setState('inactive');
                                }
                            });
                        });

                        el.addEventListener('mouseleave', function () {
                            c.series.forEach(function (other) {
                                other.setState('');
                            });
                        });
                    });
                }
            }
        },

        title: {
            text: 'Inventory Profile',
            align: 'center',
            style: { fontSize: '14px', fontWeight: '600', color: '#16191d' }
        },
        subtitle: { text: null },

        /*
         * ── LEGEND CONFIG — all Highcharts options ───────────────────
         *
         * useHTML: true            Labels become real HTML (spans, SVG, etc.)
         * labelFormatter           Callback returns HTML string per item
         * symbolWidth/Height: 0    Hides the auto-generated SVG symbol so
         *                          our HTML label carries the color indicator
         * symbolPadding: 0         Removes gap between hidden symbol and label
         * states.inactive.opacity  Highcharts dims the item to 0.4 when its
         *                          series is inactive (legend item click off)
         */
        legend: {
            enabled: true,
            useHTML: true,
            layout: 'horizontal',
            align: 'left',
            verticalAlign: 'bottom',
            /*
             * alignColumns: false — stops Highcharts from aligning items into
             * a table grid. Items flow sequentially left-to-right with just
             * itemDistance (20px) gap between each. They wrap naturally like
             * inline text rather than snapping to column positions.
             */
            alignColumns: false,
            maxHeight: 85,
            navigation: {
                activeColor: '#2563eb',
                inactiveColor: '#ccc',
                arrowSize: 12,
                animation: true,
                style: { fontWeight: 'bold', color: '#333', fontSize: '12px' }
            },
            padding: 8,
            itemMarginTop: 1,
            itemMarginBottom: 1,
            itemDistance: 8,
            symbolWidth: 0,
            symbolHeight: 0,
            symbolPadding: 0,
            itemStyle: {
                fontWeight: 'normal',
                fontSize: '11.5px',
                color: '#16191d',
                cursor: 'pointer',
                lineHeight: '20px'
            },
            itemHoverStyle: { fontWeight: 'bold', color: '#2563eb' },

            /*
             * labelFormatter — HIGHCHARTS OPTION
             * `this` = series object. Returns HTML that becomes the full
             * visual for each legend item (symbol + label combined).
             *
             * Branching:
             *   isDivider     → a styled "|" vertical bar
             *   isGroupHeader → bar-chart icon + bold group name
             *   isLine        → colored horizontal line swatch + name
             *   isMember      → colored square swatch + name
             */
            labelFormatter: function () {
                var custom = (this.options && this.options.custom) || {};

                /* "|" DIVIDER — styled pipe character */
                if (custom.isDivider) {
                    return '<span style="' +
                        'display:inline-block;width:1px;height:14px;' +
                        'background:#d4d4d8;vertical-align:middle;' +
                        'margin:0 4px;pointer-events:none;' +
                    '"></span>';
                }

                /* GROUP HEADER — stacked bar icon + bold label */
                if (custom.isGroupHeader) {
                    return '<span style="display:inline-flex;align-items:center;gap:4px;height:20px;line-height:20px;">' +
                        STACKED_BAR_ICON +
                        '<b style="font-weight:700;color:#16191d;font-size:11.5px;">' + this.name + ' :</b>' +
                    '</span>';
                }

                /* LINE SERIES — horizontal color stripe + name */
                if (custom.isLine) {
                    return '<span style="display:inline-flex;align-items:center;gap:5px;height:20px;line-height:20px;">' +
                        '<span style="' +
                            'display:inline-block;width:20px;height:3px;' +
                            'background:' + custom.lineColor + ';' +
                            'border-radius:1px;flex-shrink:0;' +
                        '"></span>' +
                        '<span style="font-size:11.5px;">' + this.name + '</span>' +
                    '</span>';
                }

                /* MEMBER (stacked column) — colored square + name */
                if (custom.isMember) {
                    return '<span style="display:inline-flex;align-items:center;gap:4px;height:20px;line-height:20px;">' +
                        '<span style="' +
                            'display:inline-block;width:10px;height:10px;' +
                            'background:' + custom.memberColor + ';' +
                            'border-radius:1px;flex-shrink:0;' +
                        '"></span>' +
                        '<span style="font-size:11.5px;">' + this.name + '</span>' +
                    '</span>';
                }

                return this.name;
            }
        },

        xAxis: {
            categories: MONTHS,
            labels: { style: { fontSize: '11.5px', color: '#6b7079' } },
            /*
             * xAxis.plotLines — HIGHCHARTS OPTION
             * Orange vertical rule for the "current time bucket" boundary.
             */
            plotLines: [{
                value: 7.5,
                color: '#f5a623',
                width: 2,
                zIndex: 4
            }],
            gridLineWidth: 0,
            lineColor: '#9aa0a8',
            tickColor: 'transparent'
        },

        yAxis: [
            {
                /* Primary left axis */
                min: 0, max: 1000, tickAmount: 5,
                title: { text: null },
                labels: {
                    formatter: function () {
                        return this.value >= 1000
                            ? (this.value / 1000).toFixed(1) + 'k'
                            : this.value.toFixed(1);
                    },
                    style: { fontSize: '11.5px', color: '#6b7079' }
                },
                gridLineColor: '#ededf0'
            },
            {
                /*
                 * yAxis[1].opposite: true — HIGHCHARTS OPTION
                 * Places the secondary axis on the right side.
                 */
                opposite: true,
                min: 0, max: 450, tickAmount: 4,
                title: { text: null },
                labels: { style: { fontSize: '11.5px', color: '#6b7079' } },
                gridLineWidth: 0
            }
        ],

        plotOptions: {
            column: {
                stacking: 'normal',     // HIGHCHARTS OPTION
                groupPadding: 0.14,
                pointPadding: 0.03,
                maxPointWidth: 22
            },
            line: {
                marker: { enabled: false }
            },
            series: {
                states: {
                    /*
                     * states.inactive.opacity — HIGHCHARTS OPTION
                     * Controls how dim a series becomes when another is
                     * highlighted. Called by series.setState('inactive').
                     */
                    inactive: { opacity: 0.15 }
                }
            }
        },

        tooltip: { shared: false, useHTML: true, style: { fontSize: '12px' } },
        credits: { enabled: false },

        series: seriesDefs
    });
}
