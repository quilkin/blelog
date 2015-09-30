
// Documentation for the TI SensorTag:
// http://processors.wiki.ti.com/index.php/SensorTag_User_Guide
// http://processors.wiki.ti.com/index.php/File:BLE_SensorTag_GATT_Server.pdf


/*global bleTime,bleSensors,bluetoothle*/

var tagConnect = (function ($) {
    "use strict";

    var tagConnect = {},
        services = [],
        //serviceUuids = [],
        devices = [],
        //currentConnection,  // current (or last) connected device 
        currentTask,
        devicetable,
        subscribing,
        blocksToGet,
        scanning,
        btnGetall,
        connectTimer,
        btnUpload;

    var
        IRTEMPERATURE_SERVICE = 'f000aa00-0451-4000-b000-000000000000',
        IRTEMPERATURE_CONFIG = 'f000aa02-0451-4000-b000-000000000000',
        IRTEMPERATURE_DATA = 'f000aa01-0451-4000-b000-000000000000',
        IRTEMPERATURE_NOTIFICATION = '00002902-0000-1000-8000-00805f9b34fb',
        IRTEMPERATURE_PERIOD = 'f000aa03-0451-4000-b000-000000000000',
        IRTEMPERATURE_ALARMS = 'f000aa04-0451-4000-b000-000000000000',

        TEMPSTORE_SERVICE = 'f000aa70-0451-4000-b000-000000000000',
        TEMPSTORE_CONFIG = 'f000aa72-0451-4000-b000-000000000000',
        TEMPSTORE_DATA = 'f000aa71-0451-4000-b000-000000000000',
        TEMPSTORE_NOTIFICATION = '00002902-0000-1000-8000-00805f9b34fb',
        TEMPSTORE_READ_ALL = 3,
        TEMPSTORE_READ_RAM = 4,

        KEYPRESS_SERVICE = '0000ffe0-0000-1000-8000-00805f9b34fb',
        KEYPRESS_DATA = '0000ffe1-0000-1000-8000-00805f9b34fb',
        KEYPRESS_NOTIFICATION = '00002902-0000-1000-8000-00805f9b34fb';

/////////////////////////////////////
//////////////////// local functions
//////////////////////////////////////

    function Service(addr, serviceuuid) {
        this.address = addr;
        this.serviceUuid = serviceuuid;
        this.characteristics = [];

    }

    function logError(message,obj) {
        bleTime.log("****" + message + ": " + JSON.stringify(obj));
    }

    function initializeSuccess(obj) {
        bleTime.log("Initialize Success : " + JSON.stringify(obj));
        if (obj.status === "enabled") {
            bleTime.log("Enabled");
        }
        else {
            logError("Unexpected Initialize Status",obj);
        }
    }
    function initializeError(obj) {
        logError("Initialize Error",obj);
        displayStatus(JSON.stringify(obj));
    }

    function displayStatus(value) {
        $("#progress-bar").hide();
        $("#upload-all").hide();
        $('#statusConnect').show();
        $('#statusConnect').text(value);
    }

    function findDevice(address) {
        return bleSensors.findSensor(address);
    }

    function startScanSuccess(obj) {
        bleTime.log("Start Scan Success : " + JSON.stringify(obj));

        if (obj.status === "scanResult") {
            bleTime.log("Found device");

            if (bleSensors.addFoundSensor(obj) !== null) {
                var serial = obj.address,
                    name = obj.name,
                    rssi, len, htmlstr,
                    buttonID,
                    registerButton = '',
                    namestring,
                    advertBytes =[],
                    connectButton;
                //if (name == 'SensorTag' || name.indexOf('BleLog')===0) {
                //    // undefined name, use serial number instead
                //    name = obj.address;
                //}
                rssi = 100 + obj.rssi;
                if (obj.advertisement !== undefined) {
                    advertBytes = bluetoothle.encodedStringToBytes(obj.advertisement);
                }

                len = bleSensors.FoundSensors().length;
                buttonID = bleSensors.shortSerial(serial);
                registerButton = '';
                connectButton = '<button id="get' + len + '" type="button" class="btn btn-lifted btn-info btn-sm pull-right">Connect</button>';

                // find any which have a default name, therefore not yet registered?
                if (name.indexOf('BleLog') === 0) {
                    registerButton = '<button id="reg' + len + '" type="button" class="btn btn-lifted btn-default btn-sm pull-right">Register</button>';
                }
                namestring = name;
                if (bleApp.getPlatform() === 'iOS') {
                    // temporary, until we get iOS and android to display the same names  
                    namestring = '(' + serial + ')';
                }
                htmlstr = '<a id="' + buttonID + '" class="list-group-item">' + namestring + registerButton + connectButton + '<span class="glyphicon glyphicon-signal"></span> ' + rssi + '</a>';
                $('#scanlist').append(htmlstr);
                $('#get' + len).click(function () {
                    tagConnect.connect(serial);
                });
                if (registerButton.length > 0) {
                    $('#reg' + len).click(function () {
                        popup.Confirm("Setup now?", serial + " (" + name + ") is not yet registered",
                              function () {
                                  var id, newsensor = new bleSensors.Sensor(serial, name, rssi, 0, 600, "", 0, 100, device.ID);
                                  bleSensors.SetSensor(newsensor);
                                  id = login.ID();
                                  if (id === undefined || id === 0) {
                                      $('#loginModal').modal();
                                      // login will create list which we don't need here
                                      $('#loginModal').on('hidden.bs.modal', function () {
                                          $('#setuplist').empty();
                                      });
                                  }
                                  $(".navbar-nav a[href=#panel-setup]").tab('show');
                                  // clear list for the case where login has already been done
                                  $('#setuplist').empty();
                                  bleSetup.initialise(true);
                              }, null, -10);
                    });
                }
            }
        }
        else if (obj.status === "scanStarted") {
            bleTime.log("Scan Started");
        }
        else {
            logError("Unexpected Start Scan Status",obj);
        }
    }
    
    function startScanError(obj) {
        logError("Start Scan Error",obj);
        scanning = false;
    }

    function stopScanSuccess(obj) {
        bleTime.log("Stop Scan Success : " + JSON.stringify(obj));
        if (obj.status === "scanStopped") {
            $('#scanTitle').html("Search for devices");
            scanning = false;
            bleTime.log("Scan Stopped");
        }
        else {
            bleTime.log("Unexpected Stop Scan Status");
        }
    }

    function stopScanError(obj) {
        logError("Stop Scan Error",obj);
    }

    function startScan() {
        //TODO Disconnect / Close all addresses and empty
        //bleTime.log(device.model);
        var htmlstr, paramsObj, beep;
        if (bleApp.getPlatform==="android") {
            beep = new Media("/android_asset/www/res/beep_mp3.mp3");
            beep.play();
        }
        if (bleApp.getPlatform === "iOS") {
            beep = new Media("res/beep_mp3.mp3");
            beep.play();
        }
        paramsObj = { serviceUuids: [] };
        bleTime.log("Start Scan : " + JSON.stringify(paramsObj));


        $('#scanlist').empty();
        // add the header back into the list
        htmlstr = '<a id="scanTitle" class="list-group-item list-group-item-info">Stop searching</a>';
        $('#scanlist').append(htmlstr);
        $('#scanTitle').click(tagConnect.scan);

        //bleTag.displayStatus("Start Scan")
        if (bleApp.isMobile()) {
            bluetoothle.startScan(startScanSuccess, startScanError, paramsObj);
            scanning = true;
        }

        else {
            popup.Alert("No mobile device detected");
        }
        return false;
    }

    function stopScan() {
        bleTime.log("Stop Scan");
        if (bleApp.isMobile()) {
            bluetoothle.stopScan(stopScanSuccess, stopScanError);
        }
        else {
            popup.Alert("No mobile device detected");
        }
        return false;
    }

    function connectSuccess(obj) {
        bleTime.log("Connect Success : " + JSON.stringify(obj));
        clearTimeout(connectTimer);
        if (obj.status === "connected") {
            bleTime.log("Connected");
            var dev = findDevice(obj.address);
            if (dev === null) {
                bleTime.log("Cannot find device in list!");
                return;
            }
            dev.ConnectionTime = 0;

            //currentConnection = dev;
            discover(obj.address);

        }
        else if (obj.status === "connecting") {
            bleTime.log("Connecting");
            displayStatus("Connecting");
        }
        else {
            logError("Unexpected Connect Status",obj);
            displayStatus("***Disconnected, please try again***");
            tagConnect.disconnect(obj.address);
        }
    }

    function connectError(obj) {
        var err = "Connect Error : " + JSON.stringify(obj);
        logError(err,obj);
        displayStatus(err);
    }
      
    function addService(address, serviceUuid) {
        //var check = devices.indexOf(address);
        if (findDevice(address) === null) {
            logError("device not found",address); return;
        }

        var service, svcs = $.grep(services, function (e) {
            return (serviceUuid === e.serviceUuid);
        });

        if (svcs.length > 0) {
            logError("Service already found",serviceUuid);
            return;
        }
        service = new Service(address, serviceUuid);
        services.push(service);
    }

    function discoverSuccess(obj) {
        bleTime.log("Discover Success");
        displayStatus("Discover Success");
        if (obj.status === "discovered") {
            bleTime.log("Discovered");
            var i, service, address = obj.address;

            for (i = 0; i < obj.services.length; i++) {
                service = obj.services[i];
                addService(address, service.serviceUuid);
            }

            // default action after discovery is to download the latest data
            tagConnect.setTask(TEMPSTORE_READ_RAM);
            tagConnect.subscribeTempStore(obj.address);

        }
        else {
            logError("Unexpected Discover Status",obj);
        }
    }
    function discoverError(obj) {
        logError("Discover Error",obj);
    }

    function getCharacteristics(serviceUuid) {
        var i, service, address, paramsObj;

        if (serviceUuid === '') {
            // get characteristics of first service
            serviceUuid = services[0].serviceUuid;
            address = services[0].address;
        }
        else {
            // get characteristics of next service after this one, if there any more
            for (i = 0; i < services.length; i++) {
                service = services[i];
                if (service.serviceUuid === serviceUuid) {
                    if (i < services.length - 1) {
                        // still more characteristics to fetch
                        serviceUuid = services[i + 1].serviceUuid;
                        address = services[i + 1].address;
                        break;

                    }
                    // this was the last service, so now, at last, we can try to subscribe
                    // default action now is to download the latest data
                    tagConnect.setTask(TEMPSTORE_READ_RAM);
                    tagConnect.subscribeTempStore(services[i].address);
                    return;
                }
            }

        }
        paramsObj = {
            address: address,
            serviceUuid: serviceUuid,
            characteristicUuids: []
        };
        bleTime.log("Get characteristics : " + JSON.stringify(serviceUuid));
        bluetoothle.characteristics(characteristicsSuccess, characteristicsError, paramsObj);
    }

    function servicesSuccess(obj) {
        bleTime.log("Services Success");
        displayStatus("Services Success");
        if (obj.status === "services") {
            bleTime.log("Discovered services");
            var i, svc,
                address = obj.address,
                svcs = obj.serviceUuids;
            for (i = 0; i < svcs.length; i++) {
                svc = svcs[i];
                addService(address, svc);
            }
            // start by getting characteristics of first service
            getCharacteristics('');
        }
        else {
            logError("Unexpected Services Status",obj);
        }
    }

    function servicesError(obj) {
        logError("Services Error",obj);
    }

    function discover(address) {
        var paramsObj = { address: address };
        if (bleApp.getPlatform() === 'iOS') {
           // remove services from last discovered device
            while (services.length > 0) {
                services.pop();
            }
            bleTime.log("Get services : " + JSON.stringify(paramsObj));
            bluetoothle.services(servicesSuccess, servicesError, paramsObj);
            return false;
        }

        bleTime.log("Discover : " + JSON.stringify(paramsObj));
        bluetoothle.discover(discoverSuccess, discoverError, paramsObj);
        return false;
    }

    function addCharacteristic(address, serviceUuid, characteristic) {

        var svcs = $.grep(services, function (e) {
            return (serviceUuid === e.serviceUuid);
        });

        if (svcs.length === 1) {
            svcs[0].characteristics = characteristic;
        }
        else {
            logError("addCharacteristic: multiple or undefined service",serviceUuid);
        }
    }
   
    function characteristicsSuccess(obj) {
        bleTime.log("Characteristics Success : " + JSON.stringify(obj));
        if (obj.status === "characteristics") {
            // bleTime.log("Discovered Characteristics");
            var i, characteristic;
            for (i = 0; i < obj.characteristics.length; i++) {
                characteristic = obj.characteristics[i];
                addCharacteristic(obj.address, obj.serviceUuid, characteristic);
            }
            // now we can recursively ask for characteristics for next service
            getCharacteristics(obj.serviceUuid);
        }
        else {
            logError("Unexpected Services Status",obj);
        }
    }

    function characteristicsError(obj) {
        logError("Characteristics Error",obj);
    }

    function disconnectSuccess(obj) {
        bleTime.log("Disconnect Success : " + JSON.stringify(obj));
        if (obj.status === "disconnected") {
            bleTime.log("Disconnected");
            //if (obj.close)
            tagConnect.close(obj.address);
            //currentConnection = null;
        }
        else if (obj.status === "disconnecting") {
            bleTime.log("Disconnecting");
        }
        else {
            logError("Unexpected Disconnect Status",obj);
        }
    }

    function disconnectError(obj) {
        logError("Disconnect Error",obj);
        // try closing anyway
        tagConnect.close(obj.address);
        //currentConnection = null;
        //tagConnect.close(obj.address);
    }

    function isConnectedSuccess(obj) {
        var device = findDevice(obj.address);
        if (device === null) {
            return false;
        }
        if (obj.isConnected) {
            bleTime.log(JSON.stringify(obj) + " is connected");
            if (device.ConnectionTime > 60) {
                device.ConnectionTime = 0;
                popup.Confirm("Device " + device.Serial + " has been connected for a long time", "Do you wish to disconnect?",
                    function () { tagConnect.disconnect(device.Serial); device.ConnectionTime = -1; },
                    null, 10);
            }
            return true;
        }
       // bleTime.log(JSON.stringify(obj) + " is not connected");
        device.ConnectionTime = -1;
        return false;
    }

    function closeSuccess(obj) {
        bleTime.log("Close Success : " + JSON.stringify(obj));
        if (obj.status === "closed") {
            bleTime.log("Closed");
        }
        else {
            logError("Unexpected Close Status",obj);
        }
    }

    function closeError(obj) {
        logError("Close Error",obj);
    }

    function rssiSuccess(obj) {
        bleTime.log("RSSI Success : " + JSON.stringify(obj));
        if (obj.status === "rssi") {
            bleTime.log("RSSI");
        }
        else {
            logError("Unexpected RSSI Status",obj);
        }
    }

    function rssiError(obj) {
        logError("RSSI Error",obj);
    }

    function readSuccess(obj) {

        bleTime.log("Read Success : " + JSON.stringify(obj));
        if (obj.status === "read") {
            var bytes = bluetoothle.encodedStringToBytes(obj.value);
            bleTime.log("Read : " + bytes[0] + ' ' + bytes[1] + ' ' + bytes[2] + ' ' + bytes[3]);
            irTemperatureHandler(bytes);
        }
        else {
            logError("Unexpected Read Status",obj);
        }
    }

    function readError(obj) {
        logError("Read Error",obj);
    }
    function read(address, serviceUuid, characteristicUuid) {
        var paramsObj = { address: address, serviceUuid: serviceUuid, characteristicUuid: characteristicUuid };
        bleTime.log("Read : " + JSON.stringify(paramsObj));
        bluetoothle.read(readSuccess, readError, paramsObj);
        return false;
    }

    function updateProgress(percent) {
        percent = Math.floor(percent);
        var bar = $('div.progress-bar');
        bar.text(percent + '%');
        bar.css('width', percent.toString() + "%");
    }

    function irTemperatureHandler(index, data) {
        var ambient,
            ambient1 = data[1],
            ambient2 = data[0];

        if (ambient1 === 253 && ambient2 === 255) {
            // marker for beginning of RAM section: NOT the first data 
            bleData.SaveValues(index, -500);
            return;
        }
        if (ambient1 === 254 && ambient2 === 255) {
            // marker for first/last data in RAM section 
            bleData.SaveValues(index, -501);
            return;
        }
        if (ambient1 === 255 && ambient2 === 255) {
            // uninitialised memory??? should not get here. **** To Do : find out why
            return;
        }
        if (ambient1 === 0 && ambient2 === 0) {
            // new RAM not yet filled
            bleData.SaveValues(index, -273);
            return;
        }
        if (ambient1 < 0) { ambient1 += 256; }
        if (ambient2 < 0) { ambient2 += 256; }

        // see datasheet TMP006
        // first get ambient temp
        ambient = ambient1 * 256 + ambient2;

        if (ambient >= 32768) {

            ambient -= 65536;
        }
        ambient = ambient / 128;
        ambient = Math.floor(ambient * 10) / 10;

        // now upload new values
        bleData.SaveValues(index, ambient);
    }

    function tempStoreHandler(index, data) {

        // each 'reading' is a 16 bit value within an array of bytes
        for (var reading = 2; reading < data.length; reading += 2) {
            var thisdata = data.subarray(reading, reading + 2);
            irTemperatureHandler(index, thisdata);
        }
    }

    function subscribeSuccess(obj) {
        if (obj.status === "subscribedResult") {
            // bleTime.log("Subscribed Result");
            var bytes = bluetoothle.encodedStringToBytes(obj.value);
            var counter = bytes[0] * 256;
            counter += bytes[1];
            var result = counter.toString() + ":";

            if (blocksToGet === -1) {
                // this is the first block
                blocksToGet = counter;
            }
            for (var index = 2; index < bytes.length; index++)
            { result += ' '; result += bytes[index]; };

            //if (counter < 16 || (counter % 10) == 0) {
            //    bleTime.log("Subscribed Result: " + result);
            //}
            if (counter < 10 || (counter % 5) == 0) {
                //bleTag.displayStatus("downloading... " + counter)
                updateProgress((blocksToGet - counter) * 100 / blocksToGet);
            }
            tempStoreHandler(counter, bytes);
            if (counter < 3 & subscribing == true) {
                // we have all the data. ****** todo: make  a proper EOF marker in data
                subscribing = false;
                updateProgress(100);
                //tagConnect.disconnect(obj.address);

                var sensor = bleSensors.findSensor(obj.address);
                if (sensor !== null) {
                    //var sensor = bleSensors.findSensor(obj.address);
                    //if (sensor === null) {
                    //    sensor = new bleSensors.Sensor(obj.address, obj.name);
                    //}
                    bleData.ApplyTimestamps(sensor);
                    bleData.DisplayNewChart(sensor);
                    bleSensors.DisplaySensor(sensor, true);
                    $('#statusConnect').hide();
                    $("#progress-bar").hide();

                    // now offer full download and/or upload data to web
                    // Find the 'connect' list group item to update and put in two new buttons instead
                    var item = sensor.ShortSerial;
                    var name = sensor.Name;
                    if (name == 'SensorTag' || name == 'CJFBleTag') {
                        // undefined name, use serial number instead
                        name = sensor.Serial;
                    }
                    //<!--<div id="getall-upload">
                    //    <button id="getall-button" type="button" class="btn btn-info"><span class="glyphicon glyphicon-download"></span> Get all data</button>
                    //    <button id="upload-button" type="button" class="btn btn-info pull-right" data-loading-text="Uploading..."><span class="glyphicon glyphicon-cloud"></span> Upload data</button>
                    //</div>-->
                    var htmlstr = name + '<button id="get' + item + '" type="button" class="btn btn-lifted btn-info btn-sm pull-right">Full download</button>';
                    var oldhtml = $('#' + item).html();

                    if (oldhtml.indexOf('Full download') > 0) {
                        // show it has been downloaded / no need to download again
                        $('#' + item).prop("disabled", true);
                        $('#' + item).unbind();
                    }
                    else {
                        $('#' + item).html(htmlstr);
                        $('#' + item).unbind();
                        var serial = bleSensors.fullSerial(item);
                        $('#get' + item).on('click', function () {
                            tagConnect.setTask(TEMPSTORE_READ_ALL);
                            tagConnect.subscribeTempStore(obj.address);
                        });
                    }

                    //$('#up' + item).on('click', function () { bleData.Upload(item) });
                    $('#scanlist').show();
                    $("#upload-all").show();
                    //myConfirm("Sensor read successful; upload data to web?", bleData.Upload(), null);
                }
            }
            var dev = findDevice(obj.address);
            if (dev != null)
                // prevent 'too long connected' alert if just downloaded
                dev.ConnectionTime = 0;
        }
        else if (obj.status == "subscribed") {
            displayStatus("Subscribed");
            bleTime.log("Subscribed");
            subscribing = true;
            blocksToGet = -1;
            $("#progress-bar").show();
            $("#upload-all").hide();
            $('#statusConnect').hide();
            // now we can get some data as soon as possible
            if (obj.characteristicUuid == TEMPSTORE_DATA) {
                switch (currentTask) {
                    case TEMPSTORE_READ_ALL:
                        requestAllData(obj.address);
                        break;
                    case TEMPSTORE_READ_RAM:
                        requestRAMData(obj.address);
                        break;
                    default: bleTime.log("Subscribed, but no task defined");
                }
            }
        }
        else {
            logError("Unexpected Subscribe Status",obj);
        }
    }

    function subscribeError(obj) {
        displayStatus("Subscribe Error: " + obj.message);
        logError("Subscribe Error",obj);
        subscribing = false;
        //tagConnect.disconnect(obj.address);
    }

    function subscribe(address, serviceUuid, characteristicUuid) {
        var paramsObj = { address: address, serviceUuid: serviceUuid, characteristicUuid: characteristicUuid };
        bleTime.log("Subscribe : " + JSON.stringify(paramsObj));
        bluetoothle.subscribe(subscribeSuccess, subscribeError, paramsObj);
        // don't allow other devices to conenct at the same time
        $('#scanlist').hide();
        return false;
    }

    function writeSuccess(obj) {
        bleTime.log("Write Success : " + JSON.stringify(obj));

        if (obj.status == "written") {
            bleTime.log("Written");
        }
        else {
            logError("Unexpected Write Status",obj);
        }
    }

    function writeError(obj) {
        logError("Write Error",obj);
    }

    function  write(address, serviceUuid, characteristicUuid, val) {
        var bytes = new Uint8Array(1);
        bytes[0] = val;
        var value = bluetoothle.bytesToEncodedString(bytes);
        var paramsObj = { address: address, serviceUuid: serviceUuid, characteristicUuid: characteristicUuid, value: value };
        bleTime.log("Write : " + JSON.stringify(paramsObj));
        bluetoothle.write(writeSuccess, writeError, paramsObj);
        return false;
    }

    // configure the tempstore service to start a download of data
    // todo: use 'value' to request different parts of data downlaod????
    function requestRAMData(address) {
        write(address, TEMPSTORE_SERVICE, TEMPSTORE_CONFIG, TEMPSTORE_READ_RAM);
    }
    function requestAllData(address) {
        write(address, TEMPSTORE_SERVICE, TEMPSTORE_CONFIG, TEMPSTORE_READ_ALL);
    }
    function closeAll() {
        tagConnect.disconnectAll();
        while (bleSensors.FoundSensors().length > 0) {
            bleSensors.FoundSensors().pop();
        }
        while (services.length > 0) {
            services.pop();
        }
    }
////////////////////////////////////
/////////////////// global functions
////////////////////////////////////

    tagConnect.initialize = function () {
        var paramsObj = { request: true };
        bleTime.log("Initialize : " + JSON.stringify(paramsObj));
        bluetoothle.initialize(initializeSuccess, initializeError, paramsObj);
        return false;
    };

    tagConnect.scan = function () {

        bleData.ClearData('');
        bleSensors.ClearFoundSensors();
        if (scanning) {
            stopScan();
        }
        else {
            closeAll();
            startScan();
            var scanTimer = setTimeout(function () {
                stopScan();
            }, 20000);
        }
    }
    tagConnect.connect = function (address) {
        //// dealing with a new device so prepare for a new serial number
        //tagConnect.clearID();
        var paramsObj, dev = findDevice(address);
        if (dev.ConnectionTime >= 0) {
            bleTime.log("already connected? " + dev.ConnectionTime + " secs");
            //currentConnection = dev;
            discover(address);
            return false;
        }
        paramsObj = { address: address };
        bleTime.log("Connect : " + JSON.stringify(paramsObj));
        bluetoothle.connect(connectSuccess, connectError, paramsObj);
        connectTimer = setTimeout(function () {
            logError("Not connected, timed out",paramsObj);
            tagConnect.disconnect(address);
        }, 20000);
        return false;
    };

    tagConnect.readTemperatures = function (address) {
        read(address, IRTEMPERATURE_SERVICE, IRTEMPERATURE_DATA);
    }
    tagConnect.readTempStore = function (address) {
        read(address, TEMPSTORE_SERVICE, TEMPSTORE_DATA);
    }
    tagConnect.subscribeTemperatures = function (address) {
        subscribe(address, IRTEMPERATURE_SERVICE, IRTEMPERATURE_DATA);
    }
    tagConnect.subscribeTempStore = function (address) {
        bleData.ClearData(address);
        subscribe(address, TEMPSTORE_SERVICE, TEMPSTORE_DATA);
    }

    tagConnect.setTask = function (task) { currentTask = task; };

    tagConnect.rssi = function (address) {
        var paramsObj = { address: address };
        bleTime.log("RSSI : " + JSON.stringify(paramsObj));
        bluetoothle.rssi(rssiSuccess, rssiError, paramsObj);
        return false;
    };

    tagConnect.isConnected = function (address) {
        var paramsObj = { address: address };
        //bleTime.log("Is Connected : " + JSON.stringify(paramsObj));
        bluetoothle.isConnected(isConnectedSuccess, paramsObj);
        return false;
    };
    tagConnect.changePeriod = function (address, seconds) {
        // within logger, period is measured in units of 10 ms
        write(address, IRTEMPERATURE_SERVICE, IRTEMPERATURE_PERIOD, seconds * 100);
    }
    tagConnect.changeAlarms = function (address, alarmvals) {
        // high and low alarms, two bytes each
        write(address, IRTEMPERATURE_SERVICE, IRTEMPERATURE_ALARMS, alarmvals);
    }

    tagConnect.updateConnections = function (seconds) {
        for (var index in bleSensors.FoundSensors()) {
            var device = bleSensors.FoundSensors()[index];
            device.ConnectionTime += seconds;
            // check if still connected; if not this will reset ConnectionTime
            tagConnect.isConnected(device.Serial);
        }

    }

    tagConnect.disconnect = function (address) {
        if (bleApp.isMobile()) {
            var paramsObj = { address: address };
            bleTime.log("Disconnect : " + JSON.stringify(paramsObj));
            bluetoothle.disconnect(disconnectSuccess, disconnectError, paramsObj);
        }
        return false;
    };

    tagConnect.close = function (address) {
        var paramsObj = { address: address };
        bleTime.log("Close : " + JSON.stringify(paramsObj));
        bluetoothle.close(closeSuccess, closeError, paramsObj);
        return false;
    };

    tagConnect.disconnectAll = function () {
        // devices.forEach(function (device) {
        bleSensors.FoundSensors().forEach(function (device) {
            tagConnect.disconnect(device.Serial);
        });
    };


    //tagConnect.reconnect = function (address) {
    //    tagConnect.clearID();
    //    var paramsObj = { address: address };
    //    console.log("Reconnect : " + JSON.stringify(paramsObj));
    //    bluetoothle.reconnect(tagConnect.reconnectSuccess, tagConnect.reconnectError, paramsObj);
    //    return false;
    //}

    //tagConnect.reconnectSuccess = function (obj) {
    //    console.log("Reconnect Success : " + JSON.stringify(obj));
    //    if (obj.status == "connected") {
    //        console.log("ReConnected");
    //        currentConnection = obj.address;
    //        switch (currentTask) {
    //            case tagConnect.TEMPSTORE_READ_ALL:
    //                tagConnect.subscribeTempStore(currentConnection);
    //                break;
    //        }
    //    }
    //    else if (obj.status == "connecting") {
    //        console.log("ReConnecting");

    //    }
    //    else {
    //        console.log("Unexpected Reconnect Status");
    //    }
    //}

    //tagConnect.reconnectError = function (obj) {
    //    console.log("Reconnect Error : " + JSON.stringify(obj));
    //    if (obj.error.indexOf("isNotDisconnected") == 0) {
    //        switch (currentTask) {
    //            case tagConnect.TEMPSTORE_READ_ALL:
    //                tagConnect.subscribeTempStore(currentConnection);
    //                break;
    //        }
    //    }
    //}

        return tagConnect
})(jQuery)

