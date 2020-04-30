var socket = io()
//var positionHng = document.getElementById("position-hng");
var output = document.querySelector('.output');
var arr = document.getElementById("arrow");

var minDist = 0.006;
var coordinates = [];
var coordinateIndex = 0;

var bearing = 0;
var currLat = 0;
var currLong = 0;
var map;
var marker;
var heartOverlay;
var polyLine;
var groupMarkers = [];
var sessionID;
var firstAlert = false;
var cookieID;
var bestAccuracy = 100;
var firstLocation = true;
var hasSensorAccess = false;
var compassOrientation = 0;


var testMarker;

//TO-DO - add compass arrow to graphic (or to map) (make map little square?)
//

// $("#compassInfo").html("hasSensorAccess: ", hasSensorAccess);

function setCookie(c_name, value, exdays) {
  var exdate = new Date();
  exdate.setDate(exdate.getDate() + exdays);
  var c_value = escape(value) + ((exdays == null) ? "" : "; expires=" + exdate.toUTCString());
  document.cookie = c_name + "=" + c_value;
}

function getCookie(c_name) {
    var i, x, y;
    var ARRcookies = document.cookie.split(";");
    for (i = 0; i < ARRcookies.length; i++) {
        x = ARRcookies[i].substr(0, ARRcookies[i].indexOf("="));
        y = ARRcookies[i].substr(ARRcookies[i].indexOf("=") + 1);
        x = x.replace(/^\s+|\s+$/g, "");
        if (x == c_name) {
            return unescape(y);
        }
    }
}

//Geolocation stuff
var browserGeolocationSuccess = function(position) {

   // if(!firstAlert){
   //   firstAlert = true
   //   alert("Ok great! Let's try to make a heart. ")
   // }
   if(position.coords.accuracy < bestAccuracy){
     bestAccuracy = position.coords.accuracy;
     console.log("bestAccuracy: " + bestAccuracy);

   }


   // if we have a high accuracy reading
   if(position.coords.accuracy < bestAccuracy + 10){
     // alert("Browser geolocation success!\n\nlat = " + position.coords.latitude + "\nlng = " + position.coords.longitude);
     var myLatLng = {lat: position.coords.latitude, lng: position.coords.longitude, seqentialID: cookieID};
     // if(firstLocation){
     //   // map.panTo(myLatLng)
     //   firstLocation = false;
     // }

     if(firstLocation){
       // map.panTo(myLatLng)
       firstLocation = false;
       var image = {
                // url: "/images/compass_dot_marker.png",
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 4
                // size: new google.maps.Size(60,60),
                // origin: new google.maps.Point(0,0),
                // anchor: new google.maps.Point(30,30),
                // rotation: compassOrientation
        }
       // map.setHeading(180)

       var lat = position.coords.latitude
       var lng = position.coords.longitude

       testMarker = new google.maps.Marker({
             position: {lat:lat,lng:lng},
             title: 'Position of ' + this.id,
             icon:image
       });

       testMarker.setMap(map);
       firstLocation = false;

     }

     console.log("accurate coordinates: " + JSON.stringify(myLatLng) )
     socket.emit("update-coordinates", myLatLng)
   }
};

//Process errors for geoloc
var browserGeolocationFail = function(error) {
  switch (error.code) {
    case error.TIMEOUT:
      alert("Browser geolocation error !\n\nTimeout." + error.message);
      break;
    case error.PERMISSION_DENIED:
      alert("Permission Denied" + error.message);
      break;
    case error.POSITION_UNAVAILABLE:
      alert("Browser geolocation error !\n\nPosition unavailable" + error.message);
      break;
  }
};


//Get location of device  - navigator is just an html5 access for the browser
function tryGeolocation() {
  if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
      browserGeolocationSuccess,
      browserGeolocationFail, { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000});
    //  {maximumAge: 0, timeout: 5000, enableHighAccuracy: false});
  }
}

function askForLocation(){
    if(confirm("This website requires access to your GPS location. Press OK and you'll receive a request to access your location.")) {
        tryGeolocation()
    }
}

function placeMarker(location) {
    var marker = new google.maps.Marker({
        position: location,
        map: map
    });
}

socket.on("receive-id",function(id){
  setCookie("id", id, 1)
  console.log("setting id cookie to : " + id);
  cookieID = id;

})

socket.on('connect', function() {
    socket.emit('new-client', 'mobile')
    sessionID = socket.id;
    console.log('check 2', socket.connected);
})

socket.on("receive-group-coordinates", function(groupCoords){
  //This can be done without making makers flicker

  // Clear Old Markers:
  // for (var i=0; i < groupMarkers.length; i ++){
  //   groupMarkers[i].setMap(null);
  // }
  //
  // //Draw Markers:
  // for( var i=0; i < groupCoords.length; i ++){
  //
  //     var image;
  //
  //     if(groupCoords[i].id === sessionID){
  //       image = {
  //           // url: "/images/compass_dot_marker.png",
  //           path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
  //           scale: 4
  //           // size: new google.maps.Size(60,60),
  //           // origin: new google.maps.Point(0,0),
  //           // anchor: new google.maps.Point(30,30),
  //           // rotation: compassOrientation
  //       }
  //     }else{
  //     //update coordinates of marker
  //       image = {
  //         url: "/images/dot_marker_gray.png",
  //         size: new google.maps.Size(60,60),
  //         origin: new google.maps.Point(0,0),
  //         anchor: new google.maps.Point(30,30)
  //      }
  //     }
  //
  //     console.log("received coords: " + groupCoords)
  //     var lat = groupCoords[i].lat
  //     var lng = groupCoords[i].lng
  //
  //     groupMarkers[i] = new google.maps.Marker({
  //       position: {lat:lat,lng:lng},
  //       title: 'Position of ' + this.id,
  //       icon:image
  //     });
  //
  //     groupMarkers[i].setMap(map)
  //
  // }
  //
  // //Draw line
  // var path = polyLine.getPath();
  // path.clear()
  //
  // //Draw users current position
  // // var currll =  new google.maps.LatLng(currLat, currLong);
  // // path.push(currll);
  // //Add positions of other people
  // for(var i=0; i<groupCoords.length; i ++){
  //    var ll =  new google.maps.LatLng(groupCoords[i].lat,groupCoords[i].lng);
  //    // console.log("adding new coordinate");
  //    path.push(ll);
  // }
  //
  // //close shape by bringing it back to the first person
  // if(groupCoords.length > 1){
  //   var ll =  new google.maps.LatLng(groupCoords[0].lat,groupCoords[0].lng);
  //   path.push(ll);
  // }
  // //Close line by bringing it back to current position
  // // path.push(currll);
  // //every time this is updated re-draw the polyline from scratch
})

if( typeof( DeviceOrientationEvent ) !== "undefined" && typeof( DeviceOrientationEvent.requestPermission ) === "function" ) {
    if(window.confirm("We need sensor access, please say yes")){
      requestSensorAccess()
    }
}else{
    window.addEventListener('deviceorientation', (event) => {
      hasSensorAccess = true;
      var data = "";
      if ("webkitCompassHeading" in event){
         data = {
          info: "No permissions: received from deviceorientation webkitCompassHeading - iOS Safari,  Chrome, Firefox",
          z: 360-event.webkitCompassHeading //360 -
        }
      // Android - Chrome <50
      }else if (event.absolute){
        data = {
          info: "No permissions: received from deviceorientation with absolute=true & alpha val",
          z: event.alpha
        }
      }else{
         data = {
          info: "No permissions: absolute=false, heading might not be absolute to magnetic north",
          z: event.alpha
        }
      }
      // console.log(data);
      $("#compassInfo").html(data.info + ": " + data.z + ". Has sensor access: " + hasSensorAccess );
  })
}

var hasSensorAccess = false;
// $("#compassInfo").html("hasSensorAccess: ", hasSensorAccess);

function requestSensorAccess(){
  if( typeof( DeviceOrientationEvent ) !== "undefined" && typeof( DeviceOrientationEvent.requestPermission ) === "function" ) {

    DeviceOrientationEvent.requestPermission()
        .then(response => {
            if (response == 'granted') {

                hasSensorAccess = true;
                window.addEventListener('deviceorientation', (event) => {
                  //iOS
                  var data = "";
                  if ("webkitCompassHeading" in event){
                     data = {
                      info: "Permission Granted: received from deviceorientation webkitCompassHeading - iOS Safari,  Chrome, Firefox",
                      z: 360-event.webkitCompassHeading //360 -
                    }
                  // Android - Chrome <50
                  }else if (event.absolute){
                    data = {
                      info: "Permission Granted:  received from deviceorientation with absolute=true & alpha val",
                      z: event.alpha
                    }
                  }else{
                     data = {
                      info: "Permission Granted:  absolute=false, heading might not be absolute to magnetic north",
                      z: event.alpha
                    }
                  }
                  // $("#compassInfo").html(data.info + ": " + data.z + ". Has sensor access: " + hasSensorAccess );
                  // $("#compassInfo").html(data);
                  compassOrientation = data.z;

                  // if(groupMarkers[0] != undefined){

                  if(testMarker != null){
                    testMarker.setIcon({
                          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                          scale: 4,
                          rotation: compassOrientation
                    });
                  }

                })
            }
        })
    .catch(function(err){
      $("#errorInfo").html("Cannot get permission" , err.toString());
    })
  }else{
    $("#errorInfo").html("DeviceOrientationEvent.requestPermission is not a function");
  }
}


if( typeof( DeviceOrientationEvent ) !== "undefined" && typeof( DeviceOrientationEvent.requestPermission ) === "function" ) {
    if(window.confirm("We need sensor access, please say yes")){
      requestSensorAccess()
    }
}else{
    window.addEventListener('deviceorientation', (event) => {
      hasSensorAccess = true;
      var data = "";
      if ("webkitCompassHeading" in event){
         data = {
          info: "No permissions: received from deviceorientation webkitCompassHeading - iOS Safari,  Chrome, Firefox",
          z: 360-event.webkitCompassHeading //360 -
        }
      // Android - Chrome <50
      }else if (event.absolute){
        data = {
          info: "No permissions: received from deviceorientation with absolute=true & alpha val",
          z: event.alpha
        }
      }else{
         data = {
          info: "No permissions: absolute=false, heading might not be absolute to magnetic north",
          z: event.alpha
        }
      }
      // console.log(data);
      // $("#compassInfo").html(data.info + ": " + data.z + ". Has sensor access: " + hasSensorAccess );
      // console.log(data);
      compassOrientation = data.z;

      if(testMarker != null){
        testMarker.setIcon({
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 4,
              rotation: compassOrientation
        });
      }

  })

}


//Function called by async script call at bottom of index.html
function initMap() {
  var myLatLng = {lat: -25.363, lng: 131.044};
   map = new google.maps.Map(document.getElementById('map'), {
     zoom: 13,
     center: {lat: 45.536384, lng: -73.628949},
     disableDefaultUI: true,
     styles:[
            {
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#f5f5f5"
                }
              ]
            },
            {
              "elementType": "labels",
              "stylers": [
                {
                  "visibility": "off"
                }
              ]
            },
            {
              "elementType": "labels.icon",
              "stylers": [
                {
                  "visibility": "off"
                }
              ]
            },
            {
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#616161"
                }
              ]
            },
            {
              "elementType": "labels.text.stroke",
              "stylers": [
                {
                  "color": "#f5f5f5"
                }
              ]
            },
            {
              "featureType": "administrative.land_parcel",
              "stylers": [
                {
                  "visibility": "off"
                }
              ]
            },
            {
              "featureType": "administrative.land_parcel",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#bdbdbd"
                }
              ]
            },
            {
              "featureType": "administrative.neighborhood",
              "stylers": [
                {
                  "visibility": "off"
                }
              ]
            },
            {
              "featureType": "poi",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#eeeeee"
                }
              ]
            },
            {
              "featureType": "poi",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#757575"
                }
              ]
            },
            {
              "featureType": "poi.park",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#e5e5e5"
                }
              ]
            },
            {
              "featureType": "poi.park",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#9e9e9e"
                }
              ]
            },
            {
              "featureType": "road",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#ffffff"
                }
              ]
            },
            {
              "featureType": "road.arterial",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#757575"
                }
              ]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#dadada"
                }
              ]
            },
            {
              "featureType": "road.highway",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#616161"
                }
              ]
            },
            {
              "featureType": "road.local",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#9e9e9e"
                }
              ]
            },
            {
              "featureType": "transit.line",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#e5e5e5"
                }
              ]
            },
            {
              "featureType": "transit.station",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#eeeeee"
                }
              ]
            },
            {
              "featureType": "water",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#c9c9c9"
                }
              ]
            },
            {
              "featureType": "water",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#9e9e9e"
                }
              ]
            }
          ]
  });

  polyLine = new google.maps.Polyline({
    strokeColor:'#f70000',
    strokeOpacity: 1.0,
    strokeWeight: 5
  });

  polyLine.setMap(map);


    var imageBounds = {
      north:45.536384,
      south:45.535557,
      west: -73.629249,
      east: -73.628002
    }

    // heartOverlay = new google.maps.GroundOverlay('/images/red_heart.png',imageBounds);
    // heartOverlay.setMap(map);


    // map.addListener('click', addLatLng);

    var id = getCookie("id");
    if(id != null){
      console.log("has id: " + id);
      cookieID = id;
    }else{
      console.log("has no id : " + id);
      socket.emit('request-id');
    }
    askForLocation();

  }




// socket.emit('reset-sequence')
