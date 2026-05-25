// =============================================================================
// AXIS TICK SELECTION - Native accessible approach using real DOM buttons
//
// APPROACH: Since Highcharts has NO native axis-label click/select event,
// the most accessible approach is to render real <button> elements outside
// the chart SVG. These act as category selectors and get full keyboard
// accessibility from the browser for free:
//   - Tab focuses the toolbar
//   - Arrow keys move between buttons (role="toolbar" pattern)
//   - Space/Enter toggles selection
//   - No conflicts with Highcharts internal focus management
//
// BUILT-IN Highcharts features used:
//   - xAxis.plotBands → visual highlight of selected categories
//   - point.select(selected, accumulate) → mark points as selected
//   - chart.getSelectedPoints() → retrieve selection
//
// CUSTOM implementation:
//   1. HTML button toolbar below chart (category selector)
//   2. Arrow key navigation within toolbar (role="toolbar" + roving tabindex)
//   3. PlotBand sync when buttons are toggled
//   4. Multi-select via Ctrl+Click or Shift+Click for range
//   5. Escape to clear
//
// ADVANTAGE over useHTML label approach:
//   - Zero conflict with Highcharts accessibility module
//   - Standard keyboard patterns (no hacks needed)
//   - Screen reader announces buttons with pressed state
//   - Works identically in all browsers
// =============================================================================

(function () {
    const TICK_CATEGORIES = ['Q1-2024', 'Q2-2024', 'Q3-2024', 'Q4-2024', 'Q1-2025', 'Q2-2025'];
    const HIGHLIGHT_COLOR = 'rgba(155, 89, 182, 0.15)';

    let selectedTicks = new Set();
    let lastSelectedIdx = null;

    function updateTickDetailPanel() {
        const content = document.getElementById('tick-content');
        const chart = window.tickChart;
        if (!chart) return;

        if (selectedTicks.size === 0) {
            content.innerHTML = '<p class="no-selection">No categories selected. Use the buttons below the chart to select.</p>';
            return;
        }

        let html = '<table><thead><tr><th>Category</th>';
        chart.series.forEach(s => { html += `<th>${s.name}</th>`; });
        html += '<th>Total</th></tr></thead><tbody>';

        const sorted = [...selectedTicks].sort((a, b) => a - b);
        sorted.forEach(idx => {
            let total = 0;
            html += `<tr><td><strong>${TICK_CATEGORIES[idx]}</strong></td>`;
            chart.series.forEach(s => {
                const val = s.data[idx] ? s.data[idx].y : 0;
                total += val;
                html += `<td>${val}</td>`;
            });
            html += `<td><strong>${total}</strong></td></tr>`;
        });
        html += '</tbody></table>';
        html += `<p style="margin-top:10px;font-size:13px;color:#2c3e50;"><strong>${selectedTicks.size}</strong> category(ies) selected</p>`;
        content.innerHTML = html;
    }

    function syncPlotBands() {
        const chart = window.tickChart;
        if (!chart) return;

        const axis = chart.xAxis[0];
        TICK_CATEGORIES.forEach((_, i) => {
            axis.removePlotBand('tick-band-' + i);
        });

        selectedTicks.forEach(idx => {
            axis.addPlotBand({
                from: idx - 0.5,
                to: idx + 0.5,
                color: HIGHLIGHT_COLOR,
                id: 'tick-band-' + idx,
                zIndex: 0
            });
        });
    }

    function syncPointSelection() {
        const chart = window.tickChart;
        if (!chart) return;

        chart.series.forEach(series => {
            series.points.forEach(point => {
                const shouldBeSelected = selectedTicks.has(point.x);
                if (point.selected !== shouldBeSelected) {
                    point.select(shouldBeSelected, true);
                }
            });
        });
    }

    function syncButtonStates() {
        const buttons = document.querySelectorAll('#tick-toolbar .tick-btn');
        buttons.forEach(btn => {
            const idx = parseInt(btn.dataset.index, 10);
            const isSelected = selectedTicks.has(idx);
            btn.setAttribute('aria-pressed', isSelected);
            btn.classList.toggle('tick-btn-selected', isSelected);
        });
    }

    function selectTick(idx, accumulate, rangeSelect) {
        if (rangeSelect && lastSelectedIdx !== null) {
            const start = Math.min(lastSelectedIdx, idx);
            const end = Math.max(lastSelectedIdx, idx);
            for (let i = start; i <= end; i++) {
                selectedTicks.add(i);
            }
        } else if (!accumulate) {
            selectedTicks.clear();
            selectedTicks.add(idx);
        } else {
            if (selectedTicks.has(idx)) {
                selectedTicks.delete(idx);
            } else {
                selectedTicks.add(idx);
            }
        }

        lastSelectedIdx = idx;
        syncPlotBands();
        syncPointSelection();
        syncButtonStates();
        updateTickDetailPanel();
    }

    function clearTicks() {
        selectedTicks.clear();
        lastSelectedIdx = null;
        syncPlotBands();
        syncPointSelection();
        syncButtonStates();
        updateTickDetailPanel();
    }

    function buildToolbar() {
        const toolbar = document.getElementById('tick-toolbar');
        toolbar.innerHTML = '';

        TICK_CATEGORIES.forEach((cat, idx) => {
            const btn = document.createElement('button');
            btn.className = 'tick-btn';
            btn.textContent = cat;
            btn.dataset.index = idx;
            btn.setAttribute('aria-pressed', 'false');
            btn.setAttribute('aria-label', `Select ${cat}`);
            // Roving tabindex: first button is tabbable, rest are -1
            btn.setAttribute('tabindex', idx === 0 ? '0' : '-1');
            toolbar.appendChild(btn);
        });

        // Event delegation on toolbar
        toolbar.addEventListener('click', function (e) {
            const btn = e.target.closest('.tick-btn');
            if (!btn) return;
            const idx = parseInt(btn.dataset.index, 10);
            const accumulate = e.ctrlKey || e.metaKey;
            const range = e.shiftKey;
            selectTick(idx, accumulate, range);
        });

        toolbar.addEventListener('keydown', function (e) {
            const btn = e.target.closest('.tick-btn');
            if (!btn) return;
            const idx = parseInt(btn.dataset.index, 10);
            const buttons = toolbar.querySelectorAll('.tick-btn');

            // Arrow keys: roving tabindex navigation
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const nextIdx = e.key === 'ArrowRight'
                    ? (idx + 1) % TICK_CATEGORIES.length
                    : (idx - 1 + TICK_CATEGORIES.length) % TICK_CATEGORIES.length;

                btn.setAttribute('tabindex', '-1');
                buttons[nextIdx].setAttribute('tabindex', '0');
                buttons[nextIdx].focus();

                // Shift+Arrow: range select as you move
                if (e.shiftKey) {
                    selectedTicks.add(nextIdx);
                    syncPlotBands();
                    syncPointSelection();
                    syncButtonStates();
                    updateTickDetailPanel();
                    lastSelectedIdx = nextIdx;
                }
                return;
            }

            // Space/Enter: toggle (always accumulate for keyboard)
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                selectTick(idx, true, false);
                return;
            }

            // Escape: clear
            if (e.key === 'Escape') {
                e.preventDefault();
                clearTicks();
                return;
            }
        });
    }

    window.initTickSelectionChart = function () {
        window.tickChart = Highcharts.chart('tick-chart', {
            chart: {
                type: 'column'
            },
            title: {
                text: 'Quarterly Revenue — Axis Tick Selection'
            },
            subtitle: {
                text: 'Use the category buttons below to select | Ctrl+Click multi | Shift+Click range'
            },
            xAxis: {
                categories: TICK_CATEGORIES,
                labels: { enabled: false }
            },
            yAxis: {
                title: { text: 'Revenue ($K)' }
            },
            plotOptions: {
                series: {
                    allowPointSelect: false,
                    states: {
                        select: {
                            color: '#9b59b6',
                            borderColor: '#8e44ad',
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

        buildToolbar();
        updateTickDetailPanel();
    };
})();
