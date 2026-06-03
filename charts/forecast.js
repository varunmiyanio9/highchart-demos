// =============================================================================
// FORECAST CHARTS
// =============================================================================
// WHAT'S CUSTOM vs HIGHCHARTS-NATIVE:
//
// HIGHCHARTS PROVIDES (~70% of the work):
//   - plotLines: vertical orange line marking forecast start
//   - plotBands: shaded forecast zone background
//   - dashStyle: 'Dot'/'Dash'/'ShortDash' for forecast line styling
//   - type: 'arearange' (from highcharts-more.js): confidence bands
//   - type: 'errorbar' (from highcharts-more.js): whisker error bars
//   - linkedTo: merges forecast series into historical legend entries
//   - fillOpacity / color with rgba: translucent forecast bars/areas
//   - borderColor + borderWidth + dashStyle on columns: dashed bar borders
//   - stacking: 'normal' with separate stack IDs: side-by-side stacked groups
//   - null values in data arrays: gaps between historical and forecast
//   - zIndex on series: layering control (lines above bands)
//
// CUSTOM CODE (~30% of the work — data transformation helpers only):
//   - padRight(): pads historical data with nulls so Highcharts skips future points
//   - padLeft(): pads forecast data with nulls so Highcharts skips past points
//   - buildAreaRange(): reshapes [low, high] pairs into [x, low, high] for arearange
//   - buildErrorBars(): reshapes confidence bands into errorbar format
//   - buildStackedErrorBars(): sums per-region bands for total stack confidence
//   - hexToRgba(): converts hex colors to rgba for translucent fills
//
// SUMMARY: No custom rendering, no SVG manipulation, no plugins.
// All visual output is native Highcharts configuration. Custom code is purely
// data reshaping to feed Highcharts the format it expects.
// =============================================================================

function initForecastCharts() {
    const categories = ['2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027'];
    const forecastStart = 5;

    const historicalData = {
        east:    [135000, 128000, 175000, 168000, 145000, 155000],
        west:    [45000, 100000, 92000, 88000, 95000, 120000],
        central: [38000, 62000, 58000, 85000, 60000, 55000]
    };

    const forecastData = {
        east:    [155000, 160000, 163000, 165000, 162000, 163000],
        west:    [120000, 115000, 118000, 125000, 130000, 132000],
        central: [55000, 78000, 80000, 72000, 75000, 82000]
    };

    const confidenceBands = {
        east:    [[140000, 170000], [142000, 185000], [138000, 195000], [135000, 205000], [130000, 210000], [125000, 220000]],
        west:    [[105000, 135000], [100000, 140000], [95000, 148000], [98000, 155000], [100000, 160000], [95000, 165000]],
        central: [[40000, 70000], [55000, 100000], [52000, 108000], [45000, 105000], [43000, 110000], [45000, 120000]]
    };

    const colors = {
        east: '#2ecc71',
        west: '#e74c3c',
        central: '#3498db'
    };

    // [HIGHCHARTS NATIVE] plotLines config — orange vertical divider
    const plotLineConfig = {
        color: '#f39c12',
        width: 2,
        value: forecastStart,
        label: { text: 'Forecast Start', style: { color: '#f39c12', fontWeight: 'bold' } }
    };

    // ========================================
    // CHART 1: Line with Forecast
    // [HIGHCHARTS NATIVE] dashStyle, arearange, linkedTo, plotLines
    // [CUSTOM] padRight, padLeft, buildAreaRange for data shaping
    // ========================================
    Highcharts.chart('forecast-line-chart', {
        chart: { type: 'line', height: 420 },
        title: { text: 'Sales Forecast \u2014 Line Chart', align: 'left' },
        subtitle: { text: 'Solid lines: historical | Dotted lines with confidence bands: forecast', align: 'left' },
        xAxis: { categories: categories, plotLines: [plotLineConfig] },
        yAxis: { title: { text: 'Total Sales' }, labels: { format: '${value:,.0f}' } },
        tooltip: { valuePrefix: '$', valueDecimals: 0 },
        legend: { enabled: true },
        plotOptions: {
            line: { marker: { enabled: true, radius: 4 } },
            arearange: { marker: { enabled: false }, lineWidth: 0, fillOpacity: 0.2 }
        },
        series: [
            // [HIGHCHARTS NATIVE] Standard line series with null-padded data
            { name: 'East', id: 'line-east', data: padRight(historicalData.east, categories.length), color: colors.east, zIndex: 2 },
            { name: 'West', id: 'line-west', data: padRight(historicalData.west, categories.length), color: colors.west, zIndex: 2 },
            { name: 'Central', id: 'line-central', data: padRight(historicalData.central, categories.length), color: colors.central, zIndex: 2 },
            // [HIGHCHARTS NATIVE] dashStyle:'Dot' + linkedTo for legend merge
            { name: 'East (forecast)', data: padLeft(forecastData.east, forecastStart, categories.length), color: colors.east, dashStyle: 'Dot', marker: { symbol: 'circle' }, zIndex: 2, linkedTo: 'line-east' },
            { name: 'West (forecast)', data: padLeft(forecastData.west, forecastStart, categories.length), color: colors.west, dashStyle: 'Dot', marker: { symbol: 'circle' }, zIndex: 2, linkedTo: 'line-west' },
            { name: 'Central (forecast)', data: padLeft(forecastData.central, forecastStart, categories.length), color: colors.central, dashStyle: 'Dot', marker: { symbol: 'circle' }, zIndex: 2, linkedTo: 'line-central' },
            // [HIGHCHARTS NATIVE] arearange type for confidence bands (requires highcharts-more.js)
            { name: 'East confidence', type: 'arearange', data: buildAreaRange(confidenceBands.east, forecastStart, categories.length), color: colors.east, fillOpacity: 0.15, zIndex: 0, linkedTo: 'line-east', enableMouseTracking: false },
            { name: 'West confidence', type: 'arearange', data: buildAreaRange(confidenceBands.west, forecastStart, categories.length), color: colors.west, fillOpacity: 0.15, zIndex: 0, linkedTo: 'line-west', enableMouseTracking: false },
            { name: 'Central confidence', type: 'arearange', data: buildAreaRange(confidenceBands.central, forecastStart, categories.length), color: colors.central, fillOpacity: 0.15, zIndex: 0, linkedTo: 'line-central', enableMouseTracking: false }
        ]
    });

    // ========================================
    // CHART 2: Bar with Forecast
    // [HIGHCHARTS NATIVE] borderColor, borderWidth, dashStyle on columns, errorbar type
    // [CUSTOM] hexToRgba, padRight, padLeft, buildErrorBars
    // ========================================
    Highcharts.chart('forecast-bar-chart', {
        chart: { type: 'column', height: 420 },
        title: { text: 'Sales Forecast \u2014 Bar Chart', align: 'left' },
        subtitle: { text: 'Solid bars: historical | Dashed translucent bars with error whiskers: forecast', align: 'left' },
        xAxis: { categories: categories, plotLines: [plotLineConfig] },
        yAxis: { title: { text: 'Total Sales' }, labels: { format: '${value:,.0f}' } },
        tooltip: { valuePrefix: '$', valueDecimals: 0 },
        legend: { enabled: true },
        plotOptions: { column: { grouping: true, borderWidth: 1 } },
        series: [
            { name: 'East', id: 'bar-east', data: padRight(historicalData.east, categories.length), color: colors.east },
            { name: 'West', id: 'bar-west', data: padRight(historicalData.west, categories.length), color: colors.west },
            { name: 'Central', id: 'bar-central', data: padRight(historicalData.central, categories.length), color: colors.central },
            // [HIGHCHARTS NATIVE] rgba color + borderColor + dashStyle:'Dash' = translucent dashed bars
            { name: 'East (forecast)', data: padLeft(forecastData.east, forecastStart, categories.length), color: hexToRgba(colors.east, 0.35), borderColor: colors.east, borderWidth: 2, dashStyle: 'Dash', linkedTo: 'bar-east' },
            { name: 'West (forecast)', data: padLeft(forecastData.west, forecastStart, categories.length), color: hexToRgba(colors.west, 0.35), borderColor: colors.west, borderWidth: 2, dashStyle: 'Dash', linkedTo: 'bar-west' },
            { name: 'Central (forecast)', data: padLeft(forecastData.central, forecastStart, categories.length), color: hexToRgba(colors.central, 0.35), borderColor: colors.central, borderWidth: 2, dashStyle: 'Dash', linkedTo: 'bar-central' },
            // [HIGHCHARTS NATIVE] errorbar type (requires highcharts-more.js)
            { name: 'East error', type: 'errorbar', data: buildErrorBars(confidenceBands.east, forecastStart, categories.length), color: '#333', linkedTo: 'bar-east', whiskerLength: '50%' },
            { name: 'West error', type: 'errorbar', data: buildErrorBars(confidenceBands.west, forecastStart, categories.length), color: '#333', linkedTo: 'bar-west', whiskerLength: '50%' },
            { name: 'Central error', type: 'errorbar', data: buildErrorBars(confidenceBands.central, forecastStart, categories.length), color: '#333', linkedTo: 'bar-central', whiskerLength: '50%' }
        ]
    });

    // ========================================
    // CHART 3: Stacked Bar with Forecast
    // [HIGHCHARTS NATIVE] stacking:'normal', separate stack IDs, errorbar
    // [CUSTOM] hexToRgba, padRight, padLeft, buildStackedErrorBars
    // ========================================
    Highcharts.chart('forecast-stacked-chart', {
        chart: { type: 'column', height: 420 },
        title: { text: 'Sales Forecast \u2014 Stacked Bar', align: 'left' },
        subtitle: { text: 'Solid stacked bars: historical | Translucent stacked bars with dashed borders: forecast', align: 'left' },
        xAxis: { categories: categories, plotLines: [plotLineConfig] },
        yAxis: { title: { text: 'Total Sales' }, labels: { format: '${value:,.0f}' } },
        tooltip: { valuePrefix: '$', valueDecimals: 0 },
        legend: { enabled: true },
        plotOptions: { column: { stacking: 'normal', borderWidth: 1 } },
        series: [
            // [HIGHCHARTS NATIVE] stack:'historical' groups these together
            { name: 'East', id: 'stk-east', data: padRight(historicalData.east, categories.length), color: colors.east, stack: 'historical' },
            { name: 'West', id: 'stk-west', data: padRight(historicalData.west, categories.length), color: colors.west, stack: 'historical' },
            { name: 'Central', id: 'stk-central', data: padRight(historicalData.central, categories.length), color: colors.central, stack: 'historical' },
            // [HIGHCHARTS NATIVE] stack:'forecast' creates separate stack with different styling
            { name: 'East (forecast)', data: padLeft(forecastData.east, forecastStart, categories.length), color: hexToRgba(colors.east, 0.35), borderColor: colors.east, borderWidth: 2, dashStyle: 'Dash', stack: 'forecast', linkedTo: 'stk-east' },
            { name: 'West (forecast)', data: padLeft(forecastData.west, forecastStart, categories.length), color: hexToRgba(colors.west, 0.35), borderColor: colors.west, borderWidth: 2, dashStyle: 'Dash', stack: 'forecast', linkedTo: 'stk-west' },
            { name: 'Central (forecast)', data: padLeft(forecastData.central, forecastStart, categories.length), color: hexToRgba(colors.central, 0.35), borderColor: colors.central, borderWidth: 2, dashStyle: 'Dash', stack: 'forecast', linkedTo: 'stk-central' },
            // [HIGHCHARTS NATIVE] errorbar on total stack
            { name: 'Confidence', type: 'errorbar', data: buildStackedErrorBars(confidenceBands, forecastStart, categories.length), color: '#333', whiskerLength: '60%' }
        ]
    });

    // ========================================
    // CHART 4: Area with Forecast
    // [HIGHCHARTS NATIVE] area type, fillOpacity, arearange for bands
    // [CUSTOM] padRight, padLeft, buildAreaRange
    // ========================================
    Highcharts.chart('forecast-area-chart', {
        chart: { type: 'area', height: 420 },
        title: { text: 'Sales Forecast \u2014 Area Chart', align: 'left' },
        subtitle: { text: 'Solid filled areas: historical | Lighter areas with dotted lines and confidence bands: forecast', align: 'left' },
        xAxis: { categories: categories, plotLines: [plotLineConfig] },
        yAxis: { title: { text: 'Total Sales' }, labels: { format: '${value:,.0f}' } },
        tooltip: { valuePrefix: '$', valueDecimals: 0 },
        legend: { enabled: true },
        plotOptions: {
            area: { marker: { enabled: false }, fillOpacity: 0.4 },
            arearange: { marker: { enabled: false }, lineWidth: 0 }
        },
        series: [
            // [HIGHCHARTS NATIVE] area series with fillOpacity
            { name: 'East', id: 'area-east', data: padRight(historicalData.east, categories.length), color: colors.east, fillOpacity: 0.5, zIndex: 1 },
            { name: 'West', id: 'area-west', data: padRight(historicalData.west, categories.length), color: colors.west, fillOpacity: 0.5, zIndex: 1 },
            { name: 'Central', id: 'area-central', data: padRight(historicalData.central, categories.length), color: colors.central, fillOpacity: 0.5, zIndex: 1 },
            // [HIGHCHARTS NATIVE] line type override with dashStyle for forecast
            { name: 'East (forecast)', type: 'line', data: padLeft(forecastData.east, forecastStart, categories.length), color: colors.east, dashStyle: 'Dot', zIndex: 2, linkedTo: 'area-east' },
            { name: 'West (forecast)', type: 'line', data: padLeft(forecastData.west, forecastStart, categories.length), color: colors.west, dashStyle: 'Dot', zIndex: 2, linkedTo: 'area-west' },
            { name: 'Central (forecast)', type: 'line', data: padLeft(forecastData.central, forecastStart, categories.length), color: colors.central, dashStyle: 'Dot', zIndex: 2, linkedTo: 'area-central' },
            // [HIGHCHARTS NATIVE] arearange for confidence bands
            { name: 'East band', type: 'arearange', data: buildAreaRange(confidenceBands.east, forecastStart, categories.length), color: colors.east, fillOpacity: 0.12, zIndex: 0, linkedTo: 'area-east', enableMouseTracking: false },
            { name: 'West band', type: 'arearange', data: buildAreaRange(confidenceBands.west, forecastStart, categories.length), color: colors.west, fillOpacity: 0.12, zIndex: 0, linkedTo: 'area-west', enableMouseTracking: false },
            { name: 'Central band', type: 'arearange', data: buildAreaRange(confidenceBands.central, forecastStart, categories.length), color: colors.central, fillOpacity: 0.12, zIndex: 0, linkedTo: 'area-central', enableMouseTracking: false }
        ]
    });

    // ========================================
    // CHART 5 (Bonus): Spline with forecast zone highlight
    // [HIGHCHARTS NATIVE] plotBands, spline type, ShortDash, arearange
    // [CUSTOM] padRight, padLeft, buildAreaRange
    // ========================================
    Highcharts.chart('forecast-bonus-chart', {
        chart: { type: 'spline', height: 420 },
        title: { text: 'Sales Forecast \u2014 Gradient Fade', align: 'left' },
        subtitle: { text: 'Forecast confidence fades with distance from last known data point', align: 'left' },
        xAxis: {
            categories: categories,
            // [HIGHCHARTS NATIVE] plotBands for shaded forecast zone
            plotBands: [{
                from: forecastStart,
                to: categories.length - 1,
                color: 'rgba(243, 156, 18, 0.05)',
                label: { text: 'Forecast Zone', style: { color: '#f39c12' }, align: 'center' }
            }],
            plotLines: [{ color: '#f39c12', width: 2, value: forecastStart, dashStyle: 'Dash' }]
        },
        yAxis: { title: { text: 'Total Sales' }, labels: { format: '${value:,.0f}' } },
        tooltip: { valuePrefix: '$', valueDecimals: 0 },
        legend: { enabled: true },
        plotOptions: {
            spline: { marker: { enabled: true, radius: 3 } },
            arearange: { marker: { enabled: false }, lineWidth: 0 }
        },
        series: [
            { name: 'East', id: 'sp-east', data: padRight(historicalData.east, categories.length), color: colors.east, lineWidth: 3, zIndex: 2 },
            { name: 'West', id: 'sp-west', data: padRight(historicalData.west, categories.length), color: colors.west, lineWidth: 3, zIndex: 2 },
            { name: 'Central', id: 'sp-central', data: padRight(historicalData.central, categories.length), color: colors.central, lineWidth: 3, zIndex: 2 },
            { name: 'East (forecast)', type: 'spline', data: padLeft(forecastData.east, forecastStart, categories.length), color: colors.east, dashStyle: 'ShortDash', lineWidth: 2, zIndex: 2, linkedTo: 'sp-east' },
            { name: 'West (forecast)', type: 'spline', data: padLeft(forecastData.west, forecastStart, categories.length), color: colors.west, dashStyle: 'ShortDash', lineWidth: 2, zIndex: 2, linkedTo: 'sp-west' },
            { name: 'Central (forecast)', type: 'spline', data: padLeft(forecastData.central, forecastStart, categories.length), color: colors.central, dashStyle: 'ShortDash', lineWidth: 2, zIndex: 2, linkedTo: 'sp-central' },
            { name: 'East band', type: 'arearange', data: buildAreaRange(confidenceBands.east, forecastStart, categories.length), color: colors.east, fillOpacity: 0.1, zIndex: 0, linkedTo: 'sp-east', enableMouseTracking: false },
            { name: 'West band', type: 'arearange', data: buildAreaRange(confidenceBands.west, forecastStart, categories.length), color: colors.west, fillOpacity: 0.1, zIndex: 0, linkedTo: 'sp-west', enableMouseTracking: false },
            { name: 'Central band', type: 'arearange', data: buildAreaRange(confidenceBands.central, forecastStart, categories.length), color: colors.central, fillOpacity: 0.1, zIndex: 0, linkedTo: 'sp-central', enableMouseTracking: false }
        ]
    });

    // ========================================
    // CHART 6: Forecast Divider in Center (plain bars + hoverable yellow line)
    // [HIGHCHARTS NATIVE] plotLines with events.mouseover/mouseout for tooltip-like label
    // No dashed bars, no confidence bands — just the yellow line separates past/future
    // ========================================
    var allData = {
        east: historicalData.east.concat(forecastData.east.slice(1)),
        west: historicalData.west.concat(forecastData.west.slice(1)),
        central: historicalData.central.concat(forecastData.central.slice(1))
    };

    Highcharts.chart('forecast-divider-center', {
        chart: { type: 'column', height: 420 },
        title: { text: 'Forecast Divider \u2014 Center (Past vs Future)', align: 'left' },
        subtitle: { text: 'Plain bars with a hoverable yellow line marking forecast start', align: 'left' },
        xAxis: {
            categories: categories,
            plotLines: [{
                color: '#f39c12',
                width: 4,
                value: forecastStart,
                zIndex: 5,
                label: {
                    text: '',
                    verticalAlign: 'top',
                    textAlign: 'center',
                    rotation: 0,
                    y: 12,
                    style: { color: '#fff', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#f39c12', padding: '4px 8px', borderRadius: '3px' }
                },
                events: {
                    mouseover: function () {
                        this.label.attr({ text: 'Forecast Start: ' + categories[this.options.value] });
                        this.svgElem.attr({ 'stroke-width': 6 });
                    },
                    mouseout: function () {
                        this.label.attr({ text: '' });
                        this.svgElem.attr({ 'stroke-width': 4 });
                    }
                }
            }]
        },
        yAxis: { title: { text: 'Total Sales' }, labels: { format: '${value:,.0f}' } },
        tooltip: { shared: true, valuePrefix: '$', valueDecimals: 0 },
        legend: { enabled: true },
        series: [
            { name: 'East', data: allData.east, color: colors.east },
            { name: 'West', data: allData.west, color: colors.west },
            { name: 'Central', data: allData.central, color: colors.central }
        ]
    });

    // ========================================
    // CHART 7: Forecast Only (future ticks only, yellow line at left edge)
    // [HIGHCHARTS NATIVE] plotLine at value 0 (first category = leftmost position)
    // No extra space, line sits at the beginning of data
    // ========================================
    var forecastOnlyCategories = categories.slice(forecastStart + 1);

    Highcharts.chart('forecast-divider-left', {
        chart: { type: 'column', height: 420 },
        title: { text: 'Forecast Only \u2014 Yellow Line at Left Edge', align: 'left' },
        subtitle: { text: 'Only future data shown. Yellow line at left edge indicates all data is forecasted.', align: 'left' },
        xAxis: {
            categories: forecastOnlyCategories,
            plotLines: [{
                color: '#f39c12',
                width: 4,
                value: 0,
                zIndex: 5,
                label: {
                    text: '',
                    verticalAlign: 'top',
                    textAlign: 'left',
                    rotation: 0,
                    x: 6,
                    y: 12,
                    style: { color: '#fff', fontWeight: 'bold', fontSize: '12px', backgroundColor: '#f39c12', padding: '4px 8px', borderRadius: '3px' }
                },
                events: {
                    mouseover: function () {
                        this.label.attr({ text: 'Forecast from: ' + forecastOnlyCategories[0] });
                        this.svgElem.attr({ 'stroke-width': 6 });
                    },
                    mouseout: function () {
                        this.label.attr({ text: '' });
                        this.svgElem.attr({ 'stroke-width': 4 });
                    }
                }
            }]
        },
        yAxis: { title: { text: 'Total Sales' }, labels: { format: '${value:,.0f}' } },
        tooltip: { shared: true, valuePrefix: '$', valueDecimals: 0 },
        legend: { enabled: true },
        series: [
            { name: 'East', data: forecastData.east.slice(1), color: colors.east },
            { name: 'West', data: forecastData.west.slice(1), color: colors.west },
            { name: 'Central', data: forecastData.central.slice(1), color: colors.central }
        ]
    });

    window.forecastCharts = true;
}

// =============================================================================
// [CUSTOM] Helper Functions — data transformation only, no rendering
// =============================================================================

// [CUSTOM] Pads historical array with nulls at the end so Highcharts leaves forecast slots empty
function padRight(data, totalLength) {
    const result = [...data];
    while (result.length < totalLength) result.push(null);
    return result;
}

// [CUSTOM] Pads forecast array with nulls at the start so Highcharts leaves historical slots empty
function padLeft(data, startIndex, totalLength) {
    const result = [];
    for (let i = 0; i < totalLength; i++) {
        result.push(i >= startIndex ? data[i - startIndex] : null);
    }
    return result;
}

// [CUSTOM] Converts [[low,high],...] into [[x, low, high],...] format required by arearange
function buildAreaRange(bands, startIndex, totalLength) {
    const result = [];
    for (let i = 0; i < totalLength; i++) {
        if (i >= startIndex && bands[i - startIndex]) {
            result.push([i, bands[i - startIndex][0], bands[i - startIndex][1]]);
        } else {
            result.push([i, null, null]);
        }
    }
    return result;
}

// [CUSTOM] Converts [[low,high],...] into [[low, high],...] format required by errorbar
function buildErrorBars(bands, startIndex, totalLength) {
    const result = [];
    for (let i = 0; i < totalLength; i++) {
        if (i >= startIndex && bands[i - startIndex]) {
            result.push([bands[i - startIndex][0], bands[i - startIndex][1]]);
        } else {
            result.push([null, null]);
        }
    }
    return result;
}

// [CUSTOM] Sums confidence bands across regions for stacked total error bars
function buildStackedErrorBars(allBands, startIndex, totalLength) {
    const result = [];
    for (let i = 0; i < totalLength; i++) {
        if (i >= startIndex) {
            const idx = i - startIndex;
            const low = allBands.east[idx][0] + allBands.west[idx][0] + allBands.central[idx][0];
            const high = allBands.east[idx][1] + allBands.west[idx][1] + allBands.central[idx][1];
            result.push([low, high]);
        } else {
            result.push([null, null]);
        }
    }
    return result;
}

// [CUSTOM] Converts hex color to rgba string for translucent fills
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}
