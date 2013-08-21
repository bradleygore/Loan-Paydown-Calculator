(function($, w){
    $("#initialPaymentDate").datepicker();
    $("input[type='submit'], button").button();
    $("#tabs").tabs().hide();
    $("#diagramTabs").tabs().addClass( "ui-tabs-vertical ui-helper-clearfix" );
    $("#diagramTabs li").removeClass( "ui-corner-top" ).addClass( "ui-corner-left" );

    /*EVENT HANDLERS*/
    $("#amSchedule").on("click", "h3.yearHeader, h3.recurringHeader", function () {
        $(this).siblings('div.yearMonths, div.recurringData').toggle('slow');
    });

    $("#mtgInfoForm form").on("submit", function(e){
        e.preventDefault();
        $("#loanFormInvalid").hide();
        if  (
                $("#initialMtgBalance").val().length && 
                $("#APR").val().length &&
                $("#termYears").val().length &&
                $("#initialPaymentDate").val().length
            )
        {
            $("#mtgInfoForm input[type='submit']").hide();
            $("#loadingGearImg").show();
            window.setTimeout(function(){
                ko.applyBindings(new vm());
                collapseYears();//Going with default 5 years to leave open, and collapse the rest
                //$("#tabs").slideDown();
                $("#chkPaymentSchedule").attr("checked", "checked").trigger("change");//Initially check the menu option to show the payment schedule
                $("#chkLoanForm").removeAttr("checked").trigger("change");//Initially hide the form
                $("#banner, #monthlyPaymentLabel").show();
                $("#instructions, #loadingGearImg").hide(); 
                $("#addNewRecurringExtraPaymentBtn, #deleteAllRecurringExtraPaymentsBtn").button();  
            }, 500);          
        } else {
            $("#loanFormInvalid").show();
        }
    });

    $("#lineChartTab, #diagramsMainTab").on("click", function(e){
        w.setTimeout(function(){
            //Update the charts
            updatePieCharts();
            updateLineCharts();
        }, 250);
    });

    $(w).on("resize", function(e){
        w.resizeEvent;
        $(w).resize(function(){
            clearTimeout(w.resizeEvent);
            w.resizeEvent = setTimeout(function(){
                //Update the charts
                updatePieCharts();
                updateLineCharts();
            }, 250);
        });
    });

    //Banner and Menu
    $(".menuOption").on("click", function(e){
        //Only want this if the div is clicked, otherwise the checkbox being clicked would 
        //also kick this off as it resides inside the div.
        //e is the event.  
        //e.target is the object that received the event.
        //e.target.nodeName is the tag name - this would be "INPUT" if coming from the checkbox
        if(e.target.nodeName === "DIV") {
            var $optionChkBox = $(this).find("input[type='checkbox']:first-child");
            $optionChkBox[0].checked = !$optionChkBox[0].checked;
            $optionChkBox.trigger("change");
        }
    });

    $("#menu .menuBars").on("click", function(){
        var $menuBars = $(".menuBars"),
            $options = $("#options");

        $options.css("left", $menuBars.position().left + $menuBars.outerWidth()).fadeToggle("slow");
    });

    $("#chkLoanForm").on("change", function(){
        $("div.mortgageInfo").first().toggle();        
    });

    $("#chkPaymentSchedule").on("change", function(){
        $("#tabs").toggle();
    });

    /*helper functions*/
    w.collapseYears = function(n){
        $.each($("h3.yearHeader"), function(i, e){
            if (i >= (n || 5)) {
                $(e).trigger('click');
            };
        }); 
    };

    /*global variables*/
    w.lineChart = '';
    w.pieChart = '';

})(jQuery, window);



//Mouse tracking - NOT REALLY NEEDED, KEEPING IN CASE FUTURE NEED

// var currentMouseLocation = (function () {
//     var X, Y;

//     return {
//         x: function (d) {
//             if (d) {
//                 X = d;
//             }

//             return X;
//         },
//         y: function (d) {
//             if (d) {
//                 Y = d;
//             }

//             return Y;
//         }
//     };
// })();

// $(document).on("mousemove", function(e) {
//     currentMouseLocation.x(e.pageX);
//     currentMouseLocation.y(e.pageY);
// });

/*TESTING*/
// $(document).on("mousemove", function(e) {
//     currentMouseLocation.x(e.pageX);
//     currentMouseLocation.y(e.pageY);
//     $("#mousePointer").remove();
//     $('<div id="mousePointer">X: ' + e.pageX + '<br/>Y: ' + e.pageY + '<br/>MouseX: ' + currentMouseLocation.x() + '<br/>MouseY: ' + currentMouseLocation.y() +'<br/>PieTipX: ' + $("#pieSliceTooltip").css('top') + '<br/>PieTipY: ' + $("#pieSliceTooltip").css('left') + '</div>').css({
//         'top': e.pageX,
//         'left': e.pageY
//     }).appendTo("body");
// });
