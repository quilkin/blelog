
var bleSensors = (function () {
    "use strict";

    var bleSensors = {},
    
    // list of sensors downloaded from database
    sensors = [],
    // list of sensors currently displayed in chart etc
    displayedSensors = [],
    // list of sensors that have been found on BT
    foundSensors = [],
    // the sensor being set up or communicated with, and/or the latest one to be downloaded from web
    currentSensor=null;

    // local functions
    function getWebSensors(userID) {
        bleData.myJson("GetSensorNames", "POST", userID, function (response) { sensors = response; }, false, null);
        if (sensors.length === 0) {
            popup.Alert("No data found!");
            return;
        }
        $.each(sensors, function (index, sensor) {
            sensor.ShortSerial = bleSensors.shortSerial(sensor.Serial);
        });
        return sensors;
    }

    // conversion between full & short serial numbers.
    // Different for iOS and Android !!!!!
    bleSensors.shortSerial = function (serial) {
        if (bleApp.getPlatform() === 'iOS') {
            return serial.replace(/-/g, '').trim(); // without the hyphens, so it can be used as a button ID
        }
        return serial.replace(/:/g, '').trim(); // without the colons, so it can be used as a button ID
    };
    // Different for iOS and Android !!!!!
    bleSensors.fullSerial = function (ss) {
        if (bleApp.getPlatform() === 'iOS') {
            // add the hyphens to the short version, so it can be used to connect to
            return ss.substr(0, 8) + "-" + ss.substr(8, 4) + "-" + ss.substr(12, 4) + "-" + ss.substr(16, 4) + "-" + ss.substr(20, 12) ;
        }
        // add the colons to the short version, so it can be used to connect to
        return ss.substr(0, 2) + ":" + ss.substr(2, 2) + ":" + ss.substr(4, 2) + ":" + ss.substr(6, 2) + ":" + ss.substr(8, 2) + ":" + ss.substr(10, 2);
    };

    bleSensors.Sensor = function (serial, name, rssi, ID, period, description, alarmlo, alarmhi, owner) {
        this.Serial = serial;       // full serial number e.g. "12:34:56:78:9A:BC"
        this.ShortSerial = bleSensors.shortSerial(serial);
        this.Name = name;
        this.RSSI = rssi;
        this.Period = period;
        this.Description = description;
        this.AlarmLow = alarmlo;
        this.AlarmHigh = alarmhi;
        this.ID = ID;
        this.Owner = owner;
        // negative time indicates not connected
        this.ConnectionTime = -1;
        // flag used to avoid downloading more than neccessary
        this.downloaded = false;
        // index in DisplayedSensors
        //this.index = -1;
        // recent values stored temporarily before being uploaded to database
        this.NewValues = [];
    };

    bleSensors.addFoundSensor = function (obj) {
        var found = $.grep(foundSensors, function (e, i) {
            return e.Serial === obj.address;
        });
        if (found.length > 0) {
            return null;
         //   currentSensor = found[0];
        }

        currentSensor = new bleSensors.Sensor(obj.address, obj.name, obj.rssi);
        foundSensors.push(currentSensor);

        //else {
        //    found.NewValues = sensor.NewValues;
        //}
        return currentSensor;
    };
    bleSensors.findSensor = function (serial) {
        var found = $.grep(foundSensors, function (e, i) {
            return e.Serial === serial;
        });
        if (found.length > 0) {
            return found[0];
        }

        return null;

    };
    bleSensors.CurrentSensor = function () {
        return currentSensor;
    };
    bleSensors.SetSensor = function (sensor) {
        currentSensor = sensor;
    };
    bleSensors.DisplayedSensors = function () {
        return displayedSensors;
    };
    bleSensors.FoundSensors = function () {
        return foundSensors;
    };
    bleSensors.ClearFoundSensors = function () {
        while (foundSensors.length > 0) { foundSensors.pop(); }
    }
    bleSensors.DisplayedSensorNames = function () {
        var index, nameStr='';
        for (index = 0; index < displayedSensors.length; index++) {
            nameStr += (displayedSensors[index].Name);
            nameStr += ', ';
        }
        nameStr = nameStr.slice(0, -2);
        return nameStr;
    };
    bleSensors.DisplayedSensorIDs = function () {
        var index, ids=[];
        for (index = 0; index < displayedSensors.length; index++)
        {
            ids.push(displayedSensors[index].ID);
        }
        return ids;
    };
    bleSensors.isDisplayed = function (sensor) {
        var index = $.inArray(sensor, displayedSensors);
        if (index < 0) { return false; }
        return true;
    };
    bleSensors.DisplaySensor = function (sensor, yes) {
        var index, howmany = displayedSensors.length;
        for (index =0; index<howmany; index++){
            if (displayedSensors[index].ShortSerial === sensor.ShortSerial)
                break;
        }

        //var index = $.inArray(sensor,displayedSensors);
        if (index < howmany) {
            // it was found
            if (yes) {
    //            already there, do nothing
            }
            else {
                // remove it
                displayedSensors.splice(index, 1);
     //           sensor.index = -1;
            }
        }
        else {
        // not already in list
            if (yes) {
                displayedSensors.push(sensor);
   //             sensor.index = $.inArray(sensor, displayedSensors);
            }
            else {
  //              sensor.index = -1;
            }
        }
        // must re-arrange into ID order so that SQL query wiil return corresponding data
        displayedSensors.sort(function (a, b) { return a.ID - b.ID });
        if (yes) { currentSensor = sensor; }
    };

    bleSensors.CreateSensorList = function () {
        var id = login.ID();
        if (id === undefined || id === 0) {
            $('#loginModal').modal();
            return;
        }
        if (sensors === undefined || sensors.length === 0) {
            getWebSensors(id);
        }
        $('#findlist').empty();  // this will also remove any handlers
        $('#setuplist').empty();
        $.each(sensors, function (index, sensor) {

            var htmlstr = '<a id="sen' + index + '" class="list-group-item">' + sensor.Name +
                '<button id="get' + index + '" type="button" class="btn btn-lifted btn-info btn-sm pull-right" data-toggle="button" data-complete-text="Deselect">Select</button>' +
                '</a>';
            $('#findlist').append(htmlstr);
            if (bleSensors.isDisplayed(sensor)) {
                // for re-showing list when sensors have previously been displayed (list will be emptied for small screens)
                $('#get' + index).button('complete');
            }
            $('#get' +index).click(function () {
                if (bleSensors.isDisplayed(sensor)) {
                    $(this).button('reset');
                    bleSensors.DisplaySensor(sensor, false);
                }
                else {
                    $(this).button('complete');
                    bleSensors.DisplaySensor(sensor,true);
                }
                //bleData.showData();
            });
            htmlstr = '<a id="sen' + index + '" class="list-group-item">' + sensor.Name +
                '<button id="set' + index + '" type="button" class="btn btn-lifted btn-info btn-sm pull-right" >Set up</button>' +
                '</a>';
            $('#setuplist').append(htmlstr);
            $('#set' + index).click(function () {
                bleSensors.SetSensor(sensor);
                bleSetup.initialise();
                $('#sensorTitle').text("Set up Sensor: serial no. " + sensor.Serial);
                // if it's a short screen, collapse the sensor list and date chooser to make it easier to see the graph
                // if ($('#btnMenu').is(":visible")) {
                // *** To Do: this won't work correctly for landscape/portrait changes
                if (bleApp.tableHeight < 300) {
                    $('#setuplist').empty();
                    htmlstr = '<a id="setupTitle" class="list-group-item list-group-item-info">Choose sensor</a>';
                    $('#setuplist').append(htmlstr);
                    $('#setupTitle').click(bleSensors.CreateSensorList);
                }
                if (bleApp.tableHeight < 250) {
                    // save more space by making the setup title bar clickable, instead of the sensor list title
                    $('#setupTitle').hide();
                    $('#sensorTitle').click(bleSensors.CreateSensorList);
                }
            });
            index++;
        });
        $('#findlist').append('<div><button id="showSelected" type="button" class="btn btn-info  pull-right">Show Selection</button></div>');
        $('#showSelected').click(bleData.showData);
        //bleSensors.findSensor("B4994C6417C0");
    };

    //bleSensors.checkRegistrations = function () {
    //    if (foundSensors.length > 0 && login.loggedIn) {
    //        var unregistered = [];
    //         //   devices = tagConnect.devices();
    //        foundSensors.forEach(function (device) {
    //            //var check;
    //            //// find any which aren't in the existing list for this user, and which have a default name
    //            //check = $.grep(sensors, function (e) {
    //            //    return (device.Serial.trim() === e.Serial.trim());
    //            //});
                
    //            //if (check.length === 0) {
    //            //    unregistered.push(device);
    //            //}
    //            // find any which have a default name
    //            // To Do: change this to check owner of device (needs owner ID to be stored in device along with other setup info)
    //            //if (device.Name.indexOf('BleLog') === 0)
    //            {
    //                unregistered.push(device);
    //            }
    //        });
    //        if (unregistered.length > 0) {
    //            $('#register').show();
    //            $('#register').click(function () {
    //                unregistered.forEach(function (device)
    //                {
    //                    popup.Confirm("Setup now?", device.Serial + " is not yet registered",
    //                        function () {
    //                            var newsensor = new bleSensors.Sensor(device.Serial, device.Name, device.rssi,0, 600, "", 0, 100, device.ID);
    //                            bleSensors.SetSensor(newsensor);
    //                            $(".navbar-nav a[href=#panel-setup]").tab('show');
    //                            setup.initialise();
    //                        }, null, -10);
    //                });
    //            });
    //        }
    //    }
    //    else {
    //        $('#register').hide();
    //    }
    //};


    return bleSensors;
}());
