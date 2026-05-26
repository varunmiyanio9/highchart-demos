// Sidebar chart registry — single source of truth for navigation
const CHARTS = [
    { id: 'bar-chart', name: 'Bar Chart', description: 'Basic bar chart with export and accessibility' },
    { id: 'axis-selection', name: 'Axis Selection', description: 'Click/Ctrl+Click/drag to select bars, keyboard via accessibility module' },
    { id: 'bucket-selection', name: 'Bucket Selection', description: 'Multi chart types (column/line/area) with shared selection state, plotBands, point.select()' },
    { id: 'tick-selection', name: 'Axis Tick Selection', description: 'External DOM buttons as axis ticks, roving tabindex, full keyboard without Highcharts conflicts' },
    { id: 'label-click', name: 'Label Click Selection', description: 'useHTML labels with event delegation, textContent identification (data-* stripped by Highcharts)' },
    { id: 'combined-selection', name: 'Combined Selection', description: 'Pure SVG labels, background-only mouse select, bidirectional label+grid, font size/weight toolbar' }
];

const CHART_INIT = {
    'axis-selection': () => { if (!window.selectionChart) initAxisSelectionChart(); },
    'bucket-selection': () => { if (!window.bucketChart) initBucketSelectionChart(); },
    'tick-selection': () => { if (!window.tickChart) initTickSelectionChart(); },
    'label-click': () => { if (!window.labelChart) initLabelClickChart(); },
    'combined-selection': () => { if (!window.combinedChart) initCombinedSelectionChart(); }
};

function navigateTo(target) {
    document.querySelectorAll('.sidebar a').forEach(l => l.classList.remove('active'));
    const link = document.querySelector('.sidebar a[data-chart="' + target + '"]');
    if (link) link.classList.add('active');

    document.querySelectorAll('.content > .chart-container').forEach(c => {
        c.style.display = c.id === target ? '' : 'none';
    });

    if (CHART_INIT[target]) CHART_INIT[target]();

    location.hash = target;
}

document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        navigateTo(this.dataset.chart);
    });
});

// Load from URL hash or default to first chart
const hashTarget = location.hash.slice(1);
if (hashTarget && document.getElementById(hashTarget)) {
    navigateTo(hashTarget);
} else {
    navigateTo(CHARTS[0].id);
}
