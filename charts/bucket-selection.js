// =============================================================================
// BUCKET SELECTION — Multi Chart Type Demo (Column, Line, Area)
//
// Shared selection state across three chart types. Selecting a bucket in any
// chart selects it in all charts and updates a single summary table.
// =============================================================================

(function () {
    const BUCKET_CATEGORIES = ['Q1-2024', 'Q2-2024', 'Q3-2024', 'Q4-2024', 'Q1-2025', 'Q2-2025'];
    const HIGHLIGHT_COLOR = 'rgba(46, 204, 113, 0.15)';
    const SERIES_DATA = [
        { name: 'North America', data: [120, 135, 148, 162, 175, 190] },
        { name: 'Europe', data: [95, 102, 110, 98, 115, 125] },
        { name: 'Asia Pacific', data: [68, 74, 82, 91, 103, 112] }
    ];

    let selectedBuckets = new Set();
    let isKeyboardInteraction = false;
    let shiftKeyDown = false;
    let charts = [];

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Shift') shiftKeyDown = true;
    });
    document.addEventListener('keyup', function (e) {
        if (e.key === 'Shift') shiftKeyDown = false;
    });

    function updateBucketDetailPanel() {
        const content = document.getElementById('bucket-content');
        if (!charts.length) return;

        if (selectedBuckets.size === 0) {
            content.innerHTML = '<p class="no-selection">No buckets selected. Click a point, Ctrl+Click for multiple, or drag to select a range.</p>';
            return;
        }

        let html = '<table><thead><tr><th>Category</th>';
        SERIES_DATA.forEach(s => { html += `<th>${s.name}</th>`; });
        html += '<th>Total</th></tr></thead><tbody>';

        const sortedBuckets = [...selectedBuckets].sort((a, b) => a - b);
        sortedBuckets.forEach(idx => {
            let total = 0;
            html += `<tr><td><strong>${BUCKET_CATEGORIES[idx]}</strong></td>`;
            SERIES_DATA.forEach(s => {
                const val = s.data[idx] || 0;
                total += val;
                html += `<td>${val}</td>`;
            });
            html += `<td><strong>${total}</strong></td></tr>`;
        });
        html += '</tbody></table>';
        html += `<p style="margin-top:10px;font-size:13px;color:#2c3e50;"><strong>${selectedBuckets.size}</strong> bucket(s) selected</p>`;
        content.innerHTML = html;
    }

    function syncAllCharts() {
        charts.forEach(chart => {
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
            chart.series.forEach(series => {
                series.points.forEach(point => {
                    const shouldBeSelected = selectedBuckets.has(point.x);
                    if (point.selected !== shouldBeSelected) {
                        point.select(shouldBeSelected, true);
                    }
                });
            });
        });
        updateBucketDetailPanel();
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
        syncAllCharts();
    }

    function clearBuckets() {
        selectedBuckets.clear();
        syncAllCharts();
    }

    function handlePointClick(e) {
        const accumulate = e.ctrlKey || e.metaKey || isKeyboardInteraction;
        selectBucket(this.x, accumulate);
        isKeyboardInteraction = false;
    }

    function handlePointMouseOver() {
        if (shiftKeyDown) {
            selectedBuckets.add(this.x);
            syncAllCharts();
        }
    }

    function handleDragSelect(e) {
        if (!e.xAxis) return;
        const min = Math.floor(e.xAxis[0].min + 0.5);
        const max = Math.floor(e.xAxis[0].max + 0.5);
        for (let i = Math.max(0, min); i <= Math.min(BUCKET_CATEGORIES.length - 1, max); i++) {
            selectedBuckets.add(i);
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
                    click: clearBuckets
                }
            },
            title: { text: title },
            subtitle: { text: 'Click to select bucket | Ctrl+Click multi | Drag range' },
            xAxis: {
                categories: BUCKET_CATEGORIES,
                crosshair: { width: 1, color: '#aaa', dashStyle: 'Dash' }
            },
            yAxis: { title: { text: 'Revenue ($K)' } },
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

    window.initBucketSelectionChart = function () {
        const wrapper = document.getElementById('bucket-selection');
        wrapper.addEventListener('keydown', function (e) {
            if (e.key === ' ' || e.key === 'Enter') isKeyboardInteraction = true;
            if (e.key === 'Escape') clearBuckets();
        }, true);

        charts = [
            createChart('bucket-chart-column', 'column', 'Column Chart — Bucket Selection'),
            createChart('bucket-chart-line', 'line', 'Line Chart — Bucket Selection'),
            createChart('bucket-chart-area', 'area', 'Area Chart — Bucket Selection')
        ];

        window.bucketChart = charts[0];
        updateBucketDetailPanel();
    };
})();
