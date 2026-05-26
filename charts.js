// Sidebar navigation
function navigateTo(target) {
    document.querySelectorAll('.sidebar a').forEach(l => l.classList.remove('active'));
    const link = document.querySelector('.sidebar a[data-chart="' + target + '"]');
    if (link) link.classList.add('active');

    document.querySelectorAll('.content > .chart-container').forEach(c => {
        c.style.display = c.id === target ? '' : 'none';
    });

    if (target === 'axis-selection' && !window.selectionChart) {
        initAxisSelectionChart();
    }
    if (target === 'bucket-selection' && !window.bucketChart) {
        initBucketSelectionChart();
    }
    if (target === 'tick-selection' && !window.tickChart) {
        initTickSelectionChart();
    }
    if (target === 'label-click' && !window.labelChart) {
        initLabelClickChart();
    }
    if (target === 'combined-selection' && !window.combinedChart) {
        initCombinedSelectionChart();
    }

    history.replaceState(null, '', '#' + target);
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
    document.querySelector('.sidebar a').classList.add('active');
}
