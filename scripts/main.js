////////////////////////////////////////////////////////////////////////////////////////
//Need to create a knockout ViewModel that generates the payment schedule dynamically 
//Need to be able to add as many extra payments as needed to each month               
//Formula for calculating Monthly Payment (MP) is: MP = F[i(i + 1)^m]/[(1 + i)^m - 1] Where 
//  F = Total Amount Financed
//  i = Monthly Interest Rate (ex: 3.0% APR => 0.03 / 12 = 0.0025)
//  m = Total Number of Months Financed (ex: 15 Years => 15*12 = 180)
////////////////////////////////////////////////////////////////////////////////////////

var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

//Base class for each item that will be added to the recurringExtraPayments array
var extraPayment = function(){
    return{
        startingYear: ko.observable(),
        startingMonth: ko.observable(),
        endingYear: ko.observable(),
        endingMonth: ko.observable(),
        amount: ko.observable(),
        needsRemoved: false
    };
};

function vm () {
    var self = this;

    //For recurring extra payments
    self.recurringExtraPayments = ko.observableArray();
    self.selectedStartYear = ko.observable();
    self.selectedStartMonth = ko.observable();
    self.selectedEndYear = ko.observable();
    self.selectedEndMonth = ko.observable();
    self.newRecurringPaymentAmount = ko.observable(parseFloat("0.00").toFixed(2));
    self.newRecurringExtraPaymentForm = ko.observable(false);
    self.newRecurringExtraPaymentError = ko.observable();
    //For calculating mortgage payment schedule
    self.initialPaymentDate = ko.observable($("#initialPaymentDate").val());
    self.initialMtgBalance = ko.observable(parseFloat($("#initialMtgBalance").val()).toFixed(2));
    self.initialPaymentMonth = moment(self.initialPaymentDate()).month();
    self.APR = ko.observable($("#APR").val());
    self.termYears = ko.observable($("#termYears").val());
    self.termMonths = ko.computed(function () { return self.termYears() * 12; });
    self.monthlyInterestRate = ko.computed(function () { 
        return self.APR() / 100 / 12; 
    });
    self.monthlyPayment = ko.computed(function () {
        return (self.initialMtgBalance()*(self.monthlyInterestRate()*Math.pow((1 + self.monthlyInterestRate()), self.termMonths()))/(Math.pow((1 + self.monthlyInterestRate()), self.termMonths()) - 1)).toFixed(2);
    });
    self.years = ko.observableArray();
    self.currentExtraPayment = ko.observable("");
    self.currentYear = ko.observable(moment(self.initialPaymentDate()).year());
    self.scheduledMonthlyPayment = self.monthlyPayment();
    self.currentBalance = ko.observable(self.initialMtgBalance());
    self.finalPayment = ko.observable();

    //Helper methods
    var interestPayment = function (currentBalance) { 
            return (parseFloat(currentBalance) * parseFloat(self.monthlyInterestRate())).toFixed(2); 
        },
        principalPayment = function (interestPortion) { 
            return (parseFloat(self.monthlyPayment()) - interestPortion).toFixed(2); 
        },
        newBalance = function (currentBalance, principalPortion) { 
            return (parseFloat(currentBalance) - principalPortion).toFixed(2); 
        };

    self.getYearsTotals = function(year){
        var data = {
            totalInterest: 0,
            totalExtra: 0,
            totalPrincipal: 0            
        },
            months = year.months();
        
        for (var i = months.length - 1; i >= 0; i--) {
            data.totalInterest += parseFloat(months[i].interest());
        };
        for (var i = months.length - 1; i >= 0; i--) {
            data.totalExtra += parseFloat(months[i].extraPayment());
        };            
        for (var i = months.length - 1; i >= 0; i--) {
            data.totalPrincipal += parseFloat(months[i].principal());
        };
        return data;
    }

    self.resetVMVals = function(){
        var initPayDate = $("#initialPaymentDate").val(), 
            initMtgBal = parseFloat($("#initialMtgBalance").val()).toFixed(2), 
            apr = parseFloat($("#APR").val()).toFixed(4), 
            termYrs = $("#termYears").val();
            //If all fields have a value
        if (initPayDate && initMtgBal && apr && termYrs && apr < 30) {
            self.initialPaymentDate(initPayDate);
            self.initialMtgBalance(initMtgBal);
            self.APR(apr);
            self.termYears(termYrs);
            self.currentYear(moment(initPayDate).year());
            self.initialPaymentMonth = moment(initPayDate).month()
            self.scheduledMonthlyPayment = self.monthlyPayment();
            self.currentBalance(initMtgBal);
            self.createPaymentSchedule();
        } else {
            //Invoke the submit click (even though the DOM element is hidden) to show required field(s)
            window.setTimeout(function (){
                $("#mtgInfoForm input[type='submit']").trigger("click");
            }, 200);
        }                
    };

    self.createPaymentSchedule = function () {
        self.years.removeAll();
        currentLoanScenario.lowLevelWithoutExtraPayments.interest.data = [];
        currentLoanScenario.lowLevelWithoutExtraPayments.principal.data = [];
        while (parseFloat(self.scheduledMonthlyPayment) < parseFloat(self.currentBalance())) {
            var currentMtgYear = {
                year: self.currentYear(),
                months: ko.observableArray()                
            };
            for (var i = self.initialPaymentMonth || 0; i < monthNames.length && parseFloat(self.scheduledMonthlyPayment) < parseFloat(self.currentBalance()); i++) {
                var interestAmt,
                    principalAmt,
                    endingBal,
                    extraPaymentAmt = parseFloat(0.00).toFixed(2);

                    if (self.recurringExtraPayments().length > 0){
                        //Get all recurring extra payments that are applicable
                        //  startYear().year <= currentMtgYear.year
                        //  (if startYear().year == currentMtgYear.year - monthNames.indexOf(startMonth().name) >= i)
                        //  endYear().year >= currentMtgYear.year
                        //  (if endYear().year == currentMtgYear.year - monthNames.indexOf(endMonth().name) <= i)
                        var applicableExtraPayments = $(self.recurringExtraPayments()).filter(function(index){
                            return (parseInt(this.startingYear().year) < parseInt(currentMtgYear.year) &&
                                    parseInt(this.endingYear().year) > parseInt(currentMtgYear.year)) ||
                                    (parseInt(this.startingYear().year) == parseInt(currentMtgYear.year) &&
                                    (monthNames[i] == this.startingMonth().name || monthNames.indexOf(this.startingMonth().name) <= i)) ||
                                    (parseInt(this.endingYear().year) == parseInt(currentMtgYear.year) && 
                                    (monthNames[i] == this.endingMonth().name || monthNames.indexOf(this.endingMonth().name >= i)));
                        });

                        $.each(applicableExtraPayments, function(index, element){
                            extraPaymentAmt = parseFloat(extraPaymentAmt) + parseFloat(element.amount()); 
                        });
                    }

                    //Calculate figures
                    interestAmt = interestPayment(self.currentBalance());
                    principalAmt = principalPayment(interestAmt);
                    endingBal = newBalance(self.currentBalance(), principalAmt);

                    var newMonth = {
                        startingBalance: ko.observable(parseFloat(self.currentBalance()).toFixed(2)),
                        name: monthNames[i],
                        interest: ko.observable(interestAmt),
                        principal: ko.observable(principalAmt),
                        endingBalance: ko.observable(endingBal),
                        extraPayment: ko.observable(parseFloat(extraPaymentAmt).toFixed(2)),
                        viewExtraPayment: ko.observable(false)
                    };

                    //Update endingBal to reflect the new balance - extra payment this month
                    endingBal = (parseFloat(endingBal) - parseFloat(extraPaymentAmt)).toFixed(2);

                currentMtgYear.months.push(newMonth);

                //If self.initialPaymentMonth != null and we're out of this loop, we need to destroy that value as that's only needed for the first year
                self.initialPaymentMonth = null;

                //Update the new balance of the remaining lien
                self.currentBalance(endingBal);
            };

            self.years.push(currentMtgYear);
            var nextYear = self.currentYear() + 1; //Can't do ++ here
            self.currentYear(nextYear);
        }

        //Update the startingYear/startingMonth/endingYear/endingMonth objects of each recurring payment, where applicable
        $.each(self.recurringExtraPayments(), function(index, element){
            var startingYear = $(self.years()).filter(function(index){
                    return parseInt(this.year) == parseInt(element.startingYear().year);
                })[0];

                if(startingYear){
                    var endingYear = $(self.years()).filter(function(index){
                            return parseInt(this.year) == parseInt(element.endingYear().year);
                        })[0] || self.years()[self.years().length-1],
                        startingMonth = $(startingYear.months()).filter(function(index){
                            return this.name == element.startingMonth().name;
                        })[0] || startingYear.months()[0],
                        endingMonth = $(endingYear.months()).filter(function(index){
                            return this.name == element.endingMonth().name;
                        })[0] || endingYear.months()[endingYear.months().length-1];
                    
                    element.startingYear(startingYear);
                    element.startingMonth(startingMonth);
                    element.endingYear(endingYear);
                    element.endingMonth(endingMonth);
                } else {
                    element.needsRemoved = true;
                }
        });

        self.recurringExtraPayments.remove(function(item){
            return item.needsRemoved == true;
        });

        //Set the final payment amount
        self.finalPayment(parseFloat(self.currentBalance()).toFixed(2)); 

        //Update the loan scenarios object
        self.updateLoanScenarios(); 

        //Update the charts
        updatePieCharts();
        updateLineCharts();

        //Collapse all years after the first 5
        collapseYears();        
    };

    self.updatePaymentSchedule = function(month, year) {
        var currentYearIndex = self.years.indexOf(year),
            currentMonthIndex = self.years()[currentYearIndex].months.indexOf(month),
            currentMonthEndingBalance = (month.startingBalance() - (parseFloat(month.extraPayment()) + parseFloat(month.principal()))).toFixed(2),
            firstAddedYearIndex; //Index of first year dynamically added to the years() observable array
        
        //Update the current remaining balance of the lien
        self.currentBalance(currentMonthEndingBalance);

        //First, update the ending balance for the currently modified month
        self.years()[currentYearIndex].months()[currentMonthIndex].endingBalance(self.currentBalance());
        currentMonthIndex++; //Go ahead and increment to next month, as all that changed in current month is ending principal balance
        //Next, update all consecutive years and their months, then remove any years/months left over
        while (parseFloat(self.scheduledMonthlyPayment) < parseFloat(self.currentBalance())) {
            
            //If the next year doesn't exist (i.e. - we added many extra payments and now removed them, so need to re-add the years that were removed)
            //Then, we're going to push one onto the array.
            if(!self.years()[currentYearIndex]) {
                var lastYearIndex = currentYearIndex - 1,
                    nextYearNumber = self.years()[lastYearIndex].year + 1;
                self.years.push({
                    year: nextYearNumber,
                    months: ko.observableArray()                
                });
                //Populate first added year index or leave it as is if it's a truthy value
                firstAddedYearIndex = firstAddedYearIndex || currentYearIndex;
            }

            for (; currentMonthIndex < monthNames.length && parseFloat(self.scheduledMonthlyPayment) < parseFloat(self.currentBalance()); currentMonthIndex++) {
                var interestAmt = interestPayment(self.currentBalance()),
                    principalAmt = principalPayment(interestAmt),
                    endingBal = newBalance(self.currentBalance(), principalAmt);

                //If there isn't an array item for the current month, create one
                if (!self.years()[currentYearIndex].months()[currentMonthIndex]) {
                    self.years()[currentYearIndex].months.push({
                        startingBalance: ko.observable(""),
                        name: monthNames[currentMonthIndex],
                        interest: ko.observable(""),
                        principal: ko.observable(""),
                        endingBalance: ko.observable(""),
                        extraPayment: ko.observable(parseFloat(0.00).toFixed(2)),
                        viewExtraPayment: ko.observable(false)
                    });
                }
                                
                //Update the new balance of the remaining lien
                endingBal -= self.years()[currentYearIndex].months()[currentMonthIndex].extraPayment();

                self.years()[currentYearIndex].months()[currentMonthIndex].startingBalance(parseFloat(self.currentBalance()).toFixed(2));
                self.years()[currentYearIndex].months()[currentMonthIndex].interest(interestAmt);
                self.years()[currentYearIndex].months()[currentMonthIndex].principal(principalAmt);
                self.years()[currentYearIndex].months()[currentMonthIndex].endingBalance(endingBal.toFixed(2));

                self.currentBalance(endingBal);

                //If we're on the very first year, and the index may not be lined up to the month
                //  ex: If the first payment was on 9-1-2013, then index 0 of that year's months array would relate to index 8 of monthNames array
                if(monthNames[currentMonthIndex] != "December" && self.years()[currentYearIndex].months()[currentMonthIndex].name == "December") {
                    currentMonthIndex = monthNames.length; //go ahead and set it to monthNames.length
                }
            };

            //If we're going to loop through another year, increment the year and reset month index:
            if (parseFloat(self.scheduledMonthlyPayment) < parseFloat(self.currentBalance())) {
                //reset month index to 0
                currentMonthIndex = 0;
                //update current year index so we can update values for the following year
                currentYearIndex++;
            };  
        }

        //now that the payment schedule has been updated, let's remove years and months that aren't needed.
        var finalYear = self.years()[currentYearIndex],
            finalMonth = finalYear.months()[--currentMonthIndex]; //Current Month index increments again at end of for loop, need to back it down one
            
        //remove any years after current one
        self.years.remove(function(item) {
            return item.year > finalYear.year;
        });
        //remove any months in the current year after the current one
        self.years()[currentYearIndex].months.remove(function(item) {
            return monthNames.indexOf(item.name) > monthNames.indexOf(finalMonth.name);
        });

        //Update final payment info
        self.finalPayment(parseFloat(self.currentBalance()).toFixed(2)); 

        //Update the loan scenarios object
        self.updateLoanScenarios();

        //Update the charts graphics
        updatePieCharts();
        updateLineCharts();

        //Collapse all years added anew
        if (firstAddedYearIndex) {
            collapseYears(firstAddedYearIndex);
        }                
    };

    /*MODIFY A SINGLE EXTRA PAYMENT*/
    self.showExtraPayment = function (month) {
        $.each(self.years(), function(i, e) {
            $.each(e.months(), function(i, e) {
                if(e.viewExtraPayment()) {
                    e.viewExtraPayment(false);
                }
            });
        });
        self.currentExtraPayment(parseFloat(month.extraPayment()).toFixed(2));
        month.viewExtraPayment(true);
        $("input[name='newExtraPaymentAmt']:visible:first").focus();
    };

    self.hideExtraPayments = function(month) {
        month.viewExtraPayment(false);
        self.currentExtraPayment("")
    };

    self.updateExtraPayment = function(month, year) {
        if(self.currentExtraPayment() != ""&& !isNaN(parseFloat(self.currentExtraPayment()))) {
            month.extraPayment(parseFloat(self.currentExtraPayment()).toFixed(2));
            self.updatePaymentSchedule(month, year);
            month.viewExtraPayment(false);
        }
        self.currentExtraPayment("");
    };

    /*ADD A NEW RECURRING EXTRA PAYMENT*/    
    self.showNewRecurringExtraPayment = function(){
        self.newRecurringExtraPaymentForm(true);
        $("#selectedStartYear").focus();
    };

    self.hideNewRecurringExtraPayment = function(){
        resetNewRecurringExtraPaymentVals();
    };

    self.addNewRecurringExtraPayment = function(){
        //Clear any previous error
        self.newRecurringExtraPaymentError(null);

        if(!self.selectedStartMonth() || !self.selectedEndMonth() || !self.selectedStartYear() || !self.selectedEndYear()){
            self.newRecurringExtraPaymentError("Please select all values");
            return false;
        }

        var startYearIndex = self.years().indexOf(self.selectedStartYear()),
            endYearIndex = self.years().indexOf(self.selectedEndYear()),
            startYearMonthIndex = self.years()[startYearIndex].months().indexOf(self.selectedStartMonth()),
            tmpMonthIndex = startYearMonthIndex,
            endYearMonthIndex = self.years()[endYearIndex].months().indexOf(self.selectedEndMonth()),
            newRecurringExtraPayment = new extraPayment();

        if (startYearIndex > endYearIndex || (startYearIndex == endYearIndex && startYearMonthIndex >= endYearMonthIndex)) {
            self.newRecurringExtraPaymentError("Starting Year/Month combination must be less than the ending Year/Month combination, with at least a 1 month span.");
            return;
        }

        if (parseFloat(self.newRecurringPaymentAmount()) < 0.01) {
            self.newRecurringExtraPaymentError("The extra payment amount must be at least 1 cent. (0.01)");
            return;
        }

        newRecurringExtraPayment.startingYear(self.selectedStartYear());
        newRecurringExtraPayment.startingMonth(self.selectedStartMonth());
        newRecurringExtraPayment.endingYear(self.selectedEndYear());
        newRecurringExtraPayment.endingMonth(self.selectedEndMonth());
        newRecurringExtraPayment.amount(parseFloat(self.newRecurringPaymentAmount()).toFixed(2));

        //Add this new recuring extra payment object to our observable array
        self.recurringExtraPayments.push(newRecurringExtraPayment);

        //Update our years/months within the span of the selected starting/ending year and starting/ending month
        for (var i = startYearIndex; i <= endYearIndex; i++){
            //Need to iterate through all months of each year, but remembering that the ending year's month 
            //may not be the last month of that year
            for (var j = tmpMonthIndex; 
                (i != endYearIndex && j < self.years()[i].months().length) ||
                (i == endYearIndex && j <= endYearMonthIndex); j++){
                //Get the current extra payment for the current month, and increment it by the newRecurringPaymentAmount
                var currentExtraPaymentAmt = self.years()[i].months()[j].extraPayment(),
                    newExtraPaymentAmt = (parseFloat(currentExtraPaymentAmt) + parseFloat(self.newRecurringPaymentAmount())).toFixed(2);

                self.years()[i].months()[j].extraPayment(newExtraPaymentAmt);
            };

            //Reset tmpMonthIndex to 0, as it only potentially needs to start at anything other than 0 for the first year
            tmpMonthIndex = 0;
        };
        //Need to update the whole of the payment schedule
        self.updatePaymentSchedule(self.years()[startYearIndex].months()[startYearMonthIndex], self.years()[startYearIndex]);
        resetNewRecurringExtraPaymentVals();
    };

    function resetNewRecurringExtraPaymentVals(){
        self.selectedStartYear(null);
        self.selectedStartMonth(null);
        self.selectedEndYear(null);
        self.selectedEndMonth(null);
        self.newRecurringPaymentAmount(parseFloat("0.00").toFixed(2));
        self.newRecurringExtraPaymentError(null);
        self.newRecurringExtraPaymentForm(false);
    }

    /*DELETING AN/ALL EXISTING RECURRING EXTRA PAYMENT(s)*/
    self.deleteRecurringExtraPayment = function(itemToRemove){
        var startYearIndex = self.years().indexOf(itemToRemove.startingYear()),
            endYearIndex = self.years().indexOf(itemToRemove.endingYear()),
            startYearMonthIndex = self.years()[startYearIndex].months().indexOf(itemToRemove.startingMonth()),
            tmpMonthIndex = startYearMonthIndex,
            endYearMonthIndex = self.years()[endYearIndex].months().indexOf(itemToRemove.endingMonth());
        //Update our years/months within the span of the selected starting/ending year and starting/ending month
        for (var i = startYearIndex; i <= endYearIndex; i++){
            //Need to iterate through all months of each year, but remembering that the ending year's month 
            //may not be the last month of that year
            for (var j = tmpMonthIndex; 
                (i != endYearIndex && j < self.years()[i].months().length) ||
                (i == endYearIndex && j <= endYearMonthIndex); j++){
                //Get the current extra payment for the current month, and increment it by the newRecurringPaymentAmount
                var currentExtraPaymentAmt = self.years()[i].months()[j].extraPayment(),
                    newExtraPaymentAmt = (parseFloat(currentExtraPaymentAmt) - parseFloat(itemToRemove.amount())).toFixed(2);
                //Never want to put in a value less than 0
                newExtraPaymentAmt = parseFloat(newExtraPaymentAmt) < 0 ? parseFloat("0.00").toFixed(2) : newExtraPaymentAmt;

                self.years()[i].months()[j].extraPayment(newExtraPaymentAmt);
            };

            //Reset tmpMonthIndex to 0, as it only potentially needs to start at anything other than 0 for the first year
            tmpMonthIndex = 0;
        };
        //Remove the item from the recurringExtraPayments Array
        self.recurringExtraPayments.remove(itemToRemove);
        //Need to update the whole of the payment schedule
        self.updatePaymentSchedule(self.years()[startYearIndex].months()[startYearMonthIndex], self.years()[startYearIndex]);
    };

    self.deleteAllRecurringExtraPayments = function(){
        for (var i = this.recurringExtraPayments().length - 1; i >= 0; i--) {
            self.deleteRecurringExtraPayment(this.recurringExtraPayments()[i]);
        };
    };
    
    /*Update loan scenario object for Data Vizualization CHARTS*/
    self.updateLoanScenarios = function() {
        var totalMonthsPaid = 0, 
            totalInterestPaidWithExtra = 0, 
            totalInterestPaidWithoutExtra = 0,
            calculatedBalance = self.initialMtgBalance(),
            totalPaid = 0;
        
        //Value(s) that are common regardless of extra payments
        currentLoanScenario.amountFinanced(self.initialMtgBalance());
        
        /*PIE CHART DATA*/
        //Without extra payments
        for (var i = 0; i < self.termMonths() && parseFloat(self.scheduledMonthlyPayment) < parseFloat(calculatedBalance); i++) {
            var interestAmt = interestPayment(calculatedBalance),
                principalAmt = principalPayment(interestAmt),
                endingBal = newBalance(calculatedBalance, principalAmt);

            //Update the running total of the interest without extra payments
            totalInterestPaidWithoutExtra += parseFloat(interestAmt);
            //Update the new balance of the remaining lien
            calculatedBalance = endingBal;
        };
        
        currentLoanScenario.withoutExtraPayments.totalInterest(totalInterestPaidWithoutExtra.toFixed(2));
        currentLoanScenario.withoutExtraPayments.totalYears(self.termYears());
        currentLoanScenario.withoutExtraPayments.totalMonths(self.termMonths());
        currentLoanScenario.withoutExtraPayments.totalCost((parseFloat(totalInterestPaidWithoutExtra) + parseFloat(self.initialMtgBalance())).toFixed(2));


        //With extra payments
        for (var i = self.years().length - 1; i >= 0; i--) {
            totalMonthsPaid += parseInt(self.years()[i].months().length);
            totalInterestPaidWithExtra += parseFloat(self.getYearsTotals(self.years()[i]).totalInterest);
        };

        currentLoanScenario.withExtraPayments.totalYears(self.years().length);
        currentLoanScenario.withExtraPayments.totalMonths(totalMonthsPaid);
        currentLoanScenario.withExtraPayments.totalInterest(totalInterestPaidWithExtra.toFixed(2));
        currentLoanScenario.withExtraPayments.totalCost((parseFloat(totalInterestPaidWithExtra) + parseFloat(self.initialMtgBalance())).toFixed(2));
        
        /*LINE CHART DATA*/

        //First, want to clear our all prior data in each array for both extra payments and regular
        //With extra payments
        currentLoanScenario.lowLevelWithExtraPayments.interest.data = [];
        currentLoanScenario.lowLevelWithExtraPayments.principal.data = [];
        currentLoanScenario.lowLevelWithExtraPayments.extra.data = [];
        //Without extra payments
        currentLoanScenario.lowLevelWithoutExtraPayments.interest.data = [];
        currentLoanScenario.lowLevelWithoutExtraPayments.principal.data = [];
        //Next, populate all info anew
        
        //Without extra payments
        var tmpCurrentBalance = parseFloat(self.initialMtgBalance()),
            tmpYearNum = moment(self.initialPaymentDate()).year(),
            tmpMonthNum = moment(self.initialPaymentDate()).month();
        while (parseFloat(self.scheduledMonthlyPayment) < parseFloat(tmpCurrentBalance)){
            var yearPrincipal = 0,
                yearInterest = 0;

            for (var i = tmpMonthNum; i < monthNames.length && parseFloat(self.scheduledMonthlyPayment) < tmpCurrentBalance; i++){
                var tmpInterest = parseFloat(interestPayment(tmpCurrentBalance));
                    tmpPrincipal = parseFloat(principalPayment(tmpInterest));

                yearPrincipal += tmpPrincipal;
                yearInterest += tmpInterest;
                tmpCurrentBalance = newBalance(tmpCurrentBalance, tmpPrincipal);
            };

            currentLoanScenario.lowLevelWithoutExtraPayments.interest.data.push([tmpYearNum, yearInterest.toFixed(2)]);
            currentLoanScenario.lowLevelWithoutExtraPayments.principal.data.push([tmpYearNum, yearPrincipal.toFixed(2)]);

            tmpMonthNum = 0;
            tmpYearNum++;
        };
        
        //With extra payments
        for (var i = 0; i < self.years().length; i++) {
            
            var currentYear = self.years()[i].year,
                yearsTotals = self.getYearsTotals(self.years()[i]);
            
            currentLoanScenario.lowLevelWithExtraPayments.interest.data.push([parseInt(currentYear), yearsTotals.totalInterest.toFixed(2)]);
            currentLoanScenario.lowLevelWithExtraPayments.principal.data.push([parseInt(currentYear), yearsTotals.totalPrincipal.toFixed(2)]);
            currentLoanScenario.lowLevelWithExtraPayments.extra.data.push([parseInt(currentYear), yearsTotals.totalExtra.toFixed(2)]);
        };       
    };

    //As soon as this object is instantiated as new vm(), then we want to create the payment schedule.
    self.createPaymentSchedule();
};        
