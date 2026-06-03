// =============================================================================
// CONTEXT MENU DEMO — Two Approaches
//
// CHART 1 — HIGHCHARTS-NATIVE (built-in exporting module):
//   - exporting.buttons.contextButton.menuItems   → flat menu with {text, onclick}
//   - navigation.menuItemStyle / menuItemHoverStyle → styling the native menu
//   - 'downloadPNG', 'viewFullscreen', 'printChart' → built-in named actions
//   - chart.update() / series.update()             → type switching via HC API
//   100% Highcharts config — no custom HTML, CSS, or event wiring needed.
//
// CHART 2 — FULLY CUSTOM IMPLEMENTATION (right-click nested context menu):
//   Highcharts does NOT provide: right-click menus, nested submenus, or
//   per-series targeting. Everything below is custom:
//
//   Custom HTML  → menu DOM in index.html (#ctx-custom-menu), nested <ul> structure
//   Custom CSS   → .ctx-menu, .ctx-menu-sub, hover-reveal nesting, active checkmark
//   Custom JS    → contextmenu event listener, event delegation, edge-aware positioning
//   Custom UX    → highlight locking (series stays highlighted while menu is open),
//                  per-series type switching (only the right-clicked series changes),
//                  active indicator (checkmark on current type), Escape/click-outside dismiss
//
//   Only these parts use Highcharts API:
//   - chart.hoverSeries / chart.hoverPoint   → detect which series was right-clicked
//   - series.setState('hover'/'inactive'/'') → lock/clear visual highlight
//   - series.update({type, stacking})        → change type of targeted series
//   - chart.exportChart({type})              → export via HC exporting module
//   - chart.fullscreen.toggle() / chart.print() → HC built-in actions
// =============================================================================

function initContextMenuCharts() {
    var categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    var seriesData = [
        { name: 'Product A', data: [49, 71, 106, 129, 144, 176] },
        { name: 'Product B', data: [83, 78, 98, 93, 106, 84] },
        { name: 'Product C', data: [62, 55, 72, 88, 95, 110] }
    ];

    // --- Highcharts-native: series.update() to change type ---
    function switchType(chart, type) {
        chart.update({ chart: { type: type }, plotOptions: { series: { stacking: undefined } } }, false);
        chart.series.forEach(function (s) { s.update({ type: type, stacking: undefined }, false); });
        chart.redraw();
    }

    function switchTypeStacked(chart) {
        chart.update({ chart: { type: 'column' }, plotOptions: { series: { stacking: 'normal' } } }, false);
        chart.series.forEach(function (s) { s.update({ type: 'column', stacking: 'normal' }, false); });
        chart.redraw();
    }

    // Custom: split a single series into 3 stacked sub-series
    // Tracks original data so we can merge back later
    var splitRegistry = {}; // { originalName: { data: [...], color: '...' } }

    function splitSeriesToStack(chart, series) {
        var name = series.name;
        var data = series.options.data.slice();
        var color = series.color;
        var seriesIndex = series.index;

        // Save original so we can restore on unstack
        splitRegistry[name] = { data: data, color: color, index: seriesIndex };

        // Split data into 3 sub-items that sum to original values
        var sub1 = [], sub2 = [], sub3 = [];
        for (var i = 0; i < data.length; i++) {
            var val = data[i];
            var a = Math.round(val * 0.45);
            var b = Math.round(val * 0.30);
            var c = val - a - b;
            sub1.push(a);
            sub2.push(b);
            sub3.push(c);
        }

        // Remove original series
        series.remove(false);

        // Add 3 sub-series at the same position with stacking
        chart.addSeries({
            name: name + '-1', data: sub1, type: 'column',
            stacking: 'normal', stack: name, color: color,
            _splitParent: name
        }, false);
        chart.addSeries({
            name: name + '-2', data: sub2, type: 'column',
            stacking: 'normal', stack: name,
            color: Highcharts.color(color).brighten(0.15).get(),
            _splitParent: name
        }, false);
        chart.addSeries({
            name: name + '-3', data: sub3, type: 'column',
            stacking: 'normal', stack: name,
            color: Highcharts.color(color).brighten(0.3).get(),
            _splitParent: name
        }, false);

        chart.redraw();
    }

    // Custom: merge split sub-series back into original single series
    function mergeSplitSeries(chart, parentName, newType) {
        var original = splitRegistry[parentName];
        if (!original) return;

        // Remove all sub-series belonging to this parent
        var toRemove = chart.series.filter(function (s) {
            return s.options._splitParent === parentName;
        });
        toRemove.forEach(function (s) { s.remove(false); });

        // Re-add original series with new type
        chart.addSeries({
            name: parentName, data: original.data, type: newType,
            color: original.color, stacking: undefined
        }, false);

        chart.redraw();
        delete splitRegistry[parentName];
    }

    // Check if a series is a split child
    function getSplitParent(series) {
        return series.options._splitParent || null;
    }

    // Check if a series name has been split
    function isSplit(name) {
        return !!splitRegistry[name];
    }

    // =========================================================================
    // CHART 1: Highcharts-native exporting menu with custom menuItems
    // Everything here is Highcharts config — the library renders the menu.
    // =========================================================================
    Highcharts.chart('ctx-builtin-chart', {
        chart: { type: 'column' },
        title: { text: 'Built-in Context Button — Chart Type Switcher' },
        subtitle: { text: 'Click the hamburger menu (\u2630) in the top-right corner' },
        xAxis: { categories: categories },
        yAxis: { title: { text: 'Sales (units)' } },
        series: JSON.parse(JSON.stringify(seriesData)),

        // Highcharts-native: exporting.buttons.contextButton.menuItems
        // Accepts array of {text, onclick, separator} or named string presets
        exporting: {
            buttons: {
                contextButton: {
                    menuItems: [
                        { text: 'Switch to Line', onclick: function () { switchType(this, 'line'); } },
                        { text: 'Switch to Bar', onclick: function () { switchType(this, 'column'); } },
                        { text: 'Switch to Area', onclick: function () { switchType(this, 'area'); } },
                        { text: 'Switch to Stacked Bar', onclick: function () { switchTypeStacked(this); } },
                        { separator: true },
                        'downloadPNG',   // Highcharts built-in preset
                        'downloadSVG',   // Highcharts built-in preset
                        'downloadPDF',   // Highcharts built-in preset
                        { separator: true },
                        'viewFullscreen', // Highcharts built-in preset
                        'printChart'      // Highcharts built-in preset
                    ]
                }
            }
        },

        // Highcharts-native: navigation.menuItemStyle styles the exporting menu
        navigation: {
            menuItemStyle: { fontSize: '13px', padding: '8px 16px' },
            menuItemHoverStyle: { background: '#f0f4ff' }
        }
    });

    // =========================================================================
    // CHART 2: Custom right-click context menu (fully custom implementation)
    // The chart itself is Highcharts-native; everything else is custom code.
    // =========================================================================
    var chart2 = Highcharts.chart('ctx-custom-chart', {
        chart: { type: 'column' },
        title: { text: 'Custom Right-Click Context Menu — Nested Submenus' },
        subtitle: { text: 'Right-click on a series/bar for a nested context menu' },
        xAxis: { categories: categories },
        yAxis: { title: { text: 'Sales (units)' } },
        plotOptions: {
            series: {
                // Highcharts-native: stickyTracking keeps hoverSeries reference longer
                stickyTracking: true,
                // Highcharts-native: states config for hover/inactive appearance
                states: {
                    hover: { enabled: true, brightness: 0.1 },
                    inactive: { opacity: 0.3 }
                },
                // Custom: intercept mouseOut to re-lock highlight while menu is open
                point: {
                    events: {
                        mouseOut: function () {
                            if (menu.style.display === 'block') {
                                lockHighlight();
                            }
                        }
                    }
                },
                events: {
                    mouseOut: function () {
                        if (menu.style.display === 'block') {
                            lockHighlight();
                        }
                    }
                }
            }
        },
        series: JSON.parse(JSON.stringify(seriesData)),
        // Disable built-in hamburger button — we use custom right-click instead
        exporting: {
            buttons: { contextButton: { enabled: false } }
        }
    });

    // =========================================================================
    // CUSTOM: Context menu logic — all below is custom implementation
    // Highcharts provides NO right-click menu, NO nested submenus, NO highlight
    // locking, and NO per-series targeting from a menu.
    // =========================================================================
    var menu = document.getElementById('ctx-custom-menu');
    var menuSeriesLabel = document.getElementById('ctx-menu-series-label');
    var chartContainer = document.getElementById('ctx-custom-chart');
    var targetSeries = null;
    var targetPoint = null;

    // Custom: lock the highlight on the right-clicked series using HC setState API
    function lockHighlight() {
        if (targetSeries) {
            targetSeries.setState('hover');
            chart2.series.forEach(function (s) {
                if (s !== targetSeries) s.setState('inactive');
            });
        }
        if (targetPoint) {
            targetPoint.setState('hover');
        }
    }

    // Custom: clear all series/point highlight states back to normal
    function clearHighlight() {
        chart2.series.forEach(function (s) {
            s.setState('');
            s.points.forEach(function (p) { p.setState(''); });
        });
        targetSeries = null;
        targetPoint = null;
    }

    // Custom: hide menu + release highlight
    function hideMenu() {
        menu.style.display = 'none';
        clearHighlight();
    }

    // Custom: open context menu on right-click (browser contextmenu event)
    chartContainer.addEventListener('contextmenu', function (e) {
        e.preventDefault();

        // Highcharts-native: hoverSeries/hoverPoint tells us what was under cursor
        targetSeries = chart2.hoverSeries || null;
        targetPoint = chart2.hoverPoint || null;

        // Custom: lock highlight so series stays visually focused while menu is open
        lockHighlight();

        // Custom: update menu header to show targeted series name
        if (targetSeries) {
            var parentName = getSplitParent(targetSeries);
            var displayName = parentName || targetSeries.name;
            menuSeriesLabel.textContent = 'Change Type: ' + displayName;
        } else {
            menuSeriesLabel.textContent = 'Change Type (all series)';
        }

        updateActiveIndicator();

        // Custom: position menu at cursor coordinates
        menu.style.display = 'block';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';

        // Custom: edge-aware repositioning if menu overflows viewport
        requestAnimationFrame(function () {
            var rect = menu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
            }
        });
    });

    // Custom: dismiss menu on outside click
    document.addEventListener('click', function (e) {
        if (!menu.contains(e.target)) {
            hideMenu();
        }
    });

    // Custom: dismiss menu on Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') hideMenu();
    });

    // Custom: event delegation on menu items (data-type, data-export, data-action)
    menu.addEventListener('click', function (e) {
        var item = e.target.closest('[data-type], [data-export], [data-action]');
        if (!item) return;

        var type = item.dataset.type;
        var exportFmt = item.dataset.export;
        var action = item.dataset.action;

        if (type) {
            // Custom: apply type change only to the targeted series (not all)
            if (targetSeries) {
                var parentName = getSplitParent(targetSeries);

                if (type === 'stacked') {
                    if (parentName) {
                        // Already stacked (this is a sub-series), do nothing
                    } else if (isSplit(targetSeries.name)) {
                        // Already split, do nothing
                    } else {
                        // Split this series into 3 stacked sub-series
                        splitSeriesToStack(chart2, targetSeries);
                    }
                } else {
                    if (parentName) {
                        // This is a sub-series — merge back into single series with new type
                        mergeSplitSeries(chart2, parentName, type);
                    } else if (isSplit(targetSeries.name)) {
                        // Clicking the parent name somehow — merge back
                        mergeSplitSeries(chart2, targetSeries.name, type);
                    } else {
                        // Normal series — just change type
                        targetSeries.update({ type: type, stacking: undefined });
                    }
                }
            } else {
                // Fallback: if right-clicked on empty area, change all series
                if (type === 'stacked') {
                    switchTypeStacked(chart2);
                } else {
                    switchType(chart2, type);
                }
            }
        } else if (exportFmt) {
            // Highcharts-native: chart.exportChart() from exporting module
            var typeMap = { png: 'image/png', svg: 'image/svg+xml', pdf: 'application/pdf' };
            chart2.exportChart({ type: typeMap[exportFmt] });
        } else if (action === 'fullscreen') {
            // Highcharts-native: fullscreen API from exporting module
            chart2.fullscreen.toggle();
        } else if (action === 'print') {
            // Highcharts-native: print API from exporting module
            chart2.print();
        }

        hideMenu();
    });

    // Custom: show checkmark on the menu item matching the series' current type
    function updateActiveIndicator() {
        var currentType = '';
        if (targetSeries) {
            var parentName = getSplitParent(targetSeries);
            if (parentName || isSplit(targetSeries.name)) {
                currentType = 'stacked';
            } else {
                currentType = targetSeries.type;
            }
        }
        menu.querySelectorAll('[data-type]').forEach(function (el) {
            el.classList.toggle('ctx-menu-item--active', el.dataset.type === currentType);
        });
    }
}
