// =============================================================================
// MULTI-TYPE COMBINED CHART — All-in-One
//
// Single Highcharts chart with five series types in one canvas:
//   - Column (Bar)              — Revenue, standalone unstacked bar
//   - Stacked Column "costs"    — Cost A + Cost B
//   - Stacked Column "brands"   — 10 beverage brands (Pepsi, 7Up, etc.)
//   - Line                      — Market trend (right axis)
//   - Area                      — Volume fill (right axis)
//
// Two y-axes:
//   yAxis[0] (left)  → all column groups ($k)
//   yAxis[1] (right) → Line & Area (units)
//
// Chart fills the full content viewport height.
// =============================================================================

Highcharts.chart('multi-type-chart-main', {
    chart: {
        type: 'column',
        height: Math.max(520, window.innerHeight - 160),
        backgroundColor: '#ffffff',
        style: { fontFamily: 'inherit' },
        marginBottom: 130
    },

    title: {
        text: 'Combined Chart — Bar · 2× Stacked Bar · Line · Area',
        style: { fontSize: '16px', fontWeight: '600' }
    },

    subtitle: {
        text: 'Revenue bar &nbsp;|&nbsp; Cost stack &nbsp;|&nbsp; Beverage brands stack &nbsp;|&nbsp; Trend line &amp; Volume area on right axis',
        useHTML: true
    },

    xAxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        crosshair: true,
        accessibility: { description: 'Month' }
    },

    xAxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        crosshair: true,
        accessibility: { description: 'Month' }
    },

    yAxis: [
        {
            // Left axis — all column groups
            title: { text: 'Value ($k)' },
            min: 0,
            labels: { format: '{value}k' },
            stackLabels: {
                enabled: true,
                style: { fontWeight: '600', color: '#444', textOutline: 'none', fontSize: '10px' },
                formatter: function () { return this.total + 'k'; }
            }
        },
        {
            // Right axis — line & area
            title: { text: 'Volume (units)' },
            min: 0,
            labels: { format: '{value}' },
            opposite: true,
            gridLineWidth: 0
        }
    ],

    legend: {
        enabled: true,
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        itemStyle: { fontSize: '11px' }
    },

    tooltip: {
        shared: true,
        useHTML: true,
        headerFormat: '<b>{point.key}</b><table style="min-width:180px;font-size:12px">',
        pointFormat:
            '<tr><td style="color:{series.color};padding:2px 6px">{series.name}:&nbsp;</td>' +
            '<td style="padding:2px 6px;text-align:right"><b>{point.y}</b></td></tr>',
        footerFormat: '</table>'
    },

    plotOptions: {
        column: {
            grouping: true,
            borderRadius: 2,
            borderWidth: 0,
            groupPadding: 0.08,
            pointPadding: 0.04
        },
        area: {
            fillOpacity: 0.2,
            marker: { enabled: false },
            lineWidth: 2
        },
        line: {
            marker: { enabled: true, radius: 4, symbol: 'circle' },
            lineWidth: 2
        }
    },

    series: [
        // ── Standalone bar ───────────────────────────────────────────────────
        {
            type: 'column',
            name: 'Revenue',
            yAxis: 0,
            color: '#4472C4',
            data: [49, 62, 81, 95, 110, 125, 108, 130, 142, 118, 99, 145],
            tooltip: { valueSuffix: 'k' }
        },

        // ── Stacked group: Costs ─────────────────────────────────────────────
        {
            type: 'column',
            name: 'Cost A',
            yAxis: 0,
            color: '#ED7D31',
            stacking: 'normal',
            stack: 'costs',
            data: [20, 25, 30, 35, 40, 45, 38, 42, 50, 44, 37, 55],
            tooltip: { valueSuffix: 'k' }
        },
        {
            type: 'column',
            name: 'Cost B',
            yAxis: 0,
            color: '#FFC000',
            stacking: 'normal',
            stack: 'costs',
            data: [12, 18, 22, 26, 30, 35, 28, 32, 38, 33, 27, 40],
            tooltip: { valueSuffix: 'k' }
        },

        // ── Stacked group: Beverage Brands ($k) ──────────────────────────────
        {
            type: 'column',
            name: 'Pepsi',
            yAxis: 0,
            color: '#003087',
            stacking: 'normal',
            stack: 'brands',
            data: [12, 11, 13, 14, 15, 16, 14, 15, 16, 15, 13, 17],
            tooltip: { valueSuffix: 'k' }
        },
        {
            type: 'column',
            name: '7Up',
            yAxis: 0,
            color: '#00A550',
            stacking: 'normal',
            stack: 'brands',
            data: [6, 5, 7, 7, 8, 8, 7, 8, 8, 8, 7, 9],
            tooltip: { valueSuffix: 'k' }
        },
        {
            type: 'column',
            name: 'Coca-Cola',
            yAxis: 0,
            color: '#F40009',
            stacking: 'normal',
            stack: 'brands',
            data: [15, 14, 16, 17, 18, 18, 17, 18, 19, 18, 16, 21],
            tooltip: { valueSuffix: 'k' }
        },
        {
            type: 'column',
            name: 'Sprite',
            yAxis: 0,
            color: '#00A86B',
            stacking: 'normal',
            stack: 'brands',
            data: [5, 5, 6, 6, 7, 7, 6, 7, 7, 7, 6, 8],
            tooltip: { valueSuffix: 'k' }
        },
        {
            type: 'column',
            name: 'Fanta',
            yAxis: 0,
            color: '#FF7A00',
            stacking: 'normal',
            stack: 'brands',
            data: [4, 4, 5, 5, 6, 6, 5, 6, 6, 6, 5, 7],
            tooltip: { valueSuffix: 'k' }
        },
        {
            type: 'column',
            name: 'Mountain Dew',
            yAxis: 0,
            color: '#8DB600',
            stacking: 'normal',
            stack: 'brands',
            data: [4, 3, 4, 5, 5, 5, 5, 5, 6, 5, 5, 6],
            tooltip: { valueSuffix: 'k' }
        },
        {
            type: 'column',
            name: 'Dr Pepper',
            yAxis: 0,
            color: '#6B1A1A',
            stacking: 'normal',
            stack: 'brands',
            data: [3, 3, 4, 4, 4, 5, 4, 5, 5, 4, 4, 5],
            tooltip: { valueSuffix: 'k' }
        },
        {
            type: 'column',
            name: 'Red Bull',
            yAxis: 0,
            color: '#CC1829',
            stacking: 'normal',
            stack: 'brands',
            data: [3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 3, 5],
            tooltip: { valueSuffix: 'k' }
        },
        {
            type: 'column',
            name: 'Monster',
            yAxis: 0,
            color: '#3D9900',
            stacking: 'normal',
            stack: 'brands',
            data: [2, 2, 3, 3, 3, 4, 3, 4, 4, 3, 3, 4],
            tooltip: { valueSuffix: 'k' }
        },
        {
            type: 'column',
            name: 'Gatorade',
            yAxis: 0,
            color: '#FF6B00',
            stacking: 'normal',
            stack: 'brands',
            data: [2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4],
            tooltip: { valueSuffix: 'k' }
        },

        // ── Line & Area (right axis) ─────────────────────────────────────────
        {
            type: 'line',
            name: 'Trend',
            yAxis: 1,
            color: '#1A1A2E',
            dashStyle: 'ShortDash',
            zIndex: 10,
            data: [320, 380, 430, 480, 520, 560, 510, 590, 640, 580, 490, 670],
            tooltip: { valueSuffix: ' units' }
        },
        {
            type: 'area',
            name: 'Volume',
            yAxis: 1,
            color: '#9E6FC8',
            zIndex: 5,
            data: [280, 310, 390, 420, 460, 500, 455, 530, 575, 510, 440, 610],
            tooltip: { valueSuffix: ' units' }
        }
    ],

    credits: { enabled: false },

    accessibility: {
        enabled: true,
        description:
            'Combined chart with Revenue bar, Cost A and Cost B stacked bar, ' +
            '10 beverage brand stacked bar (Pepsi, 7Up, Coca-Cola, Sprite, Fanta, ' +
            'Mountain Dew, Dr Pepper, Red Bull, Monster, Gatorade), a Trend line, and a Volume area.'
    }
});
