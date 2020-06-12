var socket = io()
//var positionHng = document.getElementById("position-hng");
var output = document.querySelector('.output');
var arr = document.getElementById("arrow");

var minDist = 0.006;
var coordinates = [];
var coordinateIndex = 0;

var bearing = 0;
var currLatLng;

var map;
var marker;
var heartOverlay;
var polyLine;
var groupMarkers = [];
var groupPolyLines = [];
var homeMarkerID;

var sessionID;
var firstAlert = false;
var cookieID;
var bestAccuracy = 1000;
var firstLocation = true;
var hasSensorAccess = false;
var compassOrientation = 0;

var markerArray = [];
var guideLine;
var testMarker;
var hasSensorAccess = false;
var lastMarkerLength = 0;
var lastCompassOrientation = 0;
var homeMarker;

var showArrows = true;


function togArrows() {

  showArrows = !showArrows;

  if (!showArrows) {
    $("#toggleArrows").html("Arrows On")
    for (var i = 0; i < groupMarkers.length; i++) {
      groupMarkers[i].setMap(null);
    }

  } else {
    $("#toggleArrows").html("Arrows Off")
    if (map != null) {
      for (var i = 0; i < groupMarkers.length; i++) {
        groupMarkers[i].setMap(map);
      }
    }
  }

}

//Called from centerMap button
function center() {
  map.panTo(new google.maps.LatLng(currLatLng.lat, currLatLng.lng));
}

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

  if (position.coords.accuracy < bestAccuracy) {
    bestAccuracy = position.coords.accuracy;
    console.log("bestAccuracy: " + bestAccuracy);
  }

  // if we have a high accuracy reading
  if (position.coords.accuracy < bestAccuracy + 10 || position.coords.accuracy === 150) {
    currLatLng = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      seqentialID: cookieID,
      heading: compassOrientation
    };

    updateHomeMarkerPosition(position);

    // console.log("accurate coordinates: " + JSON.stringify(myLatLng))
    socket.emit("update-coordinates", currLatLng)
  }
};

//Process errors for geoloc
var browserGeolocationFail = function(error) {
  switch (error.code) {
    case error.TIMEOUT:
      alert("Browser geolocation error !\n\nTimeout." + error.message);
      break;
    case error.PERMISSION_DENIED:
      // alert("Permission Denied" + error.message);
      alert("No location access - you might need to enable this in Settings -> Privacy -> Location Services -> Safari Websites. Change from 'Never' to 'While Usingthe App'")
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
      browserGeolocationFail, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      });
    //  {maximumAge: 0, timeout: 5000, enableHighAccuracy: false});
  }
}

function askForLocation() {
  if (confirm("This website requires access to your GPS location. Press OK and you'll receive a request to access your location.")) {
    tryGeolocation()
  }
}

//Draw lines of connection
function drawLines(groupCoords) {
  var dist = 0;

  // console.log("num lines: ", groupPolyLines.length);
  if (groupCoords.length > 1) {

    for (var i = 0; i < groupPolyLines.length; i++) {
      groupPolyLines[i].setMap(null);
    }
    //clear all polylines
    groupPolyLines.splice(0, groupPolyLines.length);

    for (var i = 0; i < groupCoords.length; i++) {

      var pairId = -1;
      var thirdPairId = -1;
      var secondPairId = -1;

      var minDist = 10000000;
      var secondMinDist = 10000000;
      var thirdMinDist = 10000000;

      for (var j = 0; j < groupCoords.length; j++) {
        if (i != j) {

          dist = distance(groupCoords[i].lat, groupCoords[i].lng, groupCoords[j].lat, groupCoords[j].lng);
          //debug sends google formatting lat lng which requires funciton call - when using live data we don't need function call
          //// TODO: send debug commands in same format as live data , ie .lat
          // dist = distance(groupCoords[i].lat(), groupCoords[i].lng(), groupCoords[j].lat(), groupCoords[j].lng());
          // console.log(dist);
          if (dist < minDist) { //&& p1.numConnections < 1 && p2.numConnections < 2  &&  // j != (int)p2.lineStartId && j != (int)p2.lineEndId
            //these will be the secondary values because they will always be one cycle delayed
            minDist = dist;
            pairId = j;
          }
        }
      }

      for (var j = 0; j < groupCoords.length; j++) {
        if (i != j) {
          dist = distance(groupCoords[i].lat, groupCoords[i].lng, groupCoords[j].lat, groupCoords[j].lng);
          // dist = distance(groupCoords[i].lat(), groupCoords[i].lng(), groupCoords[j].lat(), groupCoords[j].lng());
          // console.log(dist);
          if (dist < secondMinDist && dist > minDist) {
            secondMinDist = dist;
            secondPairId = j;
          }
        }
      }

      //Draw first line
      if (pairId != -1) {
        //make new polyline
        var pl = new google.maps.Polyline({
          strokeColor: '#f70000',
          strokeOpacity: 1,
          strokeWeight: 5
          // editable: true
        })
        //set it to the map
        pl.setMap(map);

        //get it's path
        var path = pl.getPath();

        var startPoint = new google.maps.LatLng(groupCoords[i].lat, groupCoords[i].lng);
        path.push(startPoint);

        var endPoint = new google.maps.LatLng(groupCoords[pairId].lat, groupCoords[pairId].lng);
        path.push(endPoint);
        //group is just a way to keep track of all the lines we're making so we can clear them
        groupPolyLines.push(pl);
      }

      //Draws second line
      if (secondPairId != -1) {
        //make new polyline
        var pl = new google.maps.Polyline({
          strokeColor: '#f70000',
          strokeOpacity: 1,
          strokeWeight: 5
          // editable: true
        })

        pl.setMap(map);

        var path = pl.getPath();
        var startPoint = new google.maps.LatLng(groupCoords[i].lat, groupCoords[i].lng);
        path.push(startPoint);
        var endPoint = new google.maps.LatLng(groupCoords[secondPairId].lat, groupCoords[secondPairId].lng);
        path.push(endPoint);

        //this array is just a way to keep track of all the lines we're making so we can clear them
        groupPolyLines.push(pl);
      }
    }
  }
}

// Original line drawing function that requires untangling
// function drawFixedLines(groupCoords){

//Line drawing code for original version with untangling
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

// }

function clearMarkers(numberToClear) {
  var index = 0;
  while (index < numberToClear) {

    console.log("removing marker: ", groupMarkers[groupMarkers.length-1].getTitle())
    groupMarkers[groupMarkers.length-1].setMap(null);
    // groupPolyLines.splice(groupMarkers.length-1,1);
    groupMarkers.pop();

    index ++;
    console.log("total markers : ", groupMarkers.length);
  }
}

function drawMarkers(groupCoords) {

  // Clear Old Markers, if there is a difference between the last length and the current length
  // This might get slow later on
  // we need to add new markers, making sure we're not giving a used id to a new marker
  //if we need to clear markers
  // console.log(groupCoords, groupMarkers);

  //clear new markers if we have more than we have coordinates


  //there are some markers that don't get cleared
  //i'm not sure when it happens - maybe they are actually getting set
  //maybe the simplest way is to just have a separate clear function called
  // we know when people are getting disconnected, just send that directly!
  // then we know when it's happening and don't have to worry about anything else


  //add new markers to list
  var index = 0
  while (groupMarkers.length < groupCoords.length) {

    var image = {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      strokeWeight: 2,
      fillColor: "#919191",
      strokeColor: "#919191",
      fillOpacity: 1.0,
      scale: 4,
      anchor: new google.maps.Point(0, 2)
      // rotation: groupCoords[c].heading
    };

    groupMarkers.push(new google.maps.Marker({
      // title: 'Position of ' + index,
      icon: image
    }));
    console.log("adding marker, total markers: ", groupMarkers.length)
    index++;
  }

  // //Clear all markers from map
  // for (var m = 0; m < groupMarkers.length; m++) {
  //   groupMarkers[m].setMap(null);
  // }

  // console.log(groupCoords, groupMarkers);
  //we need to do somethign at the start to populate the lists

  //cycle through list of incoming coords
  for (var c = 0; c < groupCoords.length; c++) {

    //declare image, grab the heading value from the incoming array
    if (groupCoords[c].id != sessionID) {
      var image = {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        strokeWeight: 2,
        fillColor: "#919191",
        strokeColor: "#919191",
        fillOpacity: 1.0,
        scale: 4,
        anchor: new google.maps.Point(0, 2),
        rotation: groupCoords[c].heading
      };

      // var noMatchIndex = -1;
      // var noMatchId;

      //this doesn't run at the start - because there is nothign in the list
      //check each incoming id against the list of markers
      // for (var i = 0; i < groupMarkers.length; i++) {

      //try to find group marker array member that doesn't have a matching id
      // if (groupMarkers[i].id === groupCoords[j].id && groupCoords[j].id != sessionID ) { //&&
      // noMatchIndex = -1;
      //If we do have a match
      var lat = groupCoords[c].lat;
      var lng = groupCoords[c].lng;
      var latlng = new google.maps.LatLng(lat, lng);

      groupMarkers[c].setPosition(latlng);
      groupMarkers[c].setIcon(image);
      groupMarkers[c].setMap(map);
      groupMarkers[c].setTitle(groupCoords[c].id);

    }
    //log that we've found a match on the incoming array
    // groupMarkers[i].hasMatch = true;
    // groupCoords[j].hasMatch = true;
  }
  // }
  // }
}


//Debug function -
//Fired on map click - disabled for normal operation
function addLatLng(event) {

  var path = guideLine.getPath();
  path.push(event.latLng);

  var coord = {
    lat: event.latLng.lat(),
    lng: event.latLng.lng()
  };

  coordinates.push(coord);
  console.log(coordinates);
  // coordinates.push(event.latLng);
  // console.log(coordinates);
  drawLines(guideLine.getPath().getArray());

}

function distance(lat1, lon1, lat2, lon2) {
  var R = 6371; // km (change this constant to get miles)
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;

  // if (d>1) return Math.round(d)+"km";
  // else if (d<=1) return Math.round(d*1000)+"m";
  // if (d>1) return Math.round(d);
  // else if (d<=1) return Math.round(d*1000);

  //meters
  return d * 1000;
}

socket.on("clear-markers",function(number){
  clearMarkers(number)
})

socket.on("receive-id", function(id) {
  setCookie("id", id, 1)
  console.log("setting id cookie to : " + id);
  cookieID = id;
})

socket.on('connect', function() {
  socket.emit('new-client', 'mobile')
  sessionID = socket.id;
  console.log('connected', socket.connected, sessionID);
  askForLocation();

})

socket.on("receive-group-coordinates", function(groupCoords) {
  // console.log(groupCoords);
  drawLines(groupCoords);
  if (showArrows) {
    drawMarkers(groupCoords);
  }
})


function updateHomeMarkerPosition(position) {
  var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
  homeMarker.setPosition(latlng);
}

function updateHomeMarker(data) {

  compassOrientation = data.z;
  compassOrientation = (compassOrientation + 0);
  if (compassOrientation > 360) {
    compassOrientation = compassOrientation - 360;
  }

  if (compassOrientation != lastCompassOrientation) {
    // $("#compassInfo").html(data.info + ": " + Math.round(compassOrientation) + ". event: " + event);

    homeMarker.setIcon({
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      strokeWeight: 2,
      fillColor: "#000000",
      fillOpacity: 1.0,
      scale: 4,
      anchor: new google.maps.Point(0, 2),
      rotation: compassOrientation
    });

    //Only sending rotation updates with location updates
    socket.emit('update-heading', compassOrientation);
    lastCompassOrientation = compassOrientation;

  } else {
    // $("#compassInfo").html("no change");
  }
}

//Request sensor access if necessary
//We need a way to detect if we're not getting the sensor data, and we can't ask for permission - ie for iOS 12
//Maybe just detect if we're not getting sensor values after a certain time
//Test on iPhone 5, turn off sensors
function setupSensorListeners() {

  window.addEventListener('deviceorientation', (event) => {
    hasSensorAccess = true;
    var data = "";
    if ("webkitCompassHeading" in event) {
      data = {
        info: "Received from deviceorientation webkitCompassHeading - iOS Safari,  Chrome, Firefox",
        z: event.webkitCompassHeading
      }
      // Android - Chrome <50
    } else if (event.absolute) {
      data = {
        info: "Received from deviceorientation with absolute=true & alpha val",
        z: event.alpha
      }
    } else {
      data = {
        info: "absolute=false, heading might not be absolute to magnetic north",
        z: 360 - event.alpha
      }
    }
    updateHomeMarker(data);
    // alert("listener added");
  })
  // alert("Can't access compass! You can enable permission at Settings -> Safari -> Motion & Orientation Access.")
}




//Check if we need to request access to sensors
if (typeof(DeviceOrientationEvent) !== "undefined" && typeof(DeviceOrientationEvent.requestPermission) === "function") {
  if (window.confirm("We need to access the compass sensor to show your orientation on the map")) {
    DeviceOrientationEvent.requestPermission()
      .then(response => {
        if (response == 'granted') {
          requestSensorAccess();
        }
      })
      .catch(function(err) {
        $("#errorInfo").html("Cannot get permission", err.toString());
      })
    requestSensorAccess()
  }
} else {
  setupSensorListeners();
}

//Only for ios 12 I think - there must be a way to not duplicate these functions
function requestSensorAccess() {

}

function polylineChanged() {
  drawLines(guideLine.getPath().getArray());
  // console.log("draing lines");
}

//Function called by async script call at bottom of index.html
function initMap() {
  var myLatLng = {
    lat: -25.363,
    lng: 131.044
  };
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 13,
    center: {
      lat: 45.536384,
      lng: -73.628949
    },
    disableDefaultUI: true,
    styles: [{
        "elementType": "geometry",
        "stylers": [{
          "color": "#f5f5f5"
        }]
      },
      {
        "elementType": "labels",
        "stylers": [{
          "visibility": "off"
        }]
      },
      {
        "elementType": "labels.icon",
        "stylers": [{
          "visibility": "off"
        }]
      },
      {
        "elementType": "labels.text.fill",
        "stylers": [{
          "color": "#616161"
        }]
      },
      {
        "elementType": "labels.text.stroke",
        "stylers": [{
          "color": "#f5f5f5"
        }]
      },
      {
        "featureType": "administrative.land_parcel",
        "stylers": [{
          "visibility": "off"
        }]
      },
      {
        "featureType": "administrative.land_parcel",
        "elementType": "labels.text.fill",
        "stylers": [{
          "color": "#bdbdbd"
        }]
      },
      {
        "featureType": "administrative.neighborhood",
        "stylers": [{
          "visibility": "off"
        }]
      },
      {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [{
          "color": "#eeeeee"
        }]
      },
      {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{
          "color": "#757575"
        }]
      },
      {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{
          "color": "#e5e5e5"
        }]
      },
      {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [{
          "color": "#9e9e9e"
        }]
      },
      {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{
          "color": "#ffffff"
        }]
      },
      {
        "featureType": "road.arterial",
        "elementType": "labels.text.fill",
        "stylers": [{
          "color": "#757575"
        }]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{
          "color": "#dadada"
        }]
      },
      {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [{
          "color": "#616161"
        }]
      },
      {
        "featureType": "road.local",
        "elementType": "labels.text.fill",
        "stylers": [{
          "color": "#9e9e9e"
        }]
      },
      {
        "featureType": "transit.line",
        "elementType": "geometry",
        "stylers": [{
          "color": "#e5e5e5"
        }]
      },
      {
        "featureType": "transit.station",
        "elementType": "geometry",
        "stylers": [{
          "color": "#eeeeee"
        }]
      },
      {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{
          "color": "#c9c9c9"
        }]
      },
      {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [{
          "color": "#9e9e9e"
        }]
      }
    ]
  });

  //Uncomment for debugging mode where we draw a line with clicks and then the system finds the closest points between
  // guideLine = new google.maps.Polyline({
  //   strokeColor: '#989898',
  //   strokeOpacity: 0.1,
  //   strokeWeight: 5,
  //   editable: true
  //   // draggable: true
  // });
  //
  // guideLine.setMap(map);
  //
  // google.maps.event.addListener(guideLine.getPath(), 'insert_at', polylineChanged);
  // google.maps.event.addListener(guideLine.getPath(), 'remove_at', polylineChanged);
  // google.maps.event.addListener(guideLine.getPath(), 'set_at', polylineChanged);

  var image = {
    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    strokeWeight: 2,
    fillColor: "#000000",
    strokeColor: "#000000",
    fillOpacity: 1.0,
    scale: 4,
    anchor: new google.maps.Point(0, 2),
    rotation: 0
  };

  homeMarker = new google.maps.Marker({
    // position: {
    //   lat: lat,
    //   lng: lng
    // },
    title: 'Home',
    icon: image
  });

  var imageBounds = {
    north: 45.536384,
    south: 45.535557,
    west: -73.629249,
    east: -73.628002
  }

  homeMarker.setMap(map);

  // heartOverlay = new google.maps.GroundOverlay('/images/red_heart.png',imageBounds);
  // heartOverlay.setMap(map);

  // map.addListener('click', addLatLng);

  var id = getCookie("id");
  if (id != null) {
    console.log("has id: " + id);
    cookieID = id;
  } else {
    console.log("has no id : " + id);
    socket.emit('request-id');
  }

  // askForLocation();

}

//Print errors as they happen
window.onerror = function(msg, url, lineNo, columnNo, error) {
  var string = msg.toLowerCase();
  var substring = "script error";
  if (string.indexOf(substring) > -1) {
    alert('Script Error: See Browser Console for Detail');
  } else {
    var message = [
      'Message: ' + msg,
      'URL: ' + url,
      'Line: ' + lineNo,
      'Column: ' + columnNo,
      'Error object: ' + JSON.stringify(error)
    ].join(' - ');

    console.log("captured error:", message);
    // alert(message);
  }

  return false;
};
