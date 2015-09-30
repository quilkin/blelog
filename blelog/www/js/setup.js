
/*global jQuery,bleSensors*/

var bleSetup = (function ($) {

    "use strict";

    var bleSetup = {},
        alarmSlider,
        minAlarm = 2,
        maxAlarm = 8,
        minVal = -30,
        maxVal = 90,
        registering = false,
        periods = [['10 sec', 10],['1 min', 60],['5 min', 300],['10 min', 600],['30 min', 1800],['60 min', 3600]],
        update = function () {
            alarmSlider.update({
                from: minAlarm,
                to: maxAlarm
            });
            $("#saveChanges").prop("disabled", false);
        },
        periodButton = function (sensor) {
            var btnText;
            // To Do: this isn't quite right...
            btnText = sensor.Period / 60 + " minute";
            if (sensor.Period > 60) {
                btnText += "s";
            }
            btnText += ' <span class="caret"></span>';
            $("#periodMenu").html(btnText);
        },
        setPeriod = function (address) {
            // device must already be connected

            var period =60,periodstr = $('#Period').val();

            switch (periodstr) {
                case '10 sec': period = 10; break;
                case '1 min': period = 60; break;
                case '5 min': period = 300; break;
                case '10 min': period = 600; break;
                case '30 min': period = 1800; break;
                case '60 min': period = 3600; break;
                default: period = 60; break;
            }
            tagConnect.changePeriod(address, period);

            //var alarms = [50,51,40,41];
            //// quick test, needs moving to it's own routine with UI for changing alarms
            //tagConnect.changeAlarms(address, alarms);
        },
        save = function () {
            $("#saveChanges").prop("disabled", true);
            var sensor = bleSensors.CurrentSensor();
            sensor.AlarmLow = minAlarm * 10;
            sensor.AlarmHigh = maxAlarm * 10;
            sensor.Description = $("#sensor-desc").val();
            sensor.Name = $("#sensor-name").val();
        },
        done = function () {
            save();
            popup.Confirm("Save new sensor values", "Are you sure?", function () {
                bleData.myJson("SaveSensor", "POST", bleSensors.CurrentSensor(), function (response) {
                    popup.Alert(response);
                }, true, null);
            },
            null, -10);
            // **** To Do: send new settings to device ***************
            if (registering) {
                // switch back to conenction tab
                $(".navbar-nav a[href=#home]").tab('show');
            }
        };

    $("#btnLow-").on('click', function () {
        if (minAlarm > minVal) {
            --minAlarm;
            update();
        }
        else {    /* beep? */ }
    });
    $("#btnLowPlus").on('click', function () {
        if (minAlarm < maxAlarm) {
            ++minAlarm;
            update();
        }
        else {    /* beep? */ }
    });
    $("#btnHi-").on('click', function () {
        if (maxAlarm > minAlarm) {
            --maxAlarm;
            update();
        }
        else {    /* beep? */ }
    });
    $("#btnHiPlus").on('click', function () {
        if (maxAlarm < maxVal) {
            ++maxAlarm;
            update();
        }
        else {    /* beep? */ }
    });
    $("#setupDone").on('click',done);
    $("#cancelChanges").on('click', function () {
        if (registering) {
            // switch back to connection tab
            $(".navbar-nav a[href=#home]").tab('show');
        }
        else {
            // TO DO: change back to original values
        }
    });

    bleSetup.initialise = function (reg) {
       
        //if (bleData.CurrentSensor() === null) {
        //    popup.Alert("Please choose a sensor");
        //    return;
        //}
        registering = reg;
        var perioditem,sensor =  bleSensors.CurrentSensor();
        if (sensor === undefined || sensor === null) {
            sensor = new bleSensors.Sensor("Unknown", "no name", 0,0,60, "", 0, 80, 0);
        }
        $("#sensor-name").val(sensor.Name);
        $("#sensor-desc").val(sensor.Description);
        periodButton(sensor);
        minAlarm = sensor.AlarmLow / 10;
        maxAlarm = sensor.AlarmHigh / 10;
        $("#saveChanges").prop("disabled", true);

        $('#periodlist').empty();
        $.each(periods, function (index, p) {
            //for (p=0; p < periods.length; p++)
            perioditem = '<li id="p' + p[1] + '" role="presentation"><a role="menuitem" tabindex="-1" >' + p[0] + '</a></li>';

            $('#periodlist').append(perioditem);
            $('#p' + p[1]).on('click', function () {
                $("#saveChanges").prop("disabled", false);
                //var sensor = bleSensors.CurrentSensor();
                sensor.Period = p[1];
                periodButton(sensor);
            });
        });
        $("#sliderAlarm").ionRangeSlider({
            min: minVal,
            max: maxVal,
            from: minAlarm,
            to: maxAlarm,
            type: 'double',
            postfix: "°C",
            grid: true,
            grid_num: 10,
            onFinish: function (data) {
                minAlarm = data.from;
                maxAlarm = data.to;
                $("#saveChanges").prop("disabled", false);
            }
        });
        alarmSlider = $("#sliderAlarm").data("ionRangeSlider");
        update();
    };

    return bleSetup;
}(jQuery));