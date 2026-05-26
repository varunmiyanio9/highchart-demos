// =============================================================================
// COMBINED SELECTION (SVG) — Multi Chart Type with Bidirectional Label Selection
//
// Pure SVG approach — no useHTML. Labels are native Highcharts SVG <text> elements.
// Selection state is synced via .css() calls on tick labels.
//
// TRADE-OFFS of the SVG label click approach:
//   - PlotBand add/remove triggers chart.redraw() which DESTROYS and RECREATES
//     all tick SVG elements. Click handlers and styles must be re-attached in the
//     redraw callback every time selection changes.
//   - Highcharts .css() on SVG labels sets inline attributes (fill, font-weight).
//     There is no CSS cascade or :hover pseudo-class on SVG text — hover must be
//     handled programmatically via .on('mouseover') / .on('mouseout').
//   - tick.label.on('click') is undocumented but stable across Highcharts versions.
//     It wraps addEventListener on the SVG <text> element.
//   - Ctrl+Click detection works because the native click event is passed through.
//
// BUILT-IN Highcharts features used:
//   - xAxis.labels.style → font size for all labels (applied via LABEL_FONT_SIZE)
//   - xAxis.plotBands → background highlight
//   - chart.zooming.type: 'x' + chart.events.selection → drag select
//   - tick.label.css() → per-label SVG style (bold, color)
//   - tick.label.on() → click/hover events on SVG elements
//   - accessibility.keyboardNavigation → keyboard entry into chart
//
// CUSTOM implementation:
//   - Click handlers attached to tick.label in attachLabelHandlers()
//   - Re-attached on every redraw (plotBands recreate ticks)
//   - Hover effect via mouseover/mouseout .css() calls
//   - Shared selection state across three chart types
//   - isKeyboardInteraction flag for Space/Enter accumulate behavior
//   - Shift+Arrow range select via mouseOver
// =============================================================================

(function () {
    const CATEGORIES = ['Q1-2024', 'Q2-2024', 'Q3-2024', 'Q4-2024', 'Q1-2025', 'Q2-2025'];
    const HIGHLIGHT_COLOR = 'rgba(46, 204, 113, 0.15)';
    const LABEL_FONT_SIZE = '13px';
    const SERIES_DATA = [
        { name: 'North America', data: [120, 135, 148, 162, 175, 190] },
        { name: 'Europe', data: [95, 102, 110, 98, 115, 125] },
        { name: 'Asia Pacific', data: [68, 74, 82, 91, 103, 112] }
    ];

    let selectedCategories = new Set();
    let isKeyboardInteraction = false;
    let shiftKeyDown = false;
    let charts = [];

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Shift') shiftKeyDown = true;
    });
    document.addEventListener('keyup', function (e) {
        if (e.key === 'Shift') shiftKeyDown = false;
    });

    function updateDetailPanel() {
        const content = document.getElementById('combined-content');
        if (!charts.length) return;

        if (selectedCategories.size === 0) {
            content.innerHTML = '<p class="no-selection">No categories selected. Drag on chart, click labels, or use keyboard.</p>';
            return;
        }

        let html = '<table><thead><tr><th>Category</th>';
        SERIES_DATA.forEach(s => { html += `<th>${s.name}</th>`; });
        html += '<th>Total</th></tr></thead><tbody>';

        const sorted = [...selectedCategories].sort((a, b) => a - b);
        sorted.forEach(idx => {
            let total = 0;
            html += `<tr><td><strong>${CATEGORIES[idx]}</strong></td>`;
            SERIES_DATA.forEach(s => {
                const val = s.data[idx] || 0;
                total += val;
                html += `<td>${val}</td>`;
            });
            html += `<td><strong>${total}</strong></td></tr>`;
        });
        html += '</tbody></table>';
        html += `<p style="margin-top:10px;font-size:13px;color:#2c3e50;"><strong>${selectedCategories.size}</strong> category(ies) selected</p>`;
        content.innerHTML = html;
    }

    function applyLabelStyles(chart) {
        const ticks = chart.xAxis[0].ticks;
        Object.keys(ticks).forEach(key => {
            const tick = ticks[key];
            if (!tick.label) return;
            const idx = parseInt(key, 10);
            if (isNaN(idx) || idx < 0) return;

            if (selectedCategories.has(idx)) {
                tick.label.css({ fontWeight: 'bold', color: '#27ae60', cursor: 'pointer' });
            } else {
                tick.label.css({ fontWeight: 'normal', color: '#333333', cursor: 'pointer' });
            }
        });
    }

    function attachLabelHandlers(chart) {
        const ticks = chart.xAxis[0].ticks;
        Object.keys(ticks).forEach(key => {
            const tick = ticks[key];
            if (!tick.label) return;
            const idx = parseInt(key, 10);
            if (isNaN(idx) || idx < 0) return;

            tick.label.css({ cursor: 'pointer' });

            tick.label.on('click', function (e) {
                const accumulate = e.ctrlKey || e.metaKey;
                selectCategory(idx, accumulate);
            });

            tick.label.on('mouseover', function () {
                if (!selectedCategories.has(idx)) {
                    tick.label.css({ color: '#27ae60' });
                }
            });

            tick.label.on('mouseout', function () {
                if (!selectedCategories.has(idx)) {
                    tick.label.css({ color: '#333333' });
                }
            });
        });
    }

    function syncAllCharts() {
        charts.forEach(chart => {
            const axis = chart.xAxis[0];

            // Batch plotBand updates without triggering intermediate redraws
            const existingBands = (axis.plotLinesAndBands || [])
                .filter(b => b.id && b.id.startsWith('combined-band-'))
                .map(b => b.id);
            existingBands.forEach(id => axis.removePlotBand(id));

            selectedCategories.forEach(idx => {
                axis.addPlotBand({
                    from: idx - 0.5,
                    to: idx + 0.5,
                    color: HIGHLIGHT_COLOR,
                    id: 'combined-band-' + idx,
                    zIndex: 0
                });
            });
        });

        // Apply label styles after redraw settles
        setTimeout(function () {
            charts.forEach(chart => {
                applyLabelStyles(chart);
                attachLabelHandlers(chart);
            });
        }, 60);

        updateDetailPanel();
    }

    function selectCategory(idx, accumulate) {
        if (idx < 0 || idx >= CATEGORIES.length) return;

        if (!accumulate) {
            selectedCategories.clear();
        }

        if (selectedCategories.has(idx)) {
            selectedCategories.delete(idx);
        } else {
            selectedCategories.add(idx);
        }

        syncAllCharts();
    }

    function clearSelection() {
        if (selectedCategories.size === 0) return;
        selectedCategories.clear();
        syncAllCharts();
    }

    function handlePointClick(e) {
        const accumulate = e.ctrlKey || e.metaKey || isKeyboardInteraction;
        selectCategory(this.x, accumulate);
        isKeyboardInteraction = false;
    }

    function handlePointMouseOver() {
        if (shiftKeyDown) {
            selectedCategories.add(this.x);
            syncAllCharts();
        }
    }

    function handleDragSelect(e) {
        if (!e.xAxis) return;
        const min = Math.floor(e.xAxis[0].min + 0.5);
        const max = Math.floor(e.xAxis[0].max + 0.5);
        for (let i = Math.max(0, min); i <= Math.min(CATEGORIES.length - 1, max); i++) {
            selectedCategories.add(i);
        }
        syncAllCharts();
        return false;
    }

    function createChart(containerId, type, title) {
        const chart = Highcharts.chart(containerId, {
            chart: {
                type: type,
                zooming: { type: 'x' },
                events: {
                    selection: handleDragSelect,
                    click: clearSelection
                }
            },
            title: { text: title },
            subtitle: { text: 'Drag to select | Click labels | Ctrl+Click multi | Keyboard: Tab → Arrow → Space' },
            xAxis: {
                categories: CATEGORIES,
                crosshair: { width: 1, color: '#aaa', dashStyle: 'Dash' },
                labels: {
                    style: { fontSize: LABEL_FONT_SIZE }
                }
            },
            yAxis: {
                title: { text: 'Revenue ($K)' },
                labels: {
                    style: { fontSize: LABEL_FONT_SIZE }
                }
            },
            plotOptions: {
                series: {
                    allowPointSelect: false,
                    cursor: 'pointer',
                    point: {
                        events: {
                            click: handlePointClick,
                            mouseOver: handlePointMouseOver
                        }
                    }
                }
            },
            series: SERIES_DATA.map(s => ({ ...s, data: [...s.data] })),
            accessibility: {
                enabled: true,
                keyboardNavigation: { enabled: true, seriesNavigation: { mode: 'normal' } },
                point: { valueDescriptionFormat: '{point.category}, {series.name}: {point.y}K revenue' }
            }
        });

        attachLabelHandlers(chart);

        Highcharts.addEvent(chart, 'redraw', function () {
            setTimeout(function () {
                attachLabelHandlers(chart);
                applyLabelStyles(chart);
            }, 50);
        });

        return chart;
    }

    window.initCombinedSelectionChart = function () {
        const wrapper = document.getElementById('combined-selection');

        wrapper.addEventListener('keydown', function (e) {
            if (e.key === ' ' || e.key === 'Enter') isKeyboardInteraction = true;
            if (e.key === 'Escape') clearSelection();
        }, true);

        charts = [
            createChart('combined-chart-column', 'column', 'Column — Combined Selection (SVG)'),
            createChart('combined-chart-line', 'line', 'Line — Combined Selection (SVG)'),
            createChart('combined-chart-area', 'area', 'Area — Combined Selection (SVG)')
        ];

        window.combinedChart = charts[0];
        updateDetailPanel();
    };
})();
