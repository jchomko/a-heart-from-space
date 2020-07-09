var socket = io()

var output = document.querySelector('.output');
var arr = document.getElementById("arrow");

var currLatLng;
var map;
var groupMarkers = [];
var groupPolyLines = [];
var homeMarkerID;
var sessionID;
var bestAccuracy = 1000;
var hasSensorAccess = false;
var compassOrientation = 0;
var markerArray = [];
var homeMarker;
var lastCompassOrientation = 0;
var showArrows = true;
var guideLine;


var spriteSound = new Howl({
  src: ['Ticket-machine-sound.mp3'] //,
  // sprite: {
  //   arrival1: [0, 2500],
  //   arrival2: [4500, 2500],
  //   arrival3: [9000, 2500],
  //   arrival4: [13400, 2500],
  //   arrival5: [18000, 2500],
  //   arrival6: [22500, 2500],
  //   arrival7: [27300, 2500],
  //   arrival8: [31500, 2500],
  //   arrival9: [36200, 2500],
  //   arrival10: [40400, 2500],
  //   arrival11: [45350, 2500],
  //   arrival12: [49600, 2500],
  //   arrival13: [54100, 2500],
  //   arrival14: [58800, 2500],
  //   arrival15: [63000, 2500]
  // }
});


//Set cookie - not yet used
function setCookie(c_name, value, exdays) {
  var exdate = new Date();
  exdate.setDate(exdate.getDate() + exdays);
  var c_value = escape(value) + ((exdays == null) ? "" : "; expires=" + exdate.toUTCString());
  document.cookie = c_name + "=" + c_value;
}

//Retrieve cookie - not yet used
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

//Show / hide arrows
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

//Center map to current position (if it's been set)
function center() {
  map.panTo(new google.maps.LatLng(currLatLng.lat, currLatLng.lng));
}

//Geolocation success callback
var browserGeolocationSuccess = function(position) {
  if (position.coords.accuracy < bestAccuracy) {
    bestAccuracy = position.coords.accuracy;
    console.log("bestAccuracy: " + bestAccuracy);
  }
  // if we have a high accuracy reading
  // if using simulated position the accuracy will be fixed at 150
  if (position.coords.accuracy < bestAccuracy + 10 ) { //|| position.coords.accuracy === 150
    currLatLng = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      heading: compassOrientation
    };
    updateHomeMarkerPosition(position);
    // console.log("accurate coordinates: " + JSON.stringify(myLatLng))
    socket.emit("update-coordinates", currLatLng)
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
  }
}

//Request for position must come from user action, hence the prompt
function askForLocation() {
  if (confirm("This website requires access to your GPS location. Press OK and you'll receive a request to access your location.")) {
    tryGeolocation()
  }
}

const calculateCentroid = (acc, {
  lat,
  lng
}, idx, src) => {
  acc.lat += lat / src.length;
  acc.lng += lng / src.length;
  return acc;
}

const sortByAngle = (a, b) => a.angle - b.angle

//Draw lines between the received points
function drawLines(groupCoords) {

  var dist = 0;

  // console.log("num lines: ", groupPolyLines.length);
  if (groupCoords.length > 1) {

    console.log(groupCoords);
    //clear polylines
    for (var i = 0; i < groupPolyLines.length; i++) {
      groupPolyLines[i].setMap(null);
    }
    //clear all polylines
    groupPolyLines.splice(0, groupPolyLines.length);

    const center = groupCoords.reduce(calculateCentroid, {
      lat: 0,
      lng: 0
    });

    const angles = groupCoords.map(({
      lat,
      lng,
      id
    }) => {
      return {
        lat,
        lng,
        id,
        angle: Math.atan2(lat - center.lat, lng - center.lng) * 180 / Math.PI
      };
    });

    let groupCoordsSorted = angles.sort(sortByAngle);

    //closing the loop
    groupCoordsSorted.push(groupCoordsSorted[0]);

    var polyline = new google.maps.Polyline({
      strokeColor: '#f70000',
      strokeOpacity: 1,
      strokeOpacity: 1,
      strokeWeight: 5,
      fillColor: '#f70000',
      fillOpacity: 0.5,
      path: groupCoordsSorted
    })
    polyline.setMap(map);

    groupPolyLines.push(polyline);


    //Drawing single triangle for I'm done visualization
    // if (drawDone) {
      //find which index you are on the sorted list
      //then just increment one up or down on the list to get the next point
      //but that means we need to keep the id in the coordinates
      console.log(groupCoordsSorted)

      let matchIndex = -1;
      for(var i = 0; i < groupCoordsSorted.length; i ++){
        if(groupCoordsSorted[i].id === sessionID){
          matchIndex = i;
        }
      }

      if(matchIndex != -1){
        var trianglePolyline = new google.maps.Polygon({
          strokeColor: '#f70000',
          strokeOpacity: 1,
          strokeOpacity: 1,
          strokeWeight: 5,
          fillColor: '#f70000',
          fillOpacity: 1.0
        })
        trianglePolyline.setMap(map);

        var path = trianglePolyline.getPath();

        var a = new google.maps.LatLng(groupCoordsSorted[matchIndex].lat, groupCoordsSorted[matchIndex].lng);
        path.push(a);

        var b = new google.maps.LatLng(center.lat, center.lng);
        path.push(b);

        let nextIndex = matchIndex +1;
        if(nextIndex > groupCoordsSorted.length-1){
          nextIndex = 1;
        }
        var c = new google.maps.LatLng(groupCoordsSorted[nextIndex].lat, groupCoordsSorted[nextIndex].lng);
        path.push(c);

        groupPolyLines.push(trianglePolyline);

        //once we've drawn our triangle we need to send a signal to others that we've drawn our triangles!
        //then that needs to get embedded in the data that streams to the phone
        //and so if an ID has a marker of being finished we draw a triangle for it
        //(or include it in our triangle if it's adjacent)
      }
    // }
    /*for (var i = 0; i < groupCoords.length; i++) {

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
    }*/
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

//Called every time a socket is disconnected
function clearMarkers(numberToClear) {
  var index = 0;
  while (index < numberToClear) {

    console.log("removing marker: ", groupMarkers[groupMarkers.length - 1].getTitle())
    groupMarkers[groupMarkers.length - 1].setMap(null);
    // groupPolyLines.splice(groupMarkers.length-1,1);
    groupMarkers.pop();

    index++;
    console.log("total markers : ", groupMarkers.length);
  }
}

//add a marker for each incoming coordinate
function drawMarkers(groupCoords) {
  //add new markers to list if we need any
  var index = 0
  while (groupMarkers.length < groupCoords.length) {
    //no rotation
    //Arrow

    var image = {
      path: 'M39.167,30c0,5.062-4.104,9.167-9.166,9.167c-5.063,0-9.167-4.104-9.167-9.167c0-9.125,8.416-18,9.167-18 C30.75,12,39.167,20.875,39.167,30z',
      strokeWeight: 2,
      fillColor: "#919191",
      strokeColor: "#919191",
      fillOpacity: 1.0,
      scale: 0.75,
      anchor: new google.maps.Point(30, 30),
      // rotation: groupCoords[c].heading
    };


    var marker = new google.maps.Marker({
      icon: image
    })

    google.maps.event.addListener(marker, 'mouseup', function(event) {
      console.log("tapping : ", this.getTitle());
      socket.emit("send-tap", this.getTitle());
    });

    groupMarkers.push(marker);
    console.log("adding marker, total markers: ", groupMarkers.length)
    index++;
  }

  //cycle through list of incoming coords
  for (var c = 0; c < groupCoords.length; c++) {
    //declare image, grab the heading value from the incoming array
    var image = {
      path: 'M39.167,30c0,5.062-4.104,9.167-9.166,9.167c-5.063,0-9.167-4.104-9.167-9.167c0-9.125,8.416-18,9.167-18 C30.75,12,39.167,20.875,39.167,30z',
      strokeWeight: 2,
      fillColor: "#919191",
      strokeColor: "#919191",
      fillOpacity: 1.0,
      scale: 0.75,
      anchor: new google.maps.Point(30, 30),
      rotation: groupCoords[c].heading
    };

    //Get new coordinate
    var lat = groupCoords[c].lat;
    var lng = groupCoords[c].lng;
    var latlng = new google.maps.LatLng(lat, lng);

    //Set marker position
    groupMarkers[c].setPosition(latlng);
    groupMarkers[c].setIcon(image);
    groupMarkers[c].setTitle(groupCoords[c].id);

    //Hide the marker if it's our own sessionId
    if (groupMarkers[c].getTitle() != sessionID) {
      groupMarkers[c].setMap(map);
    } else {
      groupMarkers[c].setMap(null);
    }
  }
}


//Debug function - Fired on map click - disabled for normal operation
function addLatLng(event) {
  var path = guideLine.getPath();
  path.push(event.latLng);
  // drawLines(guideLine.getPath().getArray());
  drawLines(convertCoordinates(guideLine.getPath().getArray()))
}

function polylineChanged(index) {
  drawLines(convertCoordinates(guideLine.getPath().getArray()))
  // drawLines(guideLine.getPath().getArray());
  // console.log("drawing lines : ", guideLine.getPath().getArray());
}

function insertAt(index) {
  if (guideLine.getPath().length - index !== 1) {
    polylineChanged();
  }
}

function removeAt(index) {
  polylineChanged();
}

function setAt(index) {
  polylineChanged();
}

function convertCoordinates(coordsToConvert) {
  var formattedCoords = [];
  for (var i = 0; i < coordsToConvert.length; i++) {
    var formattedCoord = {
      lat: coordsToConvert[i].lat(),
      lng: coordsToConvert[i].lng()
    };
    formattedCoords.push(formattedCoord);
  }
  return formattedCoords;
}

//Calculate distance between two points
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

socket.on("receive-tap", function() {
  console.log("vibrate")
  if (window.navigator.vibrate) {
    window.navigator.vibrate(500);
  }
  // var key = "arrival1";
  spriteSound.play(); //key
})

socket.on("clear-markers", function(number) {
  clearMarkers(number)
})

socket.on("receive-id", function(id) {
  setCookie("id", id, 1)
  console.log("setting id cookie to : " + id);
  // cookieID = id;
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

function updateHomeMarkerRotation(data) {
  compassOrientation = data.z;
  compassOrientation = (compassOrientation + 0);
  if (compassOrientation > 360) {
    compassOrientation = compassOrientation - 360;
  }

  if (compassOrientation != lastCompassOrientation) {
    // $("#compassInfo").html(data.info + ": " + Math.round(compassOrientation) + ". event: " + event);
    homeMarker.setIcon({
      // path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      path: 'M39.167,30c0,5.062-4.104,9.167-9.166,9.167c-5.063,0-9.167-4.104-9.167-9.167c0-9.125,8.416-18,9.167-18 C30.75,12,39.167,20.875,39.167,30z',
      strokeWeight: 2,
      strokeColor: "#29ABE2",
      fillColor: "#29ABE2",
      fillOpacity: 1.0,
      scale: 0.75,
      anchor: new google.maps.Point(30, 30),
      rotation: compassOrientation
    });

    //Images can't use rotation!
    // homeMarker.setIcon({
    //   url: "/images/compass_dot_marker_integrated_blue.png",
    //   size: new google.maps.Size(60,60),
    //   origin: new google.maps.Point(0,0),
    //   anchor: new google.maps.Point(30,30),
    //   rotation: compassOrientation
    // });

    //Only sending rotation updates with location updates
    socket.emit('update-heading', compassOrientation);
    lastCompassOrientation = compassOrientation;

  } else {
    // $("#compassInfo").html("no change");
  }
}

//setup sensor listeners
//// TODO:  detect if ios12 and user needs to turn on sensor access
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
    updateHomeMarkerRotation(data);
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
          setupSensorListeners();
        }
      })
      .catch(function(err) {
        $("#errorInfo").html("Cannot get permission", err.toString());
      })
  }
  //if not then we just setup the listeners
} else {
  setupSensorListeners();
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

  //Uncomment below for debugging mode - add 'location' points with mouse click

  guideLine = new google.maps.Polyline({
    strokeColor: '#989898',
    strokeOpacity: 0.1,
    strokeWeight: 5,
    editable: true
    // draggable: true
  });

  guideLine.setMap(map);

  google.maps.event.addListener(guideLine.getPath(), 'insert_at', insertAt);
  google.maps.event.addListener(guideLine.getPath(), 'remove_at', removeAt);
  google.maps.event.addListener(guideLine.getPath(), 'set_at', setAt);

  map.addListener('click', addLatLng);

  var image = {
    path: 'M39.167,30c0,5.062-4.104,9.167-9.166,9.167c-5.063,0-9.167-4.104-9.167-9.167c0-9.125,8.416-18,9.167-18 C30.75,12,39.167,20.875,39.167,30z',
    strokeWeight: 2,
    strokeColor: "#29ABE2",
    fillColor: "#29ABE2",
    fillOpacity: 1.0,
    scale: 0.75,
    anchor: new google.maps.Point(30, 30),
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

  google.maps.event.addListener(homeMarker, 'mouseup', function(event) {
    spriteSound.play();
    // console.log("tapping : ", this.getTitle());
    // socket.emit("send-tap", this.getTitle() );
  });

  var id = getCookie("id");
  if (id != null) {
    console.log("has id: " + id);
    cookieID = id;
  } else {
    console.log("has no id : " + id);
    socket.emit('request-id');
  }
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
