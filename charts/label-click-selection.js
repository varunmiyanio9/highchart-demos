// =============================================================================
// LABEL CLICK SELECTION - Interactive x-axis labels (mouse only)
//
// APPROACH: Use Highcharts xAxis.labels.useHTML to render clickable labels.
// Clicking a label selects that single bucket (category). Ctrl+Click for
// multi-select. Uses event delegation on chart container so handlers work
// even after redraws recreate the label DOM.
//
// BUILT-IN Highcharts features used:
//   - xAxis.labels (positioning, spacing, alignment, re-render on resize)
//   - xAxis.labels.useHTML + formatter → allows custom HTML inside native labels
//   - xAxis.plotBands (addPlotBand/removePlotBand) → highlight columns
//   - point.select(selected, accumulate) → mark points as selected
//   - chart.events.click → detect background clicks to clear selection
//
// CUSTOM implementation needed:
//   1. Event delegation click handler on container (detects clicks on labels)
//   2. Category index resolution via label textContent (data-* attrs are
//      stripped by Highcharts HTML sanitization)
//   3. PlotBand management — add/remove to highlight selected categories
//   4. CSS class toggle on labels for selected visual state
//   5. Detail panel update with selected category data
//
// NOTE: Highcharts sanitizes useHTML output and strips data-* attributes.
// We use label.textContent to identify which category was clicked.
//
// NOTE: plotBand changes trigger chart redraws which destroy and recreate
// label DOM. We re-apply label styles in the redraw callback.
// =============================================================================

(function () {
    const CATEGORIES = ['Q1-2024', 'Q2-2024', 'Q3-2024', 'Q4-2024', 'Q1-2025', 'Q2-2025'];
    const HIGHLIGHT_COLOR = 'rgba(230, 126, 34, 0.15)';

    let selectedLabels = new Set();

    function getIndexFromCategory(category) {
        return CATEGORIES.indexOf(category);
    }

    function updateLabelDetailPanel() {
        const content = document.getElementById('label-content');
        const chart = window.labelChart;
        if (!chart) return;

        if (selectedLabels.size === 0) {
            content.innerHTML = '<p class="no-selection">No categories selected. Click an x-axis label to select.</p>';
            return;
        }

        let html = '<table><thead><tr><th>Category</th>';
        chart.series.forEach(s => { html += `<th>${s.name}</th>`; });
        html += '<th>Total</th></tr></thead><tbody>';

        const sorted = [...selectedLabels].sort((a, b) => a - b);
        sorted.forEach(idx => {
            let total = 0;
            html += `<tr><td><strong>${CATEGORIES[idx]}</strong></td>`;
            chart.series.forEach(s => {
                const val = s.data[idx] ? s.data[idx].y : 0;
                total += val;
                html += `<td>${val}</td>`;
            });
            html += `<td><strong>${total}</strong></td></tr>`;
        });
        html += '</tbody></table>';
        html += `<p style="margin-top:10px;font-size:13px;color:#2c3e50;"><strong>${selectedLabels.size}</strong> category(ies) selected</p>`;
        content.innerHTML = html;
    }

    function syncPlotBands() {
        const chart = window.labelChart;
        if (!chart) return;

        const axis = chart.xAxis[0];
        CATEGORIES.forEach((_, i) => {
            axis.removePlotBand('label-band-' + i);
        });

        selectedLabels.forEach(idx => {
            axis.addPlotBand({
                from: idx - 0.5,
                to: idx + 0.5,
                color: HIGHLIGHT_COLOR,
                id: 'label-band-' + idx,
                zIndex: 0
            });
        });
    }

    function syncPointSelection() {
        const chart = window.labelChart;
        if (!chart) return;

        chart.series.forEach(series => {
            series.points.forEach(point => {
                const shouldBeSelected = selectedLabels.has(point.x);
                if (point.selected !== shouldBeSelected) {
                    point.select(shouldBeSelected, true);
                }
            });
        });
    }

    function updateLabelStyles() {
        const labels = document.querySelectorAll('#label-chart .label-click');
        labels.forEach(label => {
            const category = label.textContent.trim();
            const idx = getIndexFromCategory(category);
            if (idx >= 0 && selectedLabels.has(idx)) {
                label.classList.add('label-click-selected');
            } else {
                label.classList.remove('label-click-selected');
            }
        });
    }

    function selectLabel(idx, accumulate) {
        if (idx < 0 || idx >= CATEGORIES.length) return;

        if (!accumulate) {
            selectedLabels.clear();
        }

        if (selectedLabels.has(idx)) {
            selectedLabels.delete(idx);
        } else {
            selectedLabels.add(idx);
        }

        syncPointSelection();
        syncPlotBands();
        updateLabelDetailPanel();
    }

    function clearLabels() {
        if (selectedLabels.size === 0) return;
        selectedLabels.clear();
        syncPointSelection();
        syncPlotBands();
        updateLabelDetailPanel();
    }

    window.initLabelClickChart = function () {
        const container = document.getElementById('label-chart');

        // CUSTOM: Event delegation — detects clicks on .label-click spans.
        // Uses textContent to identify category (data-* attrs stripped by Highcharts).
        container.addEventListener('click', function (e) {
            const label = e.target.closest('.label-click');
            if (label) {
                const category = label.textContent.trim();
                const idx = getIndexFromCategory(category);
                if (idx < 0) return;
                const accumulate = e.ctrlKey || e.metaKey;
                selectLabel(idx, accumulate);
                return;
            }
        });

        window.labelChart = Highcharts.chart('label-chart', {
            chart: {
                type: 'column',
                events: {
                    click: clearLabels
                }
            },
            title: {
                text: 'Quarterly Revenue — Label Click Selection'
            },
            subtitle: {
                text: 'Click x-axis labels to select category | Ctrl+Click for multi-select'
            },
            xAxis: {
                categories: CATEGORIES,
                labels: {
                    useHTML: true,
                    formatter: function () {
                        return '<span class="label-click" data-category="' + this.value + '">' + this.value + '</span>';
                    }
                }
            },
            yAxis: {
                title: { text: 'Revenue ($K)' }
            },
            plotOptions: {
                series: {
                    allowPointSelect: false,
                    states: {
                        select: {
                            color: '#e67e22',
                            borderColor: '#d35400',
                            borderWidth: 2
                        }
                    }
                }
            },
            series: [{
                name: 'North America',
                data: [120, 135, 148, 162, 175, 190]
            }, {
                name: 'Europe',
                data: [95, 102, 110, 98, 115, 125]
            }, {
                name: 'Asia Pacific',
                data: [68, 74, 82, 91, 103, 112]
            }],
            accessibility: {
                enabled: true,
                point: {
                    valueDescriptionFormat: '{point.category}, {series.name}: {point.y}K revenue'
                }
            }
        });

        // Update label styles after redraws (plotBands recreate label DOM)
        Highcharts.addEvent(window.labelChart, 'redraw', function () {
            setTimeout(updateLabelStyles, 50);
        });

        updateLabelDetailPanel();
    };
})();
