// Sidebar pages — derived from PAGE_META (defined in chart-registry.js)
var CHARTS = Object.keys(PAGE_META).map(function (id) {
    return { id: id, name: PAGE_META[id].name, description: PAGE_META[id].description };
});

var CHART_INIT = {
    'axis-selection': function () { if (!window.selectionChart) initAxisSelectionChart(); },
    'bucket-selection': function () { if (!window.bucketChart) initBucketSelectionChart(); },
    'tick-selection': function () { if (!window.tickChart) initTickSelectionChart(); },
    'label-click': function () { if (!window.labelChart) initLabelClickChart(); },
    'combined-selection': function () { if (!window.combinedChart) initCombinedSelectionChart(); },
    'forecast': function () { if (!window.forecastCharts) initForecastCharts(); },
    'stack-bar-legends-default': function () { if (!window.sblDefaultChart) { window.sblDefaultChart = true; initStackBarLegendsDefaultChart(); } },
    'member-stacked-legend-hc': function () { if (!window.mslHCChart) { window.mslHCChart = true; initMemberStackedLegendHCChart(); } },
    'member-stacked-legend': function () { if (!window.mslChart) { window.mslChart = true; initMemberStackedLegendChart(); } },
    'context-menu': function () { if (!window.ctxMenuInit) { window.ctxMenuInit = true; initContextMenuCharts(); } }
};

function navigateTo(target) {
    document.querySelectorAll('.sidebar a').forEach(function (l) { l.classList.remove('active'); });
    var link = document.querySelector('.sidebar a[data-chart="' + target + '"]');
    if (link) link.classList.add('active');

    document.querySelectorAll('.content > .chart-container').forEach(function (c) {
        c.style.display = c.id === target ? '' : 'none';
    });

    if (CHART_INIT[target]) CHART_INIT[target]();

    location.hash = target;
}

document.querySelectorAll('.sidebar a').forEach(function (link) {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        navigateTo(this.dataset.chart);
    });
});

// Auto-render chart descriptions + ID badges from registry
renderChartDescriptions();

// Load from URL hash or default to first chart
var hashTarget = location.hash.slice(1);
if (hashTarget && document.getElementById(hashTarget)) {
    navigateTo(hashTarget);
} else {
    navigateTo(CHARTS[0].id);
}
