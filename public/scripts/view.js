var socket = io();

var currLatLng;
var map;
var groupMarkers = [];
var groupPolyLines = [];
var fixedPolyLine;
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
var drawDone = false;
var sensorsActive = false;
var gpsActive = false;
var sensorsActive = false;
var lastMode = null;
var watchPositionId = null;

var trianglePolylineTemp;
var lastSortedCoords = [];
var cookieID;
var firstSocketID;
var firstConnectTimestamp;


//Set cookie - not yet used
function setCookie(c_name, value, exdays) {
  var exdate = new Date();
  exdate.setDate(exdate.getDate() + exdays);
  var c_value =
    escape(value) + (exdays == null ? "" : "; expires=" + exdate.toUTCString());
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


// function readyToStart(){
//   //remove ready dialogue
//   socket.emit("ready-to-start", true);
// }
//Center map to current position (if it's been set)
function center() {
  // requestDeviceOrientation();
  map.panTo(new google.maps.LatLng(currLatLng.lat, currLatLng.lng));
}

const calculateCentroid = (acc, {
  lat,
  lng
}, idx, src) => {
  acc.lat += lat / src.length;
  acc.lng += lng / src.length;
  return acc;
};

const sortByAngle = (a, b) => a.angle - b.angle;

function calculateSimilarity(groupCoordsSorted) {
  const curve = groupCoordsSorted.map(coords => ({
    x: coords.lng,
    y: coords.lat
  }));
  const similarity = curveMatcher.shapeSimilarity(curve, heartShape, {
    rotations: 500
  });
  console.log("similarity", similarity);
}

//Draw lines between the received points
function drawLines(groupCoords) {

  var dist = 0;

  // console.log("num lines: ", groupPolyLines.length);
  if (groupCoords.length > 1) {

    // console.log(groupCoords);
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
      id,
      ready
    }) => {
      return {
        lat,
        lng,
        id,
        ready,
        angle: Math.atan2(lat - center.lat, lng - center.lng) * 180 / Math.PI
      };
    });

    let groupCoordsSorted = angles.sort(sortByAngle);

    //closing the loop
    groupCoordsSorted.push(groupCoordsSorted[0]);

    lastSortedCoords = groupCoordsSorted;

    var polyline = new google.maps.Polyline({
      strokeColor: '#f70000',
      strokeOpacity: 1,
      strokeOpacity: 1,
      strokeWeight: 5,
      fillColor: "#f70000",
      fillOpacity: 0.5,
      path: groupCoordsSorted
    });
    polyline.setMap(map);

    // calculateSimilarity(groupCoordsSorted);
    groupPolyLines.push(polyline);

    //Draw filled-in heart
    for (var i = 0; i < groupCoordsSorted.length; i++) {
      if (groupCoordsSorted[i].ready === true || lastMode === 3) {

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

        var a = new google.maps.LatLng(groupCoordsSorted[i].lat, groupCoordsSorted[i].lng);
        path.push(a);

        var b = new google.maps.LatLng(center.lat, center.lng);
        path.push(b);

        let nextIndex = i + 1;
        if (nextIndex > groupCoordsSorted.length - 1) {
          nextIndex = 1;
        }
        var c = new google.maps.LatLng(groupCoordsSorted[nextIndex].lat, groupCoordsSorted[nextIndex].lng);
        path.push(c);

        groupPolyLines.push(trianglePolyline);
      }
    }
  }
}

// Original line drawing function that requires untangling
function drawFixedLines(groupCoords) {

  //Line drawing code for original version with untangling
  var path = fixedPolyLine.getPath();
  path.clear()

  //Add positions of other people
  for (var i = 0; i < groupCoords.length; i++) {
    var ll = new google.maps.LatLng(groupCoords[i].lat, groupCoords[i].lng);
    // console.log("adding new coordinate");
    path.push(ll);
  }

  // //close shape by bringing it back to the first person
  if (groupCoords.length > 1) {
    var ll = new google.maps.LatLng(groupCoords[0].lat, groupCoords[0].lng);
    path.push(ll);
  }

  //Draw done triangles
  for (var i = 0; i < groupPolyLines.length; i++) {
    groupPolyLines[i].setMap(null);
  }
  //clear all polylines
  groupPolyLines.splice(0, groupPolyLines.length);

  const center = groupCoords.reduce(calculateCentroid, {
    lat: 0,
    lng: 0
  });

  for (var i = 0; i < groupCoords.length; i++) {
    if (groupCoords[i].ready === true ) { //|| lastMode === 3

      var trianglePolyline = new google.maps.Polygon({
        strokeColor: '#f70000',
        strokeOpacity: 1,
        // strokeOpacity: 1,
        strokeWeight: 5,
        fillColor: '#f70000',
        fillOpacity: 0.2
      })

      trianglePolyline.setMap(map);

      var path = trianglePolyline.getPath();

      var a = new google.maps.LatLng(groupCoords[i].lat, groupCoords[i].lng);
      path.push(a);

      var b = new google.maps.LatLng(center.lat, center.lng);
      path.push(b);

      let nextIndex = i + 1;
      if (nextIndex > groupCoords.length - 1) {
        nextIndex = 0;
      }
      var c = new google.maps.LatLng(groupCoords[nextIndex].lat, groupCoords[nextIndex].lng);
      path.push(c);

      groupPolyLines.push(trianglePolyline);
    }
  }
}


//Called every time a socket is disconnected
function clearMarkers(numberToClear) {

  console.log("clear ", numberToClear, " markers");
  var index = 0;
  while (index < numberToClear) {
    console.log(
      "removing marker: "
      // groupMarkers[groupMarkers.length - 1].getTitle()
    );
    if (groupMarkers.length - 1 > 0) {
      groupMarkers[groupMarkers.length - 1].setMap(null);
      // groupPolyLines.splice(groupMarkers.length-1,1);
      groupMarkers.pop();
    }
    index++;
    console.log("total markers : ", groupMarkers.length);
  }

}


function drawMarkers(groupCoords) {

  var index = 0;
  while (groupMarkers.length < groupCoords.length) {

    var image = {
      path: "M39.167,30c0,5.062-4.104,9.167-9.166,9.167c-5.063,0-9.167-4.104-9.167-9.167c0-9.125,8.416-18,9.167-18 C30.75,12,39.167,20.875,39.167,30z",
      strokeWeight: 2,
      fillColor: "#919191",
      strokeColor: "#919191",
      fillOpacity: 1.0,
      scale: 0.75,
      anchor: new google.maps.Point(30, 30)
      // rotation: groupCoords[c].heading
    };

    var marker = new google.maps.Marker({
      icon: image
    });

    // google.maps.event.addListener(marker, 'mouseup', function(event) {
    //   console.log("tapping : ", this.getTitle());
    //   socket.emit("send-tap", this.getTitle());
    //
    //   drawTapResponse(this.getTitle());
    //
    // });

    groupMarkers.push(marker);
    console.log("adding marker, total markers: ", groupMarkers.length);
    index++;
  }

  //cycle through list of incoming coords
  for (var c = 0; c < groupCoords.length; c++) {
    //declare image, grab the heading value from the incoming array
    var image = {
      path: "M39.167,30c0,5.062-4.104,9.167-9.166,9.167c-5.063,0-9.167-4.104-9.167-9.167c0-9.125,8.416-18,9.167-18 C30.75,12,39.167,20.875,39.167,30z",
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
    // if (groupMarkers[c].getTitle() != sessionID) {
      groupMarkers[c].setMap(map);
    // } else {
      // groupMarkers[c].setMap(null);
    // }
  }
}

socket.on("clear-markers", function(number) {
  clearMarkers(number)
})





socket.on('connect', function() {

  // socket.emit('new-client', 'mobile')
  // sessionID = socket.id;
  // console.log("connected", socket.connected, sessionID);
  // $("#compassInfo").html(sessionID);

  // tryGeolocation();
  // requestDeviceOrientation();
  //
  // if (currLatLng != null) {
  //   socket.emit("update-coordinates", currLatLng);
  // }
  //
  // firstSocketID = getCookie("firstsocket");
  //
  // if(firstSocketID == null){
  //     setCookie("firstsocket", sessionID, 1);
  // }
  //
  // //Get sequential id from cookie
  // // var id = getCookie("id");
  // // if (id != null) {
  // //   console.log("has cookie id: " + id);
  // //   cookieID = id;
  // // } else {
  // //   console.log("has no id : " + id);
  // //   socket.emit("request-id");
  // // }
  //
  // var ct = getCookie("timestamp");
  // if (ct != null) {
  //   console.log("has timestamp : " + ct);
  //   firstConnectTimestamp = ct;
  //   $("#compassInfo").html(firstConnectTimestamp);
  // } else {
  //   console.log("no timestamp saved in cookies ");
  //   socket.emit("request-timestamp");
  // }
});

socket.on("receive-group-coordinates", function(groupCoords) {
  // console.log(groupCoords);
  // drawLines(groupCoords);
  drawFixedLines(groupCoords);

  if (showArrows) {
    drawMarkers(groupCoords);
  }
});

//These two don't do anything anymore
socket.on("ready-status", function(counts) {
  // console.log(counts);
  // $("#compassInfo").html("Done: " + counts.ready + "/" + counts.users + " Mode: " + lastMode);
});


//Function called by async script call at bottom of index.html
function initMap() {
  // var myLatLng = {
  //   lat: -25.363,
  //   lng: 131.044
  // };

  map = new google.maps.Map(document.getElementById("map"), {
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
        elementType: "geometry",
        stylers: [{
          color: "#f5f5f5"
        }]
      },
      {
        elementType: "labels",
        stylers: [{
          visibility: "off"
        }]
      },
      {
        elementType: "labels.icon",
        stylers: [{
          visibility: "off"
        }]
      },
      {
        elementType: "labels.text.fill",
        stylers: [{
          color: "#616161"
        }]
      },
      {
        elementType: "labels.text.stroke",
        stylers: [{
          color: "#f5f5f5"
        }]
      },
      {
        featureType: "administrative.land_parcel",
        stylers: [{
          visibility: "off"
        }]
      },
      {
        featureType: "administrative.land_parcel",
        elementType: "labels.text.fill",
        stylers: [{
          color: "#bdbdbd"
        }]
      },
      {
        featureType: "administrative.neighborhood",
        stylers: [{
          visibility: "off"
        }]
      },
      {
        featureType: "poi",
        elementType: "geometry",
        stylers: [{
          color: "#eeeeee"
        }]
      },
      {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{
          color: "#757575"
        }]
      },
      {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{
          color: "#e5e5e5"
        }]
      },
      {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{
          color: "#9e9e9e"
        }]
      },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{
          color: "#ffffff"
        }]
      },
      {
        featureType: "road.arterial",
        elementType: "labels.text.fill",
        stylers: [{
          color: "#757575"
        }]
      },
      {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{
          color: "#dadada"
        }]
      },
      {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{
          color: "#616161"
        }]
      },
      {
        featureType: "road.local",
        elementType: "labels.text.fill",
        stylers: [{
          color: "#9e9e9e"
        }]
      },
      {
        featureType: "transit.line",
        elementType: "geometry",
        stylers: [{
          color: "#e5e5e5"
        }]
      },
      {
        featureType: "transit.station",
        elementType: "geometry",
        stylers: [{
          color: "#eeeeee"
        }]
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{
          color: "#c9c9c9"
        }]
      },
      {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{
          color: "#9e9e9e"
        }]
      }
    ]
  });

  //Uncomment below for debugging mode - add 'location' points with mouse click
  guideLine = new google.maps.Polyline({
    strokeColor: "#989898",
    strokeOpacity: 0.1,
    strokeWeight: 5,
    editable: true
    // draggable: true
  });

  guideLine.setMap(map);


  fixedPolyLine = new google.maps.Polyline({
    strokeColor: "#f70000",
    strokeOpacity: 1,
    strokeWeight: 5
  });

  fixedPolyLine.setMap(map);

  // google.maps.event.addListener(guideLine.getPath(), "insert_at", insertAt);
  // google.maps.event.addListener(guideLine.getPath(), "remove_at", removeAt);
  // google.maps.event.addListener(guideLine.getPath(), "set_at", setAt);

  // map.addListener("click", addLatLng);

  var image = {
    path: "M39.167,30c0,5.062-4.104,9.167-9.166,9.167c-5.063,0-9.167-4.104-9.167-9.167c0-9.125,8.416-18,9.167-18 C30.75,12,39.167,20.875,39.167,30z",
    strokeWeight: 2,
    strokeColor: "#29ABE2",
    fillColor: "#29ABE2",
    fillOpacity: 1.0,
    scale: 0.75,
    anchor: new google.maps.Point(30, 30),
    rotation: 0
  };

  homeMarker = new google.maps.Marker({
    title: "Home",
    icon: image
  });

  var imageBounds = {
    north: 45.536384,
    south: 45.535557,
    west: -73.629249,
    east: -73.628002
  };

  homeMarker.setMap(map);

  google.maps.event.addListener(homeMarker, 'mouseup', function(event) {
    spriteSound.play();

    homeMarker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function() {
      homeMarker.setAnimation(null)
    }, 600);

  });

}

//Print errors as they happen
window.onerror = function(msg, url, lineNo, columnNo, error) {
  var string = msg.toLowerCase();
  var substring = "script error";
  if (string.indexOf(substring) > -1) {
    alert("Script Error: See Browser Console for Detail");
  } else {
    var message = [
      "Message: " + msg,
      "URL: " + url,
      "Line: " + lineNo,
      "Column: " + columnNo,
      "Error object: " + JSON.stringify(error)
    ].join(" - ");

    console.log("captured error:", message);
    // alert(message);
  }

  return false;
};
