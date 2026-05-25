Highcharts.chart('bar-chart', {
    chart: {
        type: 'column'
    },
    title: {
        text: 'Monthly Sales Data'
    },
    xAxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        accessibility: {
            description: 'Months of the year'
        }
    },
    yAxis: {
        title: {
            text: 'Sales (in thousands)'
        }
    },
    series: [{
        name: 'Product A',
        data: [49, 71, 106, 129, 144, 176]
    }, {
        name: 'Product B',
        data: [83, 78, 98, 93, 106, 84]
    }],
    accessibility: {
        enabled: true,
        point: {
            valueDescriptionFormat: '{index}. {point.category}: {point.y} sales'
        }
    }
});
