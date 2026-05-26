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
//   - Mouse selection is on background/grid only (chart.events.click with coordinate
//     translation). Clicking directly on bars/lines does NOT select — this prevents
//     accidental selection when interacting with data points. Keyboard selection
//     still works via accessibility module (Space/Enter on focused point).
//
// BUILT-IN Highcharts features used:
//   - xAxis.labels.style → font size for all labels (applied via LABEL_FONT_SIZE)
//   - yAxis.labels.style → font size for y-axis labels
//   - xAxis[0].update() / yAxis[0].update() → dynamic font size/weight change
//   - xAxis.plotBands → background highlight
//   - chart.zooming.type: 'x' + chart.events.selection → drag select
//   - tick.label.css() → per-label SVG style (bold, color)
//   - tick.label.on() → click/hover events on SVG elements
//   - accessibility.keyboardNavigation → keyboard entry into chart
//
// CUSTOM implementation:
//   - Font size/weight toolbar — updates all charts' x and y axis labels
//   - Background click selection — chart.events.click translates pixel to category
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
    const FONT_SIZE_OPTIONS = ['12px', '14px', '16px', '18px'];
    const FONT_WEIGHT_OPTIONS = ['normal', '600', 'bold'];
    const FONT_WEIGHT_LABELS = ['Regular', 'Semibold', 'Bold'];

    let currentFontSize = '13px';
    let currentFontWeight = 'normal';

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

    function updateAxisStyles() {
        charts.forEach(chart => {
            chart.xAxis[0].update({
                labels: { style: { fontSize: currentFontSize, fontWeight: currentFontWeight } }
            }, false);
            chart.yAxis[0].update({
                labels: { style: { fontSize: currentFontSize, fontWeight: currentFontWeight } }
            }, false);
            chart.redraw();
        });

        setTimeout(function () {
            charts.forEach(chart => {
                applyLabelStyles(chart);
                attachLabelHandlers(chart);
            });
        }, 60);
    }

    function buildToolbar() {
        const toolbar = document.getElementById('combined-toolbar');

        let html = '<label>Font Size: <select id="combined-font-size">';
        FONT_SIZE_OPTIONS.forEach(size => {
            const selected = size === currentFontSize ? ' selected' : '';
            html += `<option value="${size}"${selected}>${parseInt(size)}px</option>`;
        });
        html += '</select></label>';

        html += '<label>Font Weight: <select id="combined-font-weight">';
        FONT_WEIGHT_OPTIONS.forEach((weight, i) => {
            const selected = weight === currentFontWeight ? ' selected' : '';
            html += `<option value="${weight}"${selected}>${FONT_WEIGHT_LABELS[i]}</option>`;
        });
        html += '</select></label>';

        toolbar.innerHTML = html;

        document.getElementById('combined-font-size').addEventListener('change', function () {
            currentFontSize = this.value;
            updateAxisStyles();
        });

        document.getElementById('combined-font-weight').addEventListener('change', function () {
            currentFontWeight = this.value;
            updateAxisStyles();
        });
    }

    function updateDetailPanel() {
        const content = document.getElementById('combined-content');
        if (!charts.length) return;

        if (selectedCategories.size === 0) {
            content.innerHTML = '<p class="no-selection">No categories selected. Drag on chart background, click labels, or use keyboard.</p>';
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

    function getSelectedFontWeight(idx) {
        if (selectedCategories.has(idx)) return 'bold';
        return currentFontWeight;
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
                tick.label.css({ fontWeight: currentFontWeight, color: '#333333', cursor: 'pointer' });
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

    // Keyboard-only: accessibility module fires click on Space/Enter
    function handlePointClick(e) {
        if (!isKeyboardInteraction) return;
        const accumulate = e.ctrlKey || e.metaKey || true;
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

    // Mouse background click: translate pixel coordinate to nearest category
    function handleBackgroundClick(e) {
        if (!e.xAxis) {
            clearSelection();
            return;
        }
        const xValue = Math.round(e.xAxis[0].value);
        if (xValue < 0 || xValue >= CATEGORIES.length) {
            clearSelection();
            return;
        }
        const accumulate = e.ctrlKey || e.metaKey;
        selectCategory(xValue, accumulate);
    }

    function createChart(containerId, type, title) {
        const chart = Highcharts.chart(containerId, {
            chart: {
                type: type,
                zooming: { type: 'x' },
                plotBackgroundColor: 'rgba(0,0,0,0)',
                events: {
                    selection: handleDragSelect,
                    click: handleBackgroundClick
                }
            },
            title: { text: title },
            subtitle: { text: 'Drag to select | Click background | Click labels | Keyboard: Tab → Arrow → Space' },
            xAxis: {
                categories: CATEGORIES,
                crosshair: { width: 1, color: '#aaa', dashStyle: 'Dash' },
                labels: {
                    style: { fontSize: currentFontSize, fontWeight: currentFontWeight }
                }
            },
            yAxis: {
                title: { text: 'Revenue ($K)' },
                labels: {
                    style: { fontSize: currentFontSize, fontWeight: currentFontWeight }
                }
            },
            plotOptions: {
                series: {
                    allowPointSelect: false,
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

        if (chart.plotBackground) {
            chart.plotBackground.css({ cursor: 'pointer' });
        }

        // Click on chart margins (title, padding, axis title area) clears selection.
        // chart.events.click only fires inside plot area — this catches the rest.
        // Skip if click was on an axis label (those have their own handlers).
        chart.container.addEventListener('click', function (e) {
            var target = e.target;
            while (target && target !== chart.container) {
                if (target.classList && target.classList.contains('highcharts-axis-labels')) return;
                target = target.parentNode;
            }

            const plotBox = chart.plotBox;
            const containerOffset = chart.container.getBoundingClientRect();
            const x = e.clientX - containerOffset.left;
            const y = e.clientY - containerOffset.top;

            const insidePlot = x >= plotBox.x && x <= plotBox.x + plotBox.width &&
                               y >= plotBox.y && y <= plotBox.y + plotBox.height;

            if (!insidePlot) {
                clearSelection();
            }
        });

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

        buildToolbar();

        charts = [
            createChart('combined-chart-column', 'column', 'Column — Combined Selection (SVG)'),
            createChart('combined-chart-line', 'line', 'Line — Combined Selection (SVG)'),
            createChart('combined-chart-area', 'area', 'Area — Combined Selection (SVG)')
        ];

        window.combinedChart = charts[0];
        updateDetailPanel();
    };
})();
