(() => {
    var ctx = document.getElementById('levelChart').getContext('2d');
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '# of Votes',
                data: [],
                backgroundColor: "rgba(0, 0, 0, 0)",
                borderColor: "rgba(255, 156, 0, 0.5)",
                borderWidth: 2,
                pointBackgroundColor: "rgba(255, 255, 255, 1)",
                pointBorderColor: "rgba(255, 156, 0, 0.5)",
                pointHoverBackgroundColor: "rgba(255, 156, 0, 1)",
                pointHoverBorderColor: "rgba(255, 255, 255, 1)",
                pointHitRadius: 20
            }]
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                yAxes: [{
                    id: 'first-y-axis',
                    type: 'linear',
                    ticks: {
                        min: 0,
                        max: 300,
                        stepSize: 25
                    }
                }]
            },
            legend: {
                display: false,
            },
            tooltips: {
                callbacks: {
                  label: function(tooltipItem, data) {
                    return "Lv." + tooltipItem.yLabel;
                  },
                  title: function(tooltipItem, data) {
                    return tooltipItem[0].xLabel;
                  }
                }
            }
        }
    });
    let chartDate = document.getElementsByClassName('chart-date');
    let chartLevel = document.getElementsByClassName('chart-level');
    for (let i = 0; i < chartDate.length; i++) {
        myChart.data.labels[i] = chartDate[i].innerHTML;
    }
    myChart.data.labels.reverse();
    for (let i = 0; i < chartLevel.length; i++) {
        myChart.data.datasets[0].data[i] = chartLevel[i].innerHTML;
    }
    myChart.data.datasets[0].data.reverse();
    myChart.update()
})()