//Compass
//setup sensor listeners
function setupSensorListeners() {
  window.addEventListener("deviceorientation", event => {
    hasSensorAccess = true;
    var data = "";
    if ("webkitCompassHeading" in event) {
      data = {
        info: "Received from deviceorientation webkitCompassHeading - iOS Safari,  Chrome, Firefox",
        z: event.webkitCompassHeading
      };
      // Android - Chrome <50
    } else if (event.absolute) {
      data = {
        info: "Received from deviceorientation with absolute=true & alpha val",
        z: event.alpha
      };
    } else {
      data = {
        info: "absolute=false, heading might not be absolute to magnetic north",
        z: 360 - event.alpha
      };
    }
    updateHomeMarkerRotation(data);
  });
  // alert("Can't access compass! You can enable permission at Settings -> Safari -> Motion & Orientation Access.")
}

function requestDeviceOrientation() {
  //Check if we need to request access to sensors
  if (typeof(DeviceOrientationEvent) !== "undefined" && typeof(DeviceOrientationEvent.requestPermission) === "function") {
    //instruction to tap the 'active sensors button'

    DeviceOrientationEvent.requestPermission()
      .then(response => {
        console.log("DeviceOrientationEvent response:", response);
        if (response == "granted") {
          setupSensorListeners();
          $("#activateSensors").html("Sensors On");
        }
      })
      .catch(function(err) {
        createDialogue("Please tap the 'Activate Sensors' button in the top right corner to set up the compass.")
        console.log("DeviceOrientationEvent error:", err);
        $("#errorInfo").html("Cannot get permission", err.toString());
      });
  } else {
    setupSensorListeners();
    $("#activateSensors").html("Sensors On");
  }
}

//GPS
//Geolocation success callback
var browserGeolocationSuccess = function(position) {
  // $("#activateGPS").html("GPS On");
  if (position.coords.accuracy < bestAccuracy) {
    bestAccuracy = position.coords.accuracy;
    console.log("bestAccuracy: " + bestAccuracy);
  }
  // if we have a high accuracy reading
  // if using simulated position the accuracy will be fixed at 150
  if (position.coords.accuracy < bestAccuracy + 10) { //|| position.coords.accuracy === 150
    currLatLng = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      heading: compassOrientation,
      connectTimestamp: firstConnectTimestamp
      // done: drawDone
    };
    updateHomeMarkerPosition(position);
    // console.log("accurate coordinates: " + JSON.stringify(myLatLng))
    if(firstConnectTimestamp != null){
      socket.emit("update-coordinates", currLatLng);
    }
    // toggleGPSButton();
  }
};

//Geolocation fail callback
var browserGeolocationFail = function(error) {
  switch (error.code) {
    case error.TIMEOUT:
      alert("Browser geolocation error !\n\nTimeout." + error.message);
      break;
    case error.PERMISSION_DENIED:
      // alert("Permission Denied" + error.message);
      alert(
        "No location access - please enable access in Settings -> Privacy -> Location Services -> Safari Websites. Change from 'Never' to 'While Using the App' "
      );
      break;
    case error.POSITION_UNAVAILABLE:
      alert(
        "Browser geolocation error !\n\nPosition unavailable" + error.message
      );
      break;
  }
};

//Get location of device
//Multiple things to test here to make sure we always get GPS updates
function tryGeolocation() {
  if (navigator.geolocation) {

    // if (watchPositionId != null) {
    //   navigator.geolocation.clearWatch(watchPositionId);
    //   console.log("clearing watchPosition: ", watchPositionId);
    // } else {
    //   for (var i = 0; i < 100; i++) {
    //     var w = navigator.geolocation.clearWatch(i);
    //     console.log("clearing watchPositions ", i, w);
    //   }
    // }

    //This seems to be pretty reliable.
    watchPositionId = navigator.geolocation.watchPosition(function() {}, function() {}, {});
    navigator.geolocation.clearWatch(watchPositionId);

    watchPositionId = navigator.geolocation.watchPosition(
      browserGeolocationSuccess,
      browserGeolocationFail, {
        enableHighAccuracy: true,
        timeout: 10000, //means it has 10 seconds to get a location
        maximumAge: 10000 //maximum age might be why batteries were going so low - because it forces the phone to get a new position each time?
      }
    );
  }
}
