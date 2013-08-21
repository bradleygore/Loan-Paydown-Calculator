//loan data used in pie charts
function highLevelLoanData (){
    var TotalYears,
        TotalMonths,
        TotalInterest,
        TotalCost;

    return {
        totalYears: function (n) {
            if (n) {
                TotalYears = n;
            }

            return TotalYears;
        },
        totalInterest: function (n) {
            if (n) {
                TotalInterest = n;
            }

            return TotalInterest;
        },
        totalCost: function (n) {
            if (n) {
                TotalCost = n;
            }

            return TotalCost;
        },
        totalMonths: function (n) {
            if (n) {
                TotalMonths = n;
            }

            return TotalMonths;
        }
    };
}

//loan data used in line charts
function lowLevelLoanData (label){
    var Label = label,
        Data = [];

    return {
        "label": Label,
        "data": Data
    };
}

//full loan scenario - high and low level data come together to form this.
var currentLoanScenario = (function(){
    var WithoutExtraPayments = new highLevelLoanData(),
        WithExtraPayments = new highLevelLoanData(),
        LowLevelWithoutExtraPayments = {
            "interest": new lowLevelLoanData("Interest w/o Extra"),
            "principal": new lowLevelLoanData("Principal w/o Extra")
        },
        LowLevelWithExtraPayments = {
            "interest": new lowLevelLoanData("Interest w/ Extra"),
            "principal": new lowLevelLoanData("Principal w/ Extra"),
            "extra": new lowLevelLoanData("Extra")
        },
        AmountFinanced = 0;

    return {
        withoutExtraPayments: WithoutExtraPayments,
        withExtraPayments: WithExtraPayments,
        lowLevelWithoutExtraPayments: LowLevelWithoutExtraPayments,
        lowLevelWithExtraPayments: LowLevelWithExtraPayments,
        amountFinanced: function(n) {
            if (n) {
                AmountFinanced = n;
            }

            return AmountFinanced;
        }
    };
})();

/*Chart Interactions*/
function updatePieCharts(){
    
    var withoutExtraSeriesData = [],
        withExtraSeriesData = [];

    //Populate pie showing interest without extra payments
    withoutExtraSeriesData.push({
        color: "#F20707",
        data: parseFloat(currentLoanScenario.withoutExtraPayments.totalInterest()),
        label: "Interest"
    },{
        color: "#20B818",
        data: parseFloat(currentLoanScenario.amountFinanced()),
        label: "Principal"
    });

    pieChartWithoutExtra = $.plot($("#pieWithoutExtraPayments"), withoutExtraSeriesData, {
        series: {
            pie: {
                show: true
            }
        },
        grid: {
            hoverable: true,
            autoHighlight: true
        },
        legend: {
            margin: [-50, 10]
        }
    });

    //Populate pie showing interest with extra payments
    withExtraSeriesData.push({
        color: "#F20707",
        data: parseFloat(currentLoanScenario.withExtraPayments.totalInterest()),
        label: "Interest"
    }, {
        color: "#20B818",
        data: parseFloat(currentLoanScenario.amountFinanced()),
        label: "Principal"
    });

    pieChartExtra = $.plot($("#pieWithExtraPayments"), withExtraSeriesData, {
        series: {
            pie: {
                show: true
            }
        },
        grid: {
            hoverable: true,
            autoHighlight: true
        },
        legend: {
            margin: [-50, 10]
        }
    });

    $("#pieWithoutExtraPayments, #pieWithExtraPayments").bind("plothover", updatePieTooltip);
}

function updatePieTooltip(evt, pos, item){
    
    $("#pieSliceTooltip").remove();
    
    if(!item) {
        
        return;    
    }

    $('<div id="pieSliceTooltip"></div>').css({
        'color': item.series.color,
        'background-color': '#FCE6BD',
        'position': 'absolute',
        'top': pos.pageY+10,
        'left': pos.pageX+10,
        'font-weight': 'bold',
        'font-size': '12px',
        'padding': '5px',
        'width': '150px',
        'border': '1px solid ' + item.series.color,
        '-webkit-border-radius': '10px',
        'border-radius': '10px',
        'opacity': 0.90
    }).html(item.series.label + ' accounts for ' + parseFloat(item.series.percent).toFixed(2) + '% of the total spent.')
    .appendTo("body").fadeIn(200);
}

function updateLineCharts(){
    
    var tickSize,
        arrayLength = currentLoanScenario.withoutExtraPayments.totalYears();

    if (arrayLength >= 25){
        tickSize = 5;
    } else if (arrayLength >= 15){
        tickSize = 2;
    } else {
        tickSize = 1;
    }

    var chartData = [
        {
            //Interest w/ Extra
            color: "#19D4C7",
            data: currentLoanScenario.lowLevelWithExtraPayments.interest.data,
            label: currentLoanScenario.lowLevelWithExtraPayments.interest.label 
        },
        {
            //Interest w/o Extra
            color: "#F20707",
            data: currentLoanScenario.lowLevelWithoutExtraPayments.interest.data,
            label: currentLoanScenario.lowLevelWithoutExtraPayments.interest.label
        },
        {
            //Principal w/ Extra
            color: "#CB42E3",
            data: currentLoanScenario.lowLevelWithExtraPayments.principal.data,
            label: currentLoanScenario.lowLevelWithExtraPayments.principal.label
        },
        {
            //Principal w/o Extra
            color: "#20B818",
            data: currentLoanScenario.lowLevelWithoutExtraPayments.principal.data,
            label: currentLoanScenario.lowLevelWithoutExtraPayments.principal.label
        },
        {
            //Extra Payments
            color: "#283FEB",
            data: currentLoanScenario.lowLevelWithExtraPayments.extra.data,
            label: currentLoanScenario.lowLevelWithExtraPayments.extra.label 
        }
    ];

    lineChart = $.plot($("#lineWithExtraPayments"), 
        chartData, 
        {
        series: {
            lines: { show: true },
            points: { show: true }
        },
        grid: {
            hoverable: true //,
            // labelMargin: 40
        },
        legend: {
            margin: [-180, 10]
        },
        yaxis: {
            labelWidth: 40,
            reserveSpace: true            
        },
        xaxis: {
            tickSize: tickSize,
            tickFormatter: function(val, axis){
                return parseInt(val);
            },
            reserveSpace: true
        }
    });
    
    var previousPoint = null;
    
    $("#lineWithExtraPayments").bind("plothover", function (event, pos, item) {
        if (!item) {
            $("#lineChartToolTip").remove();
            previousPoint = null;
        } else {
            if (previousPoint != item.dataIndex){
                previousPoint = item.dataIndex;

                $("#lineChartToolTip").remove();

                var xYear = item.datapoint[0].toFixed(2),
                    yValue = item.datapoint[1].toFixed(2);

                showLineChartToolTip(pos.pageX, pos.pageY, item.series.label + ': $' + parseFloat(yValue).toFixed(2) + ' in ' + parseInt(xYear), item.series.color);
            }
        }
    });
}

function showLineChartToolTip(posX, posY, content, itemColor){
    $('<div id="lineChartToolTip"></div>').css({
        'color': itemColor,
        'background-color': '#FCE6BD',
        'position': 'absolute',
        'top': posY+10,
        'left': posX+10,
        'font-weight': 'bold',
        'font-size': '12px',
        'padding': '5px',
        'width': '150px',
        'border': '1px solid ' + itemColor,
        '-webkit-border-radius': '10px',
        'border-radius': '10px',
        'text-align': 'center',
        'opacity': 0.90
    }).html(content)
    .appendTo("body").fadeIn(200);
}