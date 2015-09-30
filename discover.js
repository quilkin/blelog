
var tagConnect = (function ($) {
    "use strict";

    var tagConnect = {},
        services = [];



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
            logError("Unexpected Discover Status", obj);
        }
    }
    function discoverError(obj) {
        logError("Discover Error", obj);
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

    function Service(addr, serviceuuid) {
        this.address = addr;
        this.serviceUuid = serviceuuid;
        this.characteristics = [];

    }

    function addService(address, serviceUuid) {
        //var check = devices.indexOf(address);
        if (findDevice(address) === null) {
            logError("device not found", address); return;
        }

        var service, svcs = $.grep(services, function (e) {
            return (serviceUuid === e.serviceUuid);
        });

        if (svcs.length > 0) {
            logError("Service already found", serviceUuid);
            return;
        }
        service = new Service(address, serviceUuid);
        services.push(service);
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
            logError("Unexpected Services Status", obj);
        }
    }

    function servicesError(obj) {
        logError("Services Error", obj);
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


    function addCharacteristic(address, serviceUuid, characteristic) {

        var svcs = $.grep(services, function (e) {
            return (serviceUuid === e.serviceUuid);
        });

        if (svcs.length === 1) {
            svcs[0].characteristics = characteristic;
        }
        else {
            logError("addCharacteristic: multiple or undefined service", serviceUuid);
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
            logError("Unexpected Services Status", obj);
        }
    }

    function characteristicsError(obj) {
        logError("Characteristics Error", obj);
    }

    return tagConnect
})(jQuery)