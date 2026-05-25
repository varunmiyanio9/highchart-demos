// =============================================================================
// CUSTOM IMPLEMENTATION NOTES:
//
// Highcharts provides built-in:
//   - allowPointSelect: true → click to select, Ctrl+Click to multi-select
//   - chart.events.selection → drag-to-select (with zooming.type set)
//   - accessibility module → Tab/Arrow/Space keyboard navigation
//   - point.select(selected, accumulate) → programmatic selection API
//   - states.select → visual styling for selected points
//   - chart.getSelectedPoints() → retrieve current selection
//
// What we had to CUSTOM implement:
//   1. Space/Enter accumulate (keyboard multi-select)
//      → Built-in accessibility treats Space/Enter as plain click (deselects others)
//      → We set allowPointSelect:false and handle all selection in point.events.click
//      → We track a flag (isKeyboardInteraction) to know when to accumulate
//
//   2. Shift+Arrow range selection
//      → Not built-in at all
//      → We track shiftKeyDown state globally
//      → We hook into point.events.mouseOver (fired by accessibility module on navigate)
//      → If Shift is held when a new point is focused, we select it with accumulate
//
//   3. Escape to clear selection
//      → Not built-in
//      → Simple keydown listener that deselects all points
//
//   4. Manual click selection logic (handlePointClick)
//      → Because we disabled allowPointSelect to control accumulate behavior
//      → We manually implement: plain click = single select, Ctrl+Click = toggle
//
// =============================================================================
// TRADE-OFF: Drag-to-select vs Zoom — CANNOT coexist
//
//   Highcharts uses the same mouse gesture (click+drag) for BOTH zooming and
//   the chart.events.selection callback. We use zooming.type:'x' to enable the
//   drag gesture, but then return false from the selection handler to PREVENT
//   the actual zoom and use the coordinates for point selection instead.
//
//   This means:
//     - Drag-to-select works ✓
//     - Zoom on drag does NOT work ✗ (we cancel it)
//     - You cannot have both drag-to-zoom AND drag-to-select simultaneously
//
//   Possible workarounds if you need both:
//     a) Use a toggle button/mode switch (e.g. "Zoom mode" vs "Select mode")
//        that changes whether the selection handler returns false or not.
//     b) Use a modifier key: e.g. plain drag = zoom, Ctrl+drag = select
//        (check e.originalEvent.ctrlKey in the selection handler)
//     c) Use Highcharts Stock navigator for zooming and keep drag for selection
//
// =============================================================================

// --- CUSTOM: Track keyboard state for Shift+Arrow range selection ---
let isKeyboardInteraction = false;
let shiftKeyDown = false;

document.addEventListener('keydown', function (e) {
    if (e.key === 'Shift') shiftKeyDown = true;
});
document.addEventListener('keyup', function (e) {
    if (e.key === 'Shift') shiftKeyDown = false;
});

// --- BUILT-IN PATTERN: Update external widget based on chart.getSelectedPoints() ---
function updateDetailPanel(chart) {
    const selected = chart.getSelectedPoints();
    const content = document.getElementById('detail-content');

    if (selected.length === 0) {
        content.innerHTML = '<p class="no-selection">No points selected. Try clicking a bar, Ctrl+clicking multiple, or dragging to select a range.</p>';
        return;
    }

    let html = '<table><thead><tr><th>Category</th><th>Series</th><th>Value</th></tr></thead><tbody>';
    selected.forEach(point => {
        html += `<tr><td>${point.category}</td><td>${point.series.name}</td><td>${point.y}</td></tr>`;
    });
    html += '</tbody></table>';
    html += `<p style="margin-top:10px;font-size:13px;color:#2c3e50;"><strong>${selected.length}</strong> point(s) selected</p>`;
    content.innerHTML = html;
}

// --- BUILT-IN PATTERN: chart.events.selection for drag-to-select ---
// (Only custom part: return false to prevent default zoom behavior)
function selectPointsByDrag(e) {
    if (!e.xAxis) return;

    this.series.forEach(series => {
        series.points.forEach(point => {
            if (point.x >= e.xAxis[0].min && point.x <= e.xAxis[0].max) {
                point.select(true, true);
            }
        });
    });

    updateDetailPanel(this);
    return false; // CUSTOM: prevent default zoom, use selection instead
}

// --- BUILT-IN PATTERN: chart.events.click to deselect on blank area click ---
function unselectByClick() {
    const points = this.getSelectedPoints();
    if (points.length > 0) {
        points.forEach(point => point.select(false));
    }
    updateDetailPanel(this);
}

// --- CUSTOM: Manual click handler (replaces built-in allowPointSelect) ---
// Needed because built-in allowPointSelect doesn't accumulate on keyboard Space/Enter
function handlePointClick(e) {
    const accumulate = e.ctrlKey || e.metaKey || isKeyboardInteraction;

    if (!accumulate) {
        // Plain click: deselect all others first
        this.series.chart.getSelectedPoints().forEach(p => {
            if (p !== this) p.select(false, true);
        });
    }

    // Toggle this point
    this.select(!this.selected, true);
    isKeyboardInteraction = false;
    updateDetailPanel(this.series.chart);
}

// --- CUSTOM: Shift+Arrow range selection via mouseOver hook ---
// Accessibility module fires mouseOver when navigating to a point with Arrow keys.
// We detect if Shift is held and auto-select the point.
function handlePointMouseOver() {
    if (shiftKeyDown && this.series.chart === window.selectionChart) {
        this.select(true, true);
        updateDetailPanel(this.series.chart);
    }
}

function initAxisSelectionChart() {
    const categories = ['Q1-2024', 'Q2-2024', 'Q3-2024', 'Q4-2024', 'Q1-2025', 'Q2-2025'];

    const chartContainer = document.getElementById('selection-chart');

    // --- CUSTOM: Keydown listener for Space/Enter flag + Escape to clear ---
    chartContainer.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') {
            isKeyboardInteraction = true;
        }
        if (e.key === 'Escape') {
            const chart = window.selectionChart;
            if (chart) {
                chart.getSelectedPoints().forEach(p => p.select(false));
                updateDetailPanel(chart);
            }
        }
    }, true);

    window.selectionChart = Highcharts.chart('selection-chart', {
        chart: {
            type: 'column',
            zooming: {
                type: 'x' // BUILT-IN: enables drag-to-select area
            },
            events: {
                selection: selectPointsByDrag,  // BUILT-IN event, custom handler
                click: unselectByClick          // BUILT-IN event for blank area click
            }
        },
        title: {
            text: 'Quarterly Revenue — Select to View Details'
        },
        subtitle: {
            text: 'Click | Ctrl+Click | Drag | Keyboard (Tab → Arrows → Space)'
        },
        xAxis: {
            categories: categories,
            crosshair: true
        },
        yAxis: {
            title: { text: 'Revenue ($K)' }
        },
        plotOptions: {
            series: {
                // CUSTOM: We set allowPointSelect to false and handle selection manually
                // so that keyboard Space/Enter can accumulate selections.
                // If you only needed mouse Ctrl+Click, allowPointSelect:true would suffice.
                allowPointSelect: false,
                cursor: 'pointer',
                states: {
                    // BUILT-IN: Visual styling applied when point.select(true) is called
                    select: {
                        color: '#2ecc71',
                        borderColor: '#27ae60',
                        borderWidth: 2
                    }
                },
                point: {
                    events: {
                        click: handlePointClick,       // CUSTOM: replaces allowPointSelect logic
                        mouseOver: handlePointMouseOver // CUSTOM: Shift+Arrow range select
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
        }],
        // BUILT-IN: Accessibility module provides Tab/Arrow/Space navigation out of the box
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

    updateDetailPanel(window.selectionChart);
}
