// Sidebar navigation
document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('.sidebar a').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        const target = this.dataset.chart;
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
    });
});

// Activate first link by default
document.querySelector('.sidebar a').classList.add('active');
