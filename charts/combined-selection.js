// =============================================================================
// COMBINED SELECTION — Multi Chart Type with Bidirectional Label Selection
//
// Combines bucket-selection (multi-chart, drag-select, keyboard) with
// label-click-selection (interactive x-axis labels). Key behaviors:
//   1. Column, Line, Area charts sharing selection state
//   2. Drag-to-select → green plotBand on background, bars keep original color
//   3. Selected labels get green text feedback
//   4. Clicking x-axis labels selects categories (Ctrl+Click multi-select)
//   5. Keyboard: Tab into chart → Arrow → Space/Enter to toggle selection
//
// BUILT-IN Highcharts features used:
//   - xAxis.labels.useHTML + formatter → clickable label HTML
//   - xAxis.plotBands → background highlight (no bar color change)
//   - chart.zooming.type: 'x' + chart.events.selection → drag select
//   - accessibility.keyboardNavigation → keyboard entry into chart
//
// CUSTOM implementation:
//   - Event delegation on containers for label clicks (textContent pattern)
//   - PlotBand management for selected categories
//   - CSS class toggle on labels for green selected state
//   - Shared selection state across three chart types
//   - isKeyboardInteraction flag for Space/Enter accumulate behavior
//   - Shift+Arrow range select via mouseOver
//
// NOTE: Highcharts strips data-* attributes from useHTML output.
// We identify labels via textContent.trim().
//
// NOTE: plotBand changes trigger redraws that recreate label DOM.
// Label styles are re-applied in redraw callback.
// =============================================================================

(function () {
    const CATEGORIES = ['Q1-2024', 'Q2-2024', 'Q3-2024', 'Q4-2024', 'Q1-2025', 'Q2-2025'];
    const HIGHLIGHT_COLOR = 'rgba(46, 204, 113, 0.15)';
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

    function getIndexFromCategory(category) {
        return CATEGORIES.indexOf(category);
    }

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

    function updateLabelStyles() {
        const labels = document.querySelectorAll('#combined-selection .combined-label');
        labels.forEach(label => {
            const category = label.textContent.trim();
            const idx = getIndexFromCategory(category);
            if (idx >= 0 && selectedCategories.has(idx)) {
                label.classList.add('combined-label-selected');
            } else {
                label.classList.remove('combined-label-selected');
            }
        });
    }

    function syncAllCharts() {
        charts.forEach(chart => {
            const axis = chart.xAxis[0];
            CATEGORIES.forEach((_, i) => {
                axis.removePlotBand('combined-band-' + i);
            });
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
        updateLabelStyles();
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
        return Highcharts.chart(containerId, {
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
                    useHTML: true,
                    formatter: function () {
                        return '<span class="combined-label">' + this.value + '</span>';
                    }
                }
            },
            yAxis: { title: { text: 'Revenue ($K)' } },
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
    }

    window.initCombinedSelectionChart = function () {
        const wrapper = document.getElementById('combined-selection');

        wrapper.addEventListener('keydown', function (e) {
            if (e.key === ' ' || e.key === 'Enter') isKeyboardInteraction = true;
            if (e.key === 'Escape') clearSelection();
        }, true);

        // Event delegation for label clicks (textContent pattern — data-* attrs stripped by Highcharts)
        wrapper.addEventListener('click', function (e) {
            const label = e.target.closest('.combined-label');
            if (label) {
                const category = label.textContent.trim();
                const idx = getIndexFromCategory(category);
                if (idx < 0) return;
                const accumulate = e.ctrlKey || e.metaKey;
                selectCategory(idx, accumulate);
                e.stopPropagation();
            }
        });

        charts = [
            createChart('combined-chart-column', 'column', 'Column — Combined Selection'),
            createChart('combined-chart-line', 'line', 'Line — Combined Selection'),
            createChart('combined-chart-area', 'area', 'Area — Combined Selection')
        ];

        charts.forEach(chart => {
            Highcharts.addEvent(chart, 'redraw', function () {
                setTimeout(updateLabelStyles, 50);
            });
        });

        window.combinedChart = charts[0];
        updateDetailPanel();
    };
})();
