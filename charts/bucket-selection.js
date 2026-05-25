// =============================================================================
// BUCKET SELECTION - Select entire x-axis categories (all series at once)
//
// APPROACH: Instead of selecting individual points, we select "buckets" —
// entire x-axis categories. Clicking any bar or the x-axis label selects
// ALL points at that x index across ALL series.
//
// BUILT-IN Highcharts features used:
//   - xAxis.plotBands (addPlotBand/removePlotBand) → visual highlight of bucket
//   - xAxis.labels.useHTML + formatter → clickable x-axis labels (mouse only)
//   - point.select(selected, accumulate) → mark points as selected
//   - chart.getSelectedPoints() → retrieve selection
//   - accessibility module → Tab/Arrow keyboard navigation into chart bars
//
// CUSTOM implementation needed:
//   1. Bucket selection logic — selecting a point selects ALL points at that x
//   2. Clickable x-axis labels — useHTML labels with click handlers (mouse)
//   3. PlotBand management — add/remove plotBands to highlight selected buckets
//   4. Keyboard: Space/Enter accumulates (same pattern as axis-selection)
//   5. Keyboard: Shift+Arrow range selection via mouseOver hook
//   6. Keyboard: Escape to clear
//   7. Drag-to-select buckets — intercept chart selection event
//
// KEYBOARD APPROACH: Same pattern as axis-selection — accessibility module
// handles Tab/Arrow focus on bars. When a bar is activated (Space/Enter),
// we select the entire bucket at that x-index. Shift+Arrow extends selection.
// X-axis labels remain clickable by mouse but are NOT keyboard-navigated
// (the bars serve as the keyboard entry point).
//
// TRADE-OFF: Same as axis-selection — drag-to-select and zoom cannot coexist.
// =============================================================================

(function () {
    const BUCKET_CATEGORIES = ['Q1-2024', 'Q2-2024', 'Q3-2024', 'Q4-2024', 'Q1-2025', 'Q2-2025'];
    const HIGHLIGHT_COLOR = 'rgba(46, 204, 113, 0.15)';

    // Track selected bucket indices
    let selectedBuckets = new Set();

    // Track keyboard state (same pattern as axis-selection)
    let isKeyboardInteraction = false;
    let shiftKeyDown = false;

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Shift') shiftKeyDown = true;
    });
    document.addEventListener('keyup', function (e) {
        if (e.key === 'Shift') shiftKeyDown = false;
    });

    function updateBucketDetailPanel() {
        const content = document.getElementById('bucket-content');
        const chart = window.bucketChart;
        if (!chart) return;

        if (selectedBuckets.size === 0) {
            content.innerHTML = '<p class="no-selection">No buckets selected. Click a label or bar, Ctrl+Click for multiple, or drag to select a range.</p>';
            return;
        }

        let html = '<table><thead><tr><th>Category</th>';
        chart.series.forEach(s => { html += `<th>${s.name}</th>`; });
        html += '<th>Total</th></tr></thead><tbody>';

        const sortedBuckets = [...selectedBuckets].sort((a, b) => a - b);
        sortedBuckets.forEach(idx => {
            let total = 0;
            html += `<tr><td><strong>${BUCKET_CATEGORIES[idx]}</strong></td>`;
            chart.series.forEach(s => {
                const val = s.data[idx] ? s.data[idx].y : 0;
                total += val;
                html += `<td>${val}</td>`;
            });
            html += `<td><strong>${total}</strong></td></tr>`;
        });
        html += '</tbody></table>';
        html += `<p style="margin-top:10px;font-size:13px;color:#2c3e50;"><strong>${selectedBuckets.size}</strong> bucket(s) selected</p>`;
        content.innerHTML = html;
    }

    function syncPlotBands() {
        const chart = window.bucketChart;
        if (!chart) return;

        const axis = chart.xAxis[0];
        BUCKET_CATEGORIES.forEach((_, i) => {
            axis.removePlotBand('bucket-band-' + i);
        });

        selectedBuckets.forEach(idx => {
            axis.addPlotBand({
                from: idx - 0.5,
                to: idx + 0.5,
                color: HIGHLIGHT_COLOR,
                id: 'bucket-band-' + idx,
                zIndex: 0
            });
        });
    }

    function syncPointSelection() {
        const chart = window.bucketChart;
        if (!chart) return;

        chart.series.forEach(series => {
            series.points.forEach(point => {
                const shouldBeSelected = selectedBuckets.has(point.x);
                if (point.selected !== shouldBeSelected) {
                    point.select(shouldBeSelected, true);
                }
            });
        });
    }

    function selectBucket(idx, accumulate) {
        if (!accumulate) {
            selectedBuckets.clear();
        }

        if (selectedBuckets.has(idx)) {
            selectedBuckets.delete(idx);
        } else {
            selectedBuckets.add(idx);
        }

        syncPlotBands();
        syncPointSelection();
        updateBucketDetailPanel();
        updateLabelStyles();
    }

    function clearBuckets() {
        selectedBuckets.clear();
        syncPlotBands();
        syncPointSelection();
        updateBucketDetailPanel();
        updateLabelStyles();
    }

    function updateLabelStyles() {
        const labels = document.querySelectorAll('#bucket-chart .bucket-label');
        labels.forEach(label => {
            const idx = parseInt(label.dataset.index, 10);
            if (selectedBuckets.has(idx)) {
                label.style.fontWeight = 'bold';
                label.style.color = '#27ae60';
                label.style.borderBottom = '2px solid #27ae60';
            } else {
                label.style.fontWeight = 'normal';
                label.style.color = '#333';
                label.style.borderBottom = 'none';
            }
        });
    }

    // CUSTOM: Handle point click — selects entire bucket at that x-index
    function handleBucketPointClick(e) {
        const accumulate = e.ctrlKey || e.metaKey || isKeyboardInteraction;
        selectBucket(this.x, accumulate);
        isKeyboardInteraction = false;
    }

    // CUSTOM: Shift+Arrow range selection via mouseOver hook
    // Accessibility module fires mouseOver when navigating with Arrow keys.
    function handleBucketPointMouseOver() {
        if (shiftKeyDown && this.series.chart === window.bucketChart) {
            selectedBuckets.add(this.x);
            syncPlotBands();
            syncPointSelection();
            updateBucketDetailPanel();
            updateLabelStyles();
        }
    }

    // Handle drag to select buckets
    function selectBucketsByDrag(e) {
        if (!e.xAxis) return;

        const min = Math.floor(e.xAxis[0].min + 0.5);
        const max = Math.floor(e.xAxis[0].max + 0.5);

        for (let i = Math.max(0, min); i <= Math.min(BUCKET_CATEGORIES.length - 1, max); i++) {
            selectedBuckets.add(i);
        }

        syncPlotBands();
        syncPointSelection();
        updateBucketDetailPanel();
        updateLabelStyles();
        return false;
    }

    function clearOnBackgroundClick() {
        clearBuckets();
    }

    window.initBucketSelectionChart = function () {
        const chartContainer = document.getElementById('bucket-chart');

        // CUSTOM: Keydown listener for Space/Enter flag + Escape to clear
        // (same pattern as axis-selection)
        chartContainer.addEventListener('keydown', function (e) {
            if (e.key === ' ' || e.key === 'Enter') {
                isKeyboardInteraction = true;
            }
            if (e.key === 'Escape') {
                clearBuckets();
            }
        }, true);

        window.bucketChart = Highcharts.chart('bucket-chart', {
            chart: {
                type: 'column',
                zooming: { type: 'x' },
                events: {
                    selection: selectBucketsByDrag,
                    click: clearOnBackgroundClick
                }
            },
            title: {
                text: 'Quarterly Revenue — Bucket Selection'
            },
            subtitle: {
                text: 'Click label or bar to select entire category | Ctrl+Click for multi | Drag for range'
            },
            xAxis: {
                categories: BUCKET_CATEGORIES,
                labels: {
                    useHTML: true,
                    formatter: function () {
                        return `<span class="bucket-label" data-index="${this.pos}"
                            style="cursor:pointer; padding:4px 8px; display:inline-block;
                            border-radius:3px; transition: all 0.2s;"
                            tabindex="-1"
                            aria-hidden="true">${this.value}</span>`;
                    }
                },
                crosshair: {
                    width: 1,
                    color: '#aaa',
                    dashStyle: 'Dash'
                }
            },
            yAxis: {
                title: { text: 'Revenue ($K)' }
            },
            plotOptions: {
                series: {
                    allowPointSelect: false,
                    cursor: 'pointer',
                    states: {
                        select: {
                            color: '#2ecc71',
                            borderColor: '#27ae60',
                            borderWidth: 2
                        }
                    },
                    point: {
                        events: {
                            click: handleBucketPointClick,
                            mouseOver: handleBucketPointMouseOver
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
            // BUILT-IN: Accessibility keyboard navigation enabled — Tab into chart,
            // Arrow keys navigate bars, Space/Enter to select (we intercept via click handler)
            accessibility: {
                enabled: true,
                keyboardNavigation: {
                    enabled: true,
                    seriesNavigation: {
                        mode: 'normal'
                    }
                },
                point: {
                    valueDescriptionFormat: '{point.category}, {series.name}: {point.y}K revenue'
                }
            }
        });

        // Attach mouse click handlers to x-axis labels
        setTimeout(attachLabelClickHandlers, 200);
        Highcharts.addEvent(window.bucketChart, 'redraw', function () {
            setTimeout(attachLabelClickHandlers, 50);
        });

        updateBucketDetailPanel();
    };

    // X-axis labels are mouse-clickable only (keyboard goes through bars)
    function attachLabelClickHandlers() {
        const labels = document.querySelectorAll('#bucket-chart .bucket-label');
        labels.forEach(label => {
            if (label.dataset.bound) return;
            label.dataset.bound = 'true';

            label.addEventListener('click', function (e) {
                e.stopPropagation();
                const idx = parseInt(this.dataset.index, 10);
                const accumulate = e.ctrlKey || e.metaKey;
                selectBucket(idx, accumulate);
            });
        });
    }
})();
