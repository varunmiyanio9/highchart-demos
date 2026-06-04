/* =======================================================================
 * Stack Bar Legends — Highcharts implementation
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
            id: 'product1',
            label: 'Product-1',
            members: [
                { name: 'Item-1',  color: '#FFC107', data: [82,98,76,66,104,93,82,87,102,112,91,80,87] },
                { name: 'Item-2',  color: '#FFD54F', data: [72,84,68,62,88,78,72,74,88,98,80,70,74] },
                { name: 'Item-3',  color: '#F9A825', data: [66,72,62,56,78,72,67,70,80,88,74,65,70] },
                { name: 'Item-4',  color: '#E07B28', data: [60,66,56,50,72,66,61,64,74,82,67,59,64] },
                { name: 'Item-5',  color: '#EF6C00', data: [55,61,51,46,66,61,56,59,69,76,62,54,59] },
                { name: 'Item-6',  color: '#D84315', data: [50,57,47,42,61,56,51,54,64,70,57,50,54] },
                { name: 'Item-7',  color: '#BF360C', data: [46,53,43,39,57,52,48,50,60,66,53,47,50] },
                { name: 'Item-8',  color: '#8B5E2E', data: [43,49,40,36,53,49,44,47,56,62,50,44,47] },
                { name: 'Item-9',  color: '#A1887F', data: [40,46,37,33,50,45,41,44,52,58,47,41,44] },
                { name: 'Item-10', color: '#795548', data: [37,43,35,30,47,42,38,41,49,54,44,38,41] },
                { name: 'Item-11', color: '#6D4C41', data: [35,40,32,28,44,39,35,38,46,51,41,36,38] },
                { name: 'Item-12', color: '#5D4037', data: [32,37,30,26,41,37,33,35,43,48,38,33,35] },
                { name: 'Item-13', color: '#5A3010', data: [30,35,28,24,38,34,30,33,40,45,36,31,33] },
                { name: 'Item-14', color: '#3E2723', data: [28,32,26,22,36,32,28,30,37,42,33,29,30] },
                { name: 'Item-15', color: '#2E1408', data: [25,30,24,20,33,29,25,28,35,39,31,26,28] },
                { name: 'Item-16', color: '#FF8F00', data: [23,28,22,18,31,27,23,26,33,37,29,24,26] },
                { name: 'Item-17', color: '#F57F17', data: [21,26,20,17,29,25,21,24,31,35,27,22,24] },
                { name: 'Item-18', color: '#E65100', data: [19,24,18,15,27,23,19,22,29,33,25,20,22] },
                { name: 'Item-19', color: '#DD2C00', data: [17,22,16,14,25,21,17,20,27,31,23,18,20] },
                { name: 'Item-20', color: '#BF360C', data: [15,20,15,12,23,19,15,18,25,29,21,16,18] },
                { name: 'Item-21', color: '#8D6E63', data: [14,18,13,11,21,17,14,16,23,27,19,15,16] },
                { name: 'Item-22', color: '#6D4C41', data: [12,16,12,10,19,16,12,14,21,25,17,13,15] },
                { name: 'Item-23', color: '#4E342E', data: [11,15,11,9,17,14,11,13,19,23,16,12,13] },
                { name: 'Item-24', color: '#3E2723', data: [10,13,10,8,16,13,10,11,18,21,14,10,12] },
                { name: 'Item-25', color: '#1B0000', data: [9,12,9,7,14,11,9,10,16,19,13,9,10] }
            ]
        },
        {
            id: 'product2',
            label: 'Product-2',
            members: [
                { name: 'Item-1',  color: '#FFC107', data: [78,82,72,67,88,80,74,77,90,98,82,74,78] },
                { name: 'Item-2',  color: '#FFD54F', data: [68,74,64,60,78,70,65,68,80,88,72,65,69] },
                { name: 'Item-3',  color: '#F9A825', data: [62,67,60,54,72,65,60,63,73,80,67,60,64] },
                { name: 'Item-4',  color: '#E07B28', data: [57,62,54,49,67,60,55,58,68,74,62,55,59] },
                { name: 'Item-5',  color: '#EF6C00', data: [52,57,50,45,62,55,50,53,63,68,57,50,54] },
                { name: 'Item-6',  color: '#D84315', data: [48,53,46,42,58,52,47,50,59,64,53,47,50] },
                { name: 'Item-7',  color: '#BF360C', data: [45,50,43,39,55,49,44,47,56,61,50,44,47] },
                { name: 'Item-8',  color: '#8B5E2E', data: [42,47,40,36,52,46,41,44,53,58,47,41,44] },
                { name: 'Item-9',  color: '#A1887F', data: [39,44,37,34,49,43,38,41,50,55,44,38,41] },
                { name: 'Item-10', color: '#795548', data: [36,41,35,31,46,41,36,38,47,52,41,36,38] },
                { name: 'Item-11', color: '#6D4C41', data: [34,38,32,29,43,38,33,36,44,49,39,33,36] },
                { name: 'Item-12', color: '#5D4037', data: [31,36,30,27,40,36,31,33,42,46,36,31,33] },
                { name: 'Item-13', color: '#5A3010', data: [29,33,28,25,38,33,29,31,39,43,34,29,31] },
                { name: 'Item-14', color: '#3E2723', data: [27,31,26,23,35,31,27,29,37,41,32,27,29] },
                { name: 'Item-15', color: '#2E1408', data: [25,28,24,21,33,29,25,27,34,38,29,25,27] },
                { name: 'Item-16', color: '#FF8F00', data: [23,26,22,19,31,27,23,25,32,36,27,23,25] },
                { name: 'Item-17', color: '#F57F17', data: [21,24,20,17,29,25,21,23,30,34,25,21,23] },
                { name: 'Item-18', color: '#E65100', data: [19,22,18,16,27,23,19,21,28,32,23,19,21] },
                { name: 'Item-19', color: '#DD2C00', data: [17,20,17,14,25,21,17,19,26,30,21,17,19] },
                { name: 'Item-20', color: '#BF360C', data: [15,18,15,12,23,19,15,17,24,28,19,15,17] },
                { name: 'Item-21', color: '#8D6E63', data: [14,17,14,11,21,18,14,16,22,26,18,14,16] },
                { name: 'Item-22', color: '#6D4C41', data: [12,15,12,10,19,16,12,14,20,24,16,12,14] },
                { name: 'Item-23', color: '#4E342E', data: [11,14,11,9,17,14,11,13,18,22,15,11,13] },
                { name: 'Item-24', color: '#3E2723', data: [10,12,10,8,16,13,10,11,17,20,13,10,11] },
                { name: 'Item-25', color: '#1B0000', data: [9,11,9,7,14,11,9,10,15,18,12,9,10] }
            ]
        },
        {
            id: 'product3',
            label: 'Product-3',
            members: [
                { name: 'Item-1',  color: '#FFC107', data: [62,70,57,52,74,67,60,64,74,82,70,62,66] },
                { name: 'Item-2',  color: '#FFD54F', data: [54,60,50,46,64,58,52,55,65,72,60,54,58] },
                { name: 'Item-3',  color: '#F9A825', data: [50,55,46,42,59,53,48,51,60,67,55,49,53] },
                { name: 'Item-4',  color: '#E07B28', data: [46,50,42,38,54,48,44,46,55,61,50,45,48] },
                { name: 'Item-5',  color: '#EF6C00', data: [42,46,38,34,49,44,40,42,50,56,45,40,44] },
                { name: 'Item-6',  color: '#D84315', data: [39,43,35,31,46,41,37,39,47,53,42,38,41] },
                { name: 'Item-7',  color: '#BF360C', data: [36,40,33,29,43,38,34,36,44,50,40,35,38] },
                { name: 'Item-8',  color: '#8B5E2E', data: [34,37,31,27,40,36,32,34,41,47,37,33,35] },
                { name: 'Item-9',  color: '#A1887F', data: [31,35,28,25,38,33,29,31,39,44,35,30,33] },
                { name: 'Item-10', color: '#795548', data: [29,32,26,23,35,31,27,29,36,41,32,28,30] },
                { name: 'Item-11', color: '#6D4C41', data: [27,30,24,21,33,29,25,27,34,38,30,26,28] },
                { name: 'Item-12', color: '#5D4037', data: [25,28,22,19,30,27,23,25,31,36,28,24,26] },
                { name: 'Item-13', color: '#5A3010', data: [23,26,20,18,28,25,21,23,29,33,26,22,24] },
                { name: 'Item-14', color: '#3E2723', data: [21,24,19,16,26,23,19,21,27,31,24,20,22] },
                { name: 'Item-15', color: '#2E1408', data: [19,22,17,14,24,21,18,19,25,28,22,19,20] },
                { name: 'Item-16', color: '#FF8F00', data: [17,20,16,13,22,19,16,17,23,26,20,17,18] },
                { name: 'Item-17', color: '#F57F17', data: [16,18,14,12,20,17,14,16,21,24,18,15,16] },
                { name: 'Item-18', color: '#E65100', data: [14,16,13,10,18,16,13,14,19,22,16,14,15] },
                { name: 'Item-19', color: '#DD2C00', data: [12,15,11,9,16,14,11,12,17,20,15,12,13] },
                { name: 'Item-20', color: '#BF360C', data: [11,13,10,8,15,12,10,11,16,18,13,11,12] },
                { name: 'Item-21', color: '#8D6E63', data: [10,12,9,7,13,11,9,10,14,16,12,10,11] },
                { name: 'Item-22', color: '#6D4C41', data: [9,11,8,6,12,10,8,9,13,15,11,9,10] },
                { name: 'Item-23', color: '#4E342E', data: [8,10,7,6,11,9,7,8,11,13,10,8,9] },
                { name: 'Item-24', color: '#3E2723', data: [7,9,7,5,10,8,7,7,10,12,9,7,8] },
                { name: 'Item-25', color: '#1B0000', data: [6,8,6,5,9,7,6,6,9,11,8,6,7] }
            ]
        }
    ];

    /** Line series — first two on primary (left) axis, last on secondary (right) */
    const LINES = [
        {
            name: 'Line-1',
            color: '#1a2940',
            yAxis: 0,
            data: [1640,1675,1510,1480,1640,1635,1500,1520,1710,1770,1600,1465,1530]
        },
        {
            name: 'Line-2',
            color: '#808080',
            yAxis: 0,
            data: [955,940,975,945,990,965,950,960,1100,1120,975,950,965]
        },
        {
            name: 'Line-3',
            color: '#27AE60',
            yAxis: 1,
            data: [255,295,315,270,355,335,305,290,360,335,360,328,340]
        }
    ];

    /** Bar series — normal (non-stacked) columns */
    const BARS = [
        { name: 'Bar-1', color: '#5B2C6F', data: [320,345,310,290,360,340,315,330,370,390,350,305,325] }
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

    BARS.forEach(function(b) {
        seriesDefs.push({
            type: 'column',
            name: b.name,
            color: b.color,
            data: b.data,
            showInLegend: false
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
                max: 2000,
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

    function makeBarItem(barData) {
        var btn = document.createElement('button');
        btn.className = 'msl-lg-item';
        btn.dataset.toggleName = barData.name;
        btn.innerHTML =
            '<span class="msl-sq" style="background:' + barData.color + '"></span>' +
            '<span class="msl-lg-label">' + barData.name + '</span>';

        btn.addEventListener('mouseenter', function() {
            btn.classList.add('hovbg');
            applyHighlight(new Set([barData.name]));
        });
        btn.addEventListener('mouseleave', function() {
            btn.classList.remove('hovbg');
            applyHighlight(null);
        });
        btn.addEventListener('click', function() { toggleSeries(barData.name); });
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

    // 1. Line-1  (line, primary axis)
    makeLineItem(LINES[0]);
    addDivider();

    // 2. Line-2  (line, primary axis)
    makeLineItem(LINES[1]);
    addDivider();

    // 3–5. Three stacked column groups with their members
    GROUPS.forEach(function(g) {
        makeGroupItems(g);
        addDivider();
    });

    // 6. Bar series (non-stacked)
    BARS.forEach(function(b) {
        makeBarItem(b);
    });
    addDivider();

    // 7. Line-3  (line, secondary axis)
    makeLineItem(LINES[2]);
}
