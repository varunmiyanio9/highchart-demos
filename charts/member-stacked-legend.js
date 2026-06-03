/* =======================================================================
 * Member Stacked Legend — Highcharts implementation
 *
 * WHAT IS HIGHCHARTS DEFAULT vs CUSTOM?
 * ─────────────────────────────────────────────────────────────────────
 * HIGHCHARTS DEFAULT OPTIONS (config keys that Highcharts handles):
 *   legend.enabled: false          — disables built-in legend panel
 *   plotOptions.column.stacking    — cumulative bar stacking
 *   series[].stack                 — groups series into the same stack tower
 *   series[].yAxis: 1              — binds a series to the secondary axis
 *   yAxis[1].opposite: true        — places axis on the right side
 *   xAxis.plotLines                — renders the orange "today" vertical line
 *   plotOptions.column.groupPadding/pointPadding — cluster spacing
 *   series.show() / series.hide()  — public API called from custom legend
 *
 * CUSTOM CODE (everything below chart init):
 *   .msl-legend HTML outside the Highcharts container
 *   Group headers (bar icon + bold label) with member colour swatches
 *   "|" dividers (msl-lg-divider spans)
 *   applyHighlight() — dims non-focused series via series.group.attr()
 *     series.group is Highcharts' internal SVG <g> element (not public API)
 *   toggleSeries() / toggleGroup() — wires click to series.show()/hide()
 *   .msl-off class on hidden legend items (custom visual feedback)
 * ======================================================================= */

function initMemberStackedLegendChart() {

    /* ── DATA ─────────────────────────────────────────────────────── */

    const MONTHS = [
        'M01-2026','M02-2026','M03-2026','M04-2026','M05-2026','M06-2026','M07-2026',
        'M08-2026','M09-2026','M10-2026','M11-2026','M12-2026','M13-2026'
    ];

    /**
     * GROUPS — each renders as one independent stacked column per category.
     * Highcharts places stacks with different `stack` ids side-by-side.
     */
    const GROUPS = [
        {
            id: 'forecast',
            label: '30d Forecast Accuracy',
            members: [
                { name: 'Supplier_A',     color: '#FFC107', data: [82,98,76,66,104,93,82,87,102,112,91,80,87] },
                { name: 'Supplier_B',     color: '#E07B28', data: [72,84,68,62, 88,78,72,74, 88, 98,80,70,74] },
                { name: 'Supplier_C',     color: '#8B5E2E', data: [66,72,62,56, 78,72,67,70, 80, 88,74,65,70] },
                { name: 'Supplier_D',     color: '#5A3010', data: [60,66,56,50, 72,66,61,64, 74, 82,67,59,64] },
                { name: 'Supplier_E',     color: '#2E1408', data: [55,61,51,46, 66,61,56,59, 69, 76,62,54,59] }
            ]
        },
        {
            id: 'fulfillment',
            label: 'Order Fulfillment Vol',
            members: [
                { name: 'Region_North',   color: '#1A3A5C', data: [78,82,72,67, 88,80,74,77, 90, 98,82,74,78] },
                { name: 'Region_South',   color: '#00BCD4', data: [68,74,64,60, 78,70,65,68, 80, 88,72,65,69] },
                { name: 'Region_East',    color: '#0097A7', data: [62,67,60,54, 72,65,60,63, 73, 80,67,60,64] },
                { name: 'Region_West',    color: '#F48FB1', data: [57,62,54,49, 67,60,55,58, 68, 74,62,55,59] },
                { name: 'Region_Central', color: '#1565C0', data: [52,57,50,45, 62,55,50,53, 63, 68,57,50,54] }
            ]
        },
        {
            id: 'safety',
            label: 'Safety Stock Exceptions',
            members: [
                { name: 'SKU_Pharma',      color: '#E91E63', data: [62,70,57,52, 74,67,60,64, 74, 82,70,62,66] },
                { name: 'SKU_Electronics', color: '#F8BBD0', data: [54,60,50,46, 64,58,52,55, 65, 72,60,54,58] },
                { name: 'SKU_FMCG',        color: '#E53935', data: [50,55,46,42, 59,53,48,51, 60, 67,55,49,53] },
                { name: 'SKU_Auto',        color: '#B71C1C', data: [46,50,42,38, 54,48,44,46, 55, 61,50,45,48] },
                { name: 'SKU_Apparel',     color: '#7B0012', data: [42,46,38,34, 49,44,40,42, 50, 56,45,40,44] }
            ]
        }
    ];

    /** Line series — first two on primary (left) axis, last on secondary (right) */
    const LINES = [
        {
            name: 'Total Supplier Capacity',
            color: '#1a2940',
            yAxis: 0,
            data: [840,875,810,780,840,835,800,820,910,870,800,765,830]
        },
        {
            name: 'Logistics Lead Time Index',
            color: '#808080',
            yAxis: 0,
            data: [455,440,475,445,490,465,450,460,500,520,475,450,465]
        },
        {
            name: 'Market Demand Baseline',
            color: '#27AE60',
            yAxis: 1,
            data: [255,295,315,270,355,335,305,290,360,335,360,328,340]
        }
    ];

    /* ── BUILD SERIES ARRAY ───────────────────────────────────────── */

    const seriesDefs = [];

    LINES.forEach(function(l) {
        seriesDefs.push({
            type: 'line',
            name: l.name,
            color: l.color,
            data: l.data,
            yAxis: l.yAxis,
            showInLegend: false,        // ← Highcharts option: exclude from native legend
            lineWidth: 1.5,
            marker: { enabled: false },
            states: { hover: { lineWidthPlus: 0 } },
            zIndex: 5
        });
    });

    GROUPS.forEach(function(g) {
        g.members.forEach(function(m) {
            seriesDefs.push({
                type: 'column',
                name: m.name,
                color: m.color,
                data: m.data,
                stack: g.id,            // ← Highcharts option: groups into the same stack tower
                stacking: 'normal',     // ← Highcharts option: cumulative value stacking
                showInLegend: false,
                borderWidth: 0.5,
                borderColor: '#fff'
            });
        });
    });

    /* ── HIGHCHARTS CHART CONFIG ──────────────────────────────────── */

    const chart = Highcharts.chart('msl-chart', {
        chart: {
            type: 'column',
            marginLeft: 68,
            marginRight: 62,
            marginTop: 44,
            marginBottom: 50,
            style: {
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            }
        },

        title: {
            text: 'Inventory Profile',
            align: 'center',
            style: { fontSize: '14px', fontWeight: '600', color: '#16191d' }
        },
        subtitle: { text: null },

        /*
         * legend.enabled: false  — HIGHCHARTS DEFAULT OPTION
         * Turns off the auto-generated legend so our custom .msl-legend
         * HTML element (built below) takes its place.
         */
        legend: { enabled: false },

        xAxis: {
            categories: MONTHS,
            labels: { style: { fontSize: '11.5px', color: '#6b7079' } },
            /*
             * xAxis.plotLines  — HIGHCHARTS DEFAULT OPTION
             * Draws the amber "current time bucket" vertical rule.
             * value: 7.5 places it between M08 (index 7) and M09 (index 8).
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
                min: 0,
                max: 1000,
                tickAmount: 5,
                title: { text: null },
                labels: {
                    formatter: function() {
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
                 * yAxis[1].opposite: true  — HIGHCHARTS DEFAULT OPTION
                 * Places the secondary axis on the right side.
                 * Series with yAxis: 1 (Market Demand Baseline) bind here.
                 */
                opposite: true,
                min: 0,
                max: 450,
                tickAmount: 4,
                title: { text: null },
                labels: { style: { fontSize: '11.5px', color: '#6b7079' } },
                gridLineWidth: 0
            }
        ],

        plotOptions: {
            column: {
                /*
                 * stacking: 'normal'  — HIGHCHARTS DEFAULT OPTION
                 * Stacks bar segments cumulatively within each stack group.
                 * Different `stack` id values are rendered side-by-side
                 * within the same category cluster automatically.
                 */
                stacking: 'normal',
                groupPadding: 0.14,
                pointPadding: 0.03,
                maxPointWidth: 22
            },
            line: {
                marker: { enabled: false }
            }
        },

        tooltip: {
            shared: false,
            useHTML: true,
            style: { fontSize: '12px' }
        },

        credits: { enabled: false },

        series: seriesDefs
    });

    /* ================================================================
     * CUSTOM LEGEND
     *
     * Everything from here down is CUSTOM CODE.
     * Highcharts APIs called from custom code are noted inline.
     * ================================================================ */

    var legendEl = document.getElementById('msl-legend-bar');
    if (!legendEl) return;
    legendEl.innerHTML = '';

    var hiddenSet = {};  // tracks which series names are currently hidden

    /* -- Helpers ---------------------------------------------------- */

    function findSeries(name) {
        for (var i = 0; i < chart.series.length; i++) {
            if (chart.series[i].name === name) return chart.series[i];
        }
        return null;
    }

    /*
     * applyHighlight — CUSTOM CODE
     * Dims all series not in `focusNames` by setting opacity on
     * series.group, which is the Highcharts internal SVG <g> element.
     *   series.group.attr({opacity}) is an internal (not public) API.
     *
     * @param {Set|null} focusNames — null restores everything to 1
     */
    function applyHighlight(focusNames) {
        chart.series.forEach(function(s) {
            if (!s.group) return;
            var on = !focusNames || focusNames.has(s.name);
            s.group.attr({ opacity: on ? 1 : 0.15 });
        });
    }

    /*
     * toggleSeries — CUSTOM CODE
     * Wires a legend item click to Highcharts public series.show()/hide().
     */
    function toggleSeries(name) {
        var s = findSeries(name);
        if (!s) return;
        if (hiddenSet[name]) {
            delete hiddenSet[name];
            s.show();   // ← Highcharts public API
        } else {
            hiddenSet[name] = true;
            s.hide();   // ← Highcharts public API
        }
        // Sync .msl-off class on all legend items that control this series
        legendEl.querySelectorAll('[data-toggle-name]').forEach(function(el) {
            if (el.dataset.toggleName === name) {
                el.classList.toggle('msl-off', !!hiddenSet[name]);
            }
        });
    }

    /*
     * toggleGroup — CUSTOM CODE
     * Clicking a group header hides/shows all its members at once.
     * If all members are already hidden, clicking shows them all.
     */
    function toggleGroup(groupId, memberNames) {
        var allHidden = memberNames.every(function(n) { return !!hiddenSet[n]; });
        memberNames.forEach(function(n) {
            var s = findSeries(n);
            if (!s) return;
            if (allHidden) {
                delete hiddenSet[n];
                s.show();
            } else {
                hiddenSet[n] = true;
                s.hide();
            }
        });
        // Sync visual state for member items
        legendEl.querySelectorAll('[data-group-id="' + groupId + '"]').forEach(function(el) {
            var tn = el.dataset.toggleName;
            if (tn) el.classList.toggle('msl-off', !!hiddenSet[tn]);
        });
        // Sync group header
        var grpEl = legendEl.querySelector('.msl-lg-grp[data-group-id="' + groupId + '"]');
        if (grpEl) grpEl.classList.toggle('msl-off', !allHidden);
    }

    /* -- Icon for group headers ------------------------------------- */
    var BAR_ICON_SVG = [
        '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"',
        ' stroke="currentColor" stroke-width="1.6" stroke-linecap="round">',
        '<line x1="4" y1="13" x2="4" y2="7"/>',
        '<line x1="8" y1="13" x2="8" y2="4"/>',
        '<line x1="12" y1="13" x2="12" y2="9.5"/>',
        '<line x1="2" y1="13.5" x2="14" y2="13.5"/>',
        '</svg>'
    ].join('');

    /* -- DOM builder helpers ---------------------------------------- */

    function addDivider() {
        var d = document.createElement('span');
        d.className = 'msl-lg-divider';
        legendEl.appendChild(d);
    }

    function makeLineItem(lineData) {
        var btn = document.createElement('button');
        btn.className = 'msl-lg-item';
        btn.dataset.toggleName = lineData.name;
        btn.innerHTML =
            '<span class="msl-lg-line" style="background:' + lineData.color + '"></span>' +
            '<span class="msl-lg-label">' + lineData.name + '</span>';

        btn.addEventListener('mouseenter', function() {
            btn.classList.add('hovbg');
            applyHighlight(new Set([lineData.name]));
        });
        btn.addEventListener('mouseleave', function() {
            btn.classList.remove('hovbg');
            applyHighlight(null);
        });
        btn.addEventListener('click', function() { toggleSeries(lineData.name); });
        legendEl.appendChild(btn);
    }

    function makeGroupItems(g) {
        var memberNames = g.members.map(function(m) { return m.name; });
        var memberSet   = new Set(memberNames);

        /* Group header */
        var grpBtn = document.createElement('button');
        grpBtn.className = 'msl-lg-item msl-lg-grp msl-grp-start';
        grpBtn.dataset.groupId = g.id;
        grpBtn.innerHTML =
            '<span class="msl-chev">' + BAR_ICON_SVG + '</span>' +
            '<span class="msl-lg-label msl-bold">' + g.label + ' :</span>';

        grpBtn.addEventListener('mouseenter', function() {
            grpBtn.classList.add('hovbg');
            applyHighlight(memberSet);
        });
        grpBtn.addEventListener('mouseleave', function() {
            grpBtn.classList.remove('hovbg');
            applyHighlight(null);
        });
        grpBtn.addEventListener('click', function() { toggleGroup(g.id, memberNames); });
        legendEl.appendChild(grpBtn);

        /* Member items */
        g.members.forEach(function(m) {
            var btn = document.createElement('button');
            btn.className = 'msl-lg-item';
            btn.dataset.groupId = g.id;
            btn.dataset.toggleName = m.name;
            btn.innerHTML =
                '<span class="msl-sq" style="background:' + m.color + '"></span>' +
                '<span class="msl-lg-label">' + m.name + '</span>';

            btn.addEventListener('mouseenter', function() {
                btn.classList.add('hovbg');
                applyHighlight(new Set([m.name]));
            });
            btn.addEventListener('mouseleave', function() {
                btn.classList.remove('hovbg');
                applyHighlight(null);
            });
            btn.addEventListener('click', function() { toggleSeries(m.name); });
            legendEl.appendChild(btn);
        });
    }

    /* ── Populate legend row ─────────────────────────────────────── */

    // 1. Total Supplier Capacity  (line, primary axis)
    makeLineItem(LINES[0]);
    addDivider();

    // 2. Logistics Lead Time Index  (line, primary axis)
    makeLineItem(LINES[1]);
    addDivider();

    // 3–5. Three stacked column groups with their members
    GROUPS.forEach(function(g) {
        makeGroupItems(g);
        addDivider();
    });

    // 6. Market Demand Baseline  (line, secondary axis)
    makeLineItem(LINES[2]);
}
