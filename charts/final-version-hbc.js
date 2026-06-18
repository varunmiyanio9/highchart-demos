// =============================================================================
// FINAL VERSION HBC (HBC-1 / HBC-2) — Horizontal Bar Chart presentation.
//
// A focused sibling of final-version.js. Where FIN-1 packs many ideas into ONE
// canvas, this page is deliberately minimal: TWO independent horizontal-bar
// demos that stay as close to stock Highcharts as possible, layering ONLY the
// four features that were explicitly asked for. No combined legend, no forecast
// divider, no context menu — those are intentionally absent.
//
//   HBC-1  Simple horizontal bar    — many product categories, one value series.
//   HBC-2  Stacked horizontal bar   — product GROUPS, each a stack of 4 items.
//
// FEATURES (the only custom code on this page) — everything else is default:
//   1. VERTICAL ALLOW-SCROLL  (new vs FIN-1, which scrolls horizontally)
//        Toggle. ON → the plot keeps a fixed tall height (scales with the
//        category count) and scrolls VERTICALLY; the horizontal VALUE axis stays
//        sticky while the vertical CATEGORY axis scrolls. NATIVE: a bar chart is
//        inverted, so chart.scrollablePlotArea.minHeight scrolls the (vertical)
//        x/category axis and pins the (horizontal) y/value axis automatically.
//   2. FONT SIZE / FONT WEIGHT  — toolbar selects → xAxis/yAxis labels.style.
//   3. CATEGORY SELECTION  — mouse (label click / background click / drag) +
//        keyboard (Tab → Arrow → Space/Enter, Shift+hover range, Escape clear).
//        Works on EACH chart independently (per-chart selectedCategories Set).
//   4. ENABLE POINT LABEL  — ONE checkbox flips native series.dataLabels.enabled
//        on BOTH charts (and yAxis.stackLabels on the stacked one for the total).
//
// CUSTOM-vs-NATIVE
//   • scroll      NATIVE chart.scrollablePlotArea.minHeight (pins value axis,
//                 scrolls categories). CUSTOM applyScroll() rebuilds both charts
//                 to flip it on/off (HC can't tear scrollablePlotArea down live).
//   • fonts       NATIVE x/yAxis.labels.style. CUSTOM only the toolbar plumbing.
//   • selection   NATIVE chart.zooming.type:'x' (drag → selection event),
//                 xAxis.plotBands (row highlight), accessibility keyboardNav
//                 (Space/Enter → point click). CUSTOM the selectedCategories Set
//                 + tick-label click/hover handlers.
//   • point label NATIVE series.dataLabels.enabled + yAxis.stackLabels.enabled.
//                 CUSTOM only the single checkbox plumbing.
// =============================================================================

(function () {
    "use strict";

    /* ── SHARED STATE ─────────────────────────────────────────────────── */

    var simpleChart = null;
    var stackedChart = null;

    // Per-chart selection — each chart owns its own Set of selected category
    // indices (the two demos are independent). The live Set is also stashed on
    // the chart instance as `_hbcSel` so the generic handlers can find it from
    // `this` regardless of which chart fired the event.
    var simpleSel = new Set();
    var stackedSel = new Set();

    // Toolbar state (shared across both charts; survives the scroll rebuild).
    var currentFontSize = "12px";
    var currentFontWeight = "normal";
    var allowScroll = false;
    var pointLabelsOn = false;

    var shiftKeyDown = false;
    var isKeyboardInteraction = false;

    var HIGHLIGHT_COLOR = "rgba(46, 204, 113, 0.18)";
    var HBC_VIEW_HEIGHT = 460; // visible viewport height of each chart
    var HBC_ROW_PX = 34; // per-category height used to size the scrollable plot

    var FONT_SIZE_OPTIONS = ["11px", "12px", "14px", "16px", "18px"];
    var FONT_WEIGHT_OPTIONS = ["normal", "600", "bold"];
    var FONT_WEIGHT_LABELS = ["Regular", "Semibold", "Bold"];

    document.addEventListener("keydown", function (e) {
        if (e.key === "Shift") shiftKeyDown = true;
    });
    document.addEventListener("keyup", function (e) {
        if (e.key === "Shift") shiftKeyDown = false;
    });

    /* ── DATA ─────────────────────────────────────────────────────────────
       Original to this demo. Enough categories on each chart that the vertical
       Allow-Scroll has something meaningful to scroll. */

    // HBC-1 — 24 products, one value series. (Products ARE the categories.)
    var SIMPLE_CATEGORIES = [];
    var SIMPLE_DATA = [];
    for (var p = 1; p <= 24; p++) {
        SIMPLE_CATEGORIES.push("Product " + (p < 10 ? "0" : "") + p);
        // Deterministic but varied values — no randomness needed.
        SIMPLE_DATA.push(40 + ((p * 37) % 70) + (p % 5) * 9);
    }

    // HBC-2 — 20 product GROUPS (categories), each a stack of 4 product items.
    var STACK_CATEGORIES = [];
    for (var g = 1; g <= 20; g++) {
        STACK_CATEGORIES.push("Group " + (g < 10 ? "0" : "") + g);
    }
    var STACK_ITEMS = [
        { name: "Product A", color: "#4E79A7", base: 18 },
        { name: "Product B", color: "#59A14F", base: 14 },
        { name: "Product C", color: "#E15759", base: 11 },
        { name: "Product D", color: "#F28E2B", base: 8 },
    ];
    function stackValue(itemIndex, groupIndex) {
        var item = STACK_ITEMS[itemIndex];
        var factor = 0.6 + ((groupIndex * 13 + itemIndex * 5) % 20) / 12;
        return Math.round(item.base * factor);
    }

    /* ── SERIES BUILDERS ──────────────────────────────────────────────────
       dataLabels.enabled is baked from `pointLabelsOn` so labels persist across
       the Allow-Scroll rebuild (which recreates the charts from scratch). */

    function buildSimpleSeries() {
        return [
            {
                name: "Units Sold",
                color: "#2C3E50",
                data: SIMPLE_DATA.slice(),
                dataLabels: { enabled: pointLabelsOn },
            },
        ];
    }

    function buildStackedSeries() {
        return STACK_ITEMS.map(function (item, ii) {
            return {
                name: item.name,
                color: item.color,
                data: STACK_CATEGORIES.map(function (_, gi) {
                    return stackValue(ii, gi);
                }),
                borderWidth: 0.5,
                borderColor: "#fff",
                dataLabels: { enabled: pointLabelsOn },
            };
        });
    }

    /* ── SELECTION (mouse + keyboard, per chart) ──────────────────────────
       [feature: selection]
       The selectedCategories Set lives on the chart as `_hbcSel`. Generic
       handlers read it from `this` (chart-level events) or `this.series.chart`
       (point-level events), so the SAME functions drive both charts. */

    function selSync(chart) {
        if (!chart || !chart.xAxis) return;
        var axis = chart.xAxis[0];
        var sel = chart._hbcSel;

        // Clear our own bands, then redraw them from the Set.
        (axis.plotLinesAndBands || [])
            .filter(function (b) {
                return b.id && b.id.indexOf("hbc-band-") === 0;
            })
            .map(function (b) {
                return b.id;
            })
            .forEach(function (id) {
                axis.removePlotBand(id);
            });

        sel.forEach(function (idx) {
            // On an inverted (bar) chart an xAxis band renders as a horizontal
            // stripe across the plot at that category row.
            axis.addPlotBand({
                from: idx - 0.5,
                to: idx + 0.5,
                color: HIGHLIGHT_COLOR,
                id: "hbc-band-" + idx,
                zIndex: 0,
            });
        });

        // Tick labels are recreated when plotBands change — restyle/rebind after.
        setTimeout(function () {
            if (!chart || !chart.xAxis) return;
            applyLabelStyles(chart);
            attachLabelHandlers(chart);
        }, 50);
    }

    function selToggle(chart, idx, accumulate) {
        if (!chart) return;
        var n = chart.xAxis[0].categories.length;
        if (idx < 0 || idx >= n) return;
        var sel = chart._hbcSel;
        if (!accumulate) sel.clear();
        if (sel.has(idx)) sel.delete(idx);
        else sel.add(idx);
        selSync(chart);
    }

    function selClear(chart) {
        if (!chart || !chart._hbcSel || chart._hbcSel.size === 0) return;
        chart._hbcSel.clear();
        selSync(chart);
    }

    function applyLabelStyles(chart) {
        var sel = chart._hbcSel;
        var ticks = chart.xAxis[0].ticks;
        Object.keys(ticks).forEach(function (key) {
            var tick = ticks[key];
            if (!tick.label) return;
            var idx = parseInt(key, 10);
            if (isNaN(idx) || idx < 0) return;
            if (sel.has(idx)) {
                tick.label.css({
                    fontWeight: "bold",
                    color: "#1e8449",
                    cursor: "pointer",
                });
            } else {
                tick.label.css({
                    fontWeight: currentFontWeight,
                    color: "#333333",
                    cursor: "pointer",
                });
            }
        });
    }

    function attachLabelHandlers(chart) {
        var ticks = chart.xAxis[0].ticks;
        Object.keys(ticks).forEach(function (key) {
            var tick = ticks[key];
            if (!tick.label) return;
            var idx = parseInt(key, 10);
            if (isNaN(idx) || idx < 0) return;

            tick.label.css({ cursor: "pointer" });
            // Dedupe guard — a plain redraw reuses the element; don't stack
            // listeners on it.
            if (tick.label.element._hbcBound) return;
            tick.label.element._hbcBound = true;

            tick.label.on("click", function (e) {
                selToggle(chart, idx, e.ctrlKey || e.metaKey);
            });
            tick.label.on("mouseover", function () {
                if (!chart._hbcSel.has(idx))
                    tick.label.css({ color: "#1e8449" });
            });
            tick.label.on("mouseout", function () {
                if (!chart._hbcSel.has(idx))
                    tick.label.css({ color: "#333333" });
            });
        });
    }

    // Keyboard: accessibility module fires a point click on Space/Enter.
    function onPointClick() {
        if (!isKeyboardInteraction) return;
        selToggle(this.series.chart, this.x, true);
        isKeyboardInteraction = false;
    }

    function onPointMouseOver() {
        if (!shiftKeyDown) return;
        var chart = this.series.chart;
        chart._hbcSel.add(this.x);
        selSync(chart);
    }

    function onDragSelect(e) {
        if (!e.xAxis) return;
        var chart = this;
        var sel = chart._hbcSel;
        var min = Math.floor(e.xAxis[0].min + 0.5);
        var max = Math.floor(e.xAxis[0].max + 0.5);
        var n = chart.xAxis[0].categories.length;
        for (var i = Math.max(0, min); i <= Math.min(n - 1, max); i++) {
            sel.add(i);
        }
        selSync(chart);
        return false; // suppress the actual zoom
    }

    function onBackgroundClick(e) {
        var chart = this;
        // Ignore legend-originated clicks (default legend toggles bubble here).
        var t = e.target;
        if (t && t.closest && t.closest(".highcharts-legend")) return;
        if (!e.xAxis) {
            selClear(chart);
            return;
        }
        var xValue = Math.round(e.xAxis[0].value);
        if (xValue < 0 || xValue >= chart.xAxis[0].categories.length) {
            selClear(chart);
            return;
        }
        selToggle(chart, xValue, e.ctrlKey || e.metaKey);
    }

    /* ── CHART CONFIG ─────────────────────────────────────────────────────
       Everything not listed here is stock Highcharts. The only non-default
       options are the four requested features (scroll / fonts / selection /
       point labels) plus credits-off and the inherited font family. */

    function makeConfig(o) {
        return {
            chart: {
                type: "bar",
                height: HBC_VIEW_HEIGHT,
                backgroundColor: "#ffffff",
                style: {
                    fontFamily:
                        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                },
                // [feature: selection] drag rubber-band → selection event.
                zooming: { type: "x" },
                // [feature: scroll] A bar chart is inverted, so minHeight scrolls
                // the (vertical) category axis and keeps the (horizontal) value
                // axis pinned/sticky. OFF → bars shrink to fit the viewport.
                scrollablePlotArea: allowScroll
                    ? {
                          minHeight: o.rowCount * HBC_ROW_PX,
                          scrollPositionY: 0,
                      }
                    : undefined,
                events: {
                    load: function () {
                        this._hbcSel = o.sel;
                        this._hbcStacked = !!o.stacking;
                        attachLabelHandlers(this);
                        applyLabelStyles(this);
                    },
                    redraw: function () {
                        var c = this;
                        setTimeout(function () {
                            if (!c || !c.xAxis) return;
                            attachLabelHandlers(c);
                            applyLabelStyles(c);
                        }, 50);
                    },
                    selection: onDragSelect,
                    click: onBackgroundClick,
                },
            },

            title: {
                text: o.titleText,
                style: {
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#16191d",
                },
            },

            xAxis: {
                categories: o.categories,
                // [feature: font-size] axis labels driven by the toolbar.
                labels: {
                    style: {
                        fontSize: currentFontSize,
                        fontWeight: currentFontWeight,
                        color: "#333333",
                    },
                },
            },

            yAxis: {
                min: 0,
                title: { text: o.valueTitle },
                labels: {
                    style: {
                        fontSize: currentFontSize,
                        fontWeight: currentFontWeight,
                        color: "#6b7079",
                    },
                },
                // [feature: point-labels] native stack TOTAL on top of each
                // tower — only meaningful on the stacked chart.
                stackLabels: { enabled: !!o.stacking && pointLabelsOn },
            },

            plotOptions: {
                series: {
                    stacking: o.stacking ? "normal" : undefined,
                    allowPointSelect: false,
                    point: {
                        events: {
                            click: onPointClick,
                            mouseOver: onPointMouseOver,
                        },
                    },
                },
            },

            credits: { enabled: false },

            accessibility: {
                enabled: true,
                // order:['series'] only — keyboard Space/Enter lands solely on
                // series points (not legend proxies), so the point-click arming
                // can never mis-fire on a legend toggle.
                keyboardNavigation: {
                    enabled: true,
                    order: ["series"],
                },
                point: {
                    valueDescriptionFormat:
                        "{point.category}, {series.name}: {point.y}",
                },
            },

            series: o.series,
        };
    }

    function createSimpleChart() {
        simpleChart = Highcharts.chart(
            "hbc-simple-chart",
            makeConfig({
                titleText: "Simple Horizontal Bar — Products",
                valueTitle: "Units Sold",
                categories: SIMPLE_CATEGORIES,
                series: buildSimpleSeries(),
                stacking: false,
                rowCount: SIMPLE_CATEGORIES.length,
                sel: simpleSel,
            }),
        );
        simpleChart._hbcSel = simpleSel;
        window.hbcSimpleChart = simpleChart;
    }

    function createStackedChart() {
        stackedChart = Highcharts.chart(
            "hbc-stacked-chart",
            makeConfig({
                titleText: "Stacked Horizontal Bar — Product Groups",
                valueTitle: "Units (stacked)",
                categories: STACK_CATEGORIES,
                series: buildStackedSeries(),
                stacking: true,
                rowCount: STACK_CATEGORIES.length,
                sel: stackedSel,
            }),
        );
        stackedChart._hbcSel = stackedSel;
        stackedChart._hbcStacked = true;
        window.hbcStackedChart = stackedChart;
    }

    /* ── TOOLBAR (point label / font size / font weight / allow scroll) ──── */

    function buildToolbar() {
        var toolbar = document.getElementById("fin-hbc-toolbar");
        if (!toolbar) return;

        var html =
            '<span class="fin-pl-group"><span class="fin-pl-title">Enable Point Label:</span>' +
            `<label><input type="checkbox" id="hbc-pl"${pointLabelsOn ? " checked" : ""}> Show values (both charts)</label>` +
            "</span>";

        html += '<label>Font Size: <select id="hbc-font-size">';
        FONT_SIZE_OPTIONS.forEach(function (size) {
            html += `<option value="${size}"${size === currentFontSize ? " selected" : ""}>${parseInt(size, 10)}px</option>`;
        });
        html += "</select></label>";

        html += '<label>Font Weight: <select id="hbc-font-weight">';
        FONT_WEIGHT_OPTIONS.forEach(function (w, i) {
            html += `<option value="${w}"${w === currentFontWeight ? " selected" : ""}>${FONT_WEIGHT_LABELS[i]}</option>`;
        });
        html += "</select></label>";

        html += `<label class="fin-switch-label">Allow Scroll (vertical)<span class="fin-switch"><input type="checkbox" id="hbc-allow-scroll"${allowScroll ? " checked" : ""}><span class="fin-switch-slider"></span></span></label>`;

        toolbar.innerHTML = html;

        document
            .getElementById("hbc-pl")
            .addEventListener("change", function () {
                pointLabelsOn = this.checked;
                applyPointLabels();
            });
        document
            .getElementById("hbc-font-size")
            .addEventListener("change", function () {
                currentFontSize = this.value;
                updateAxisFonts();
            });
        document
            .getElementById("hbc-font-weight")
            .addEventListener("change", function () {
                currentFontWeight = this.value;
                updateAxisFonts();
            });
        document
            .getElementById("hbc-allow-scroll")
            .addEventListener("change", function () {
                allowScroll = this.checked;
                applyScroll();
            });
    }

    /* ── FEATURE APPLIERS ─────────────────────────────────────────────── */

    function eachChart(fn) {
        [simpleChart, stackedChart].forEach(function (c) {
            if (c) fn(c);
        });
    }

    // [feature: point-labels] one checkbox → native dataLabels on both charts
    // (and the native stack total on the stacked chart).
    function applyPointLabels() {
        eachChart(function (c) {
            c.series.forEach(function (s) {
                s.update({ dataLabels: { enabled: pointLabelsOn } }, false);
            });
            if (c._hbcStacked) {
                c.yAxis[0].update(
                    { stackLabels: { enabled: pointLabelsOn } },
                    false,
                );
            }
            c.redraw();
        });
    }

    // [feature: font-size] native axis label style update on both charts.
    function updateAxisFonts() {
        eachChart(function (c) {
            var style = {
                fontSize: currentFontSize,
                fontWeight: currentFontWeight,
            };
            c.xAxis[0].update({ labels: { style: style } }, false);
            c.yAxis[0].update({ labels: { style: style } }, false);
            c.redraw();
            setTimeout(function () {
                if (!c || !c.xAxis) return;
                applyLabelStyles(c);
                attachLabelHandlers(c);
            }, 50);
        });
    }

    // [feature: scroll] Highcharts can't tear scrollablePlotArea down via
    // update(), so flip it by rebuilding both charts. The selection Sets live in
    // module vars, so we just recreate and re-apply the highlight bands.
    function applyScroll() {
        if (simpleChart) {
            simpleChart.destroy();
            simpleChart = null;
        }
        if (stackedChart) {
            stackedChart.destroy();
            stackedChart = null;
        }
        createSimpleChart();
        createStackedChart();
        selSync(simpleChart);
        selSync(stackedChart);
    }

    /* ── INIT ─────────────────────────────────────────────────────────── */

    window.initFinalVersionHBCChart = function () {
        var wrapper = document.getElementById("final-version-hbc");
        wrapper.addEventListener(
            "keydown",
            function (e) {
                // Arm point-selection for Space/Enter (a11y fires a point click).
                if (e.key === " " || e.key === "Enter")
                    isKeyboardInteraction = true;
                if (e.key === "Escape") {
                    selClear(simpleChart);
                    selClear(stackedChart);
                }
            },
            true,
        );

        buildToolbar();
        createSimpleChart();
        createStackedChart();
    };
})();
