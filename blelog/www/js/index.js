
/*global device,screen,FastClick,bleTime*/

(function () {
    "use strict";

    function onPause() {
        // TODO: This application has been suspended. Save application state here.
    }

    function onResume() {
        // TODO: This application has been reactivated. Restore application state here.
    }
    function onDeviceReady() {
        // Handle the Cordova pause and resume events
        document.addEventListener('pause', onPause.bind(this), false);
        document.addEventListener('resume', onResume.bind(this), false);
        window.addEventListener('load', function () { FastClick.attach(document.body); }, false);

        bleTime.log(device.platform + ": " + device.model);
        bleApp.setMobile(true);
        // needs doing again
        //bleApp.detectScreenHeight();
        // don't always need login for mobile use (login may not be possible when downloading devices)
        $('#loginModal').modal('hide');
        // go straight to connection page
        $(".navbar-nav a[href=#home]").tab('show');
        tagConnect.initialize();
        bleApp.SetPlatform(device.platform);
    }

    document.addEventListener( 'deviceready', onDeviceReady.bind( this ), false );
    

    $(document).ready(function () {
        $(".navbar-nav li a").click(function (event) {
            $(".navbar-collapse").collapse('hide');
        });
        bleApp.init();
        //bleApp.detectScreenHeight();

        // add some handlers
        $("#form-signin").on("show", login.Login());
        //$("#upload-button").on('click', function () {
        //    var $btn = $(this).button('loading');
        //    window.setTimeout(function () { bleData.Upload($btn); }, 100);
        //});

        $("#scanTitle").click(tagConnect.scan);
        //$("#getall-button").click(bleTag.ReadAll);
        //$("#upload-button").click(function () { bleData.Upload(0); });
        //$("#testUpload").click(function () { bleData.testUpload(0); });
        $("#tableName").click(bleData.DisplayValues);

        //$("#dateTitle").click(bleData.ChooseDates);
        $('#findTitle').click(bleSensors.CreateSensorList);
        $('#showSelected').click(bleData.showData);
        $('#statusConnect').click(function () { $('#scanlist').show(); });
        // hide these elements until they are needed
        $("#progress-bar").hide();
        $("#upload-all").hide();
        $('#statusConnect').hide();
        $('#fromDate').hide();
        $('#toDate').hide();
       // $('#register').hide();
        //$('#code').hide();
        $('#loading').hide();
        //tagConnect.testarray();
        //$('#testbutton').on('click', function () {
        //    var text = this.id;
        //    text = text + 'OK';
        //})

        var today = new Date(),
            yesterday;
        // round down to beginning of day
        today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        yesterday = bleTime.addDays(today, -1);
        bleData.setDates(yesterday,today);
        bleData.setDateChooser('Change');
        
        $(".detectChange").change(function () {
            $("#saveChanges").prop("disabled", false);
        });

        $(document).ajaxStart(function() {
            $('<div class="loader" id="loading"><img id="loading-image" src="images/page-loader.gif" alt="waiting..." /></div>')
        .prependTo('body');
        });

        $(document).ajaxStop(function()  {
           // $('.loader').hide();
            $('.loader').remove();
        });

        if (bleApp.isMobile()===false)
        {
            // always need to login, cannot download devices from non-mobile
            $('#loginModal').modal();
            // switch straight to webdata tab
            $(".navbar-nav a[href=#webdata]").tab('show');

        }
    });

    $('#scanlist').on('click', function (e) {
        var previous = $(this).closest(".list-group").children(".active");
        previous.removeClass('active'); // previous list-item
        $(e.target).addClass('active'); // activated list-item
    });

})();

var bleApp = (function () {
    "use strict";
    var bleApp = {},
    ismobile,
    platform,
    interval = 60;  // seconds

    function updateTime() {
        var d = new Date();
        if ((d.getSeconds()) < interval) {
            var timetext = d.toDateString() + ' ' + bleTime.timeString(d);
            $("#realtime").html('BLE Log <span style="color:black; font-size:small">' + timetext + ' ' + platform + '</span>');
        }
        if (ismobile) {
            // every few seconds, update connected status of devices
            tagConnect.updateConnections(interval);
        }
    }

    return {
        init: function () {
            ismobile = false;
            updateTime();
            interval = 5;
            window.setInterval(function () {
                updateTime();
            }, interval * 1000);
            $.ajaxSetup({ cache: false });
        },
        setPlatform: function (x) { platform = x; },
        getPlatform: function () {
            return (platform === undefined ? '' : platform);
        },
        isMobile: function () { return ismobile; },
        setMobile: function (x) { ismobile = x; },
        tableHeight: function () {
            var tableHeight, screenHeight;
            //bleApp.detectScreenHeight = function () {
            if (ismobile) {
                screenHeight = $(window).height();
                tableHeight = screenHeight - 175;
                //screenWidth = $(window).width();
                //    this.screenWidth = screen.availWidth;
            }
            else {
                screenHeight = $(window).height();
                tableHeight = screenHeight - 175;
                //screenWidth = $(window).width();
                //    this.tableHeight = window.innerHeight - 175;
                //    this.screenHeight = window.innerHeight;
                //    this.screenWidth = window.innerWidth;
            }
            return tableHeight; 
        }
    };

}());


