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

var spriteSound = new Howl({
  src: ['Ticket-machine-sound.mp3']
  //,
  // sprite: {
  //   arrival1: [0, 2500],
  //   arrival15: [63000, 2500]
  // }
});

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

function activateSensors() {
  if (!sensorsActive) {
    requestDeviceOrientation();
    $("#activateSensors").html("Sensors On");
  }
  // else{
  //   $("#activateSensors").html("Activate Sensors");
  // }
  // sensorsActive = !sensorsActive;
  sensorsActive = true;

}

function activateGPS() {

  if (!gpsActive) {
    tryGeolocation();
    $("#activateGPS").html("GPS On");
    center();
    gpsActive = true;
  }
  // else{
  //   $("#activateGPS").html("Activate GPS");
  // }
  // gpsActive = !gpsActive;

}

function toggleSection() {

  if (!drawDone) {

    drawTriangle();
    $("#doneSection").html("Done!");
    $("#doneSection").css("background-color", "rgb(180,260,180)")
    // socket.emit("draw-triangle", true)

    // drawDone = true;
    // socket.emit("draw-triangle", true)
    socket.emit("draw-triangle", true)

  } else {

    $("#doneSection").html("Done");
    $("#doneSection").css("background-color", "rgb(220,220,220)")

    if (trianglePolylineTemp != null) {
      trianglePolylineTemp.setMap(null);
      console.log("clearing triangle");
    }

    socket.emit("draw-triangle", false)

  }

  drawDone = !drawDone;
  // console.log(drawDone);
  // we need to trigger the drawing immediately here, and then let it update with location for the others
  // how do you distinguish which heart section is yours?
  // it shoouuld be equally drawn between the sections so it's centered on you.
}

function checkDoneButton(groupCoords) {

  for (var i = 0; i < groupCoords.length; i++) {
    if (groupCoords[i].connectTimestamp === firstConnectTimestamp) {
      if (groupCoords[i].ready) {
        $("#doneSection").html("Done!");
        $("#doneSection").css("background-color", "rgb(180,260,180)")
      } else {
        $("#doneSection").html("Done");
        $("#doneSection").css("background-color", "rgb(220,220,220)")
      }
      // groupCoords[i].done = coords.done
    }
  }

}

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
    socket.emit("update-coordinates", currLatLng);
    activateGPS();
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

//Get location of device  - navigator is just an html5 access for the browser
function tryGeolocation() {
  if (navigator.geolocation) {

    if (watchPositionId != null) {
      navigator.geolocation.clearWatch(watchPositionId);
      console.log("clearing watchPosition: ", watchPositionId);
    } else {
      for (var i = 0; i < 100; i++) {
        var w = navigator.geolocation.clearWatch(i);
        console.log("clearing watchPositions ", i, w);
      }
    }

    watchPositionId = navigator.geolocation.watchPosition(
      browserGeolocationSuccess,
      browserGeolocationFail, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000 //maximum age might be why batteries were going so low - because it forces the phone to get a new position each time?
      }
    );
  }
}

//Request for position must come from user action, hence the prompt
function askForLocation() {
  if (
    confirm(
      "This website requires access to your GPS location. Press OK and you'll receive a request to access your location."
    )
  ) {
    tryGeolocation();
  }
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
//Sorts by angle to the centroid
//We should be doing this on the back-end to save power
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

  //Why aren't we just drawing the markers here? If we have extra, set map to null, if we need more add one to list?
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

  var readyCount = 0;
  //Draw Triangles
  for (var i = 0; i < groupCoords.length; i++) {
    if (groupCoords[i].ready === true) { //|| lastMode === 3

      readyCount++;

      var trianglePolyline = new google.maps.Polygon({
        strokeColor: '#f70000',
        strokeOpacity: 1,
        // strokeOpacity: 1,
        strokeWeight: 5,
        fillColor: '#f70000',
        fillOpacity: 1
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
  //
  // console.log(readyCount, groupCoords.length, showArrows);
  // if(readyCount >= groupCoords.length){
  //   showArrows = false;
  //   clearMarkers(groupCoords.length);
  //   homeMarker.setMap(null);
  // }

}


function drawTapResponse(markerId) {

  let matchIndex = -1;
  for (var i = 0; i < groupMarkers.length; i++) {
    if (groupMarkers[i].getTitle() === markerId) {
      matchIndex = i;
    }
  }
  console.log("tap id: ", matchIndex);

  if (matchIndex != -1) {
    groupMarkers[matchIndex].setAnimation(google.maps.Animation.BOUNCE);
  }

  setTimeout(function() {
    groupMarkers[matchIndex].setAnimation(null)
  }, 600, matchIndex);

}

//Draw one triangle for user
//I made this so it would draw faster but not using it now
function drawTriangle() {

  //find which index you are on the sorted list
  //then just increment one up or down on the list to get the next point
  //but that means we need to keep the id in the coordinates
  console.log("last sorted coords :", lastSortedCoords)

  let matchIndex = -1;
  for (var i = 0; i < lastSortedCoords.length; i++) {
    if (lastSortedCoords[i].id === sessionID) {
      matchIndex = i;
    }
  }

  if (matchIndex != -1) {
    console.log("drawing triangle, id: ", matchIndex)
    trianglePolylineTemp = new google.maps.Polygon({
      strokeColor: '#f70000',
      strokeOpacity: 1,
      strokeOpacity: 1,
      strokeWeight: 5,
      fillColor: '#f70000',
      fillOpacity: 1.0
    })


    trianglePolylineTemp.setMap(map);

    var path = trianglePolylineTemp.getPath();

    const center = lastSortedCoords.reduce(calculateCentroid, {
      lat: 0,
      lng: 0
    });

    var a = new google.maps.LatLng(lastSortedCoords[matchIndex].lat, lastSortedCoords[matchIndex].lng);
    path.push(a);

    var b = new google.maps.LatLng(center.lat, center.lng);
    path.push(b);

    let nextIndex = matchIndex + 1;
    if (nextIndex > lastSortedCoords.length - 1) {
      nextIndex = 1;
    }
    var c = new google.maps.LatLng(lastSortedCoords[nextIndex].lat, lastSortedCoords[nextIndex].lng);
    path.push(c);

    groupPolyLines.push(trianglePolylineTemp);

    //once we've drawn our triangle we need to send a signal to others that we've drawn our triangles!
    //then that needs to get embedded in the data that streams to the phone
    //and so if an ID has a marker of being finished we draw a triangle for it
    //(or include it in our triangle if it's adjacent)
  }
}

//Called every time a socket is disconnected
function clearMarkers(numberToClear) {

  // console.log("clear ", numberToClear, " markers");
  // var index = 0;
  // while (index < numberToClear) {
  //   console.log(
  //     "removing marker: "
  //     // groupMarkers[groupMarkers.length - 1].getTitle()
  //   );
  //   if (groupMarkers.length - 1 > 0) {
  //     groupMarkers[groupMarkers.length - 1].setMap(null);
  //     // groupPolyLines.splice(groupMarkers.length-1,1);
  //     groupMarkers.pop();
  //   }
  //   index++;
  //   console.log("total markers : ", groupMarkers.length);
  // }

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

    google.maps.event.addListener(marker, 'mouseup', function(event) {
      console.log("tapping : ", this.getTitle());
      socket.emit("send-tap", this.getTitle());

      drawTapResponse(this.getTitle());

    });

    groupMarkers.push(marker);
    console.log("adding marker, total markers: ", groupMarkers.length);
    index++;
  }

  while(groupMarkers.length > groupCoords.length){

      groupMarkers[groupMarkers.length-1].setMap(null);
      groupMarkers.pop();

      console.log("removing marker, total markers: ", groupMarkers.length);
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
    // groupMarkers[c].setTitle(groupCoords[c].id);
    groupMarkers[c].setTitle(String(groupCoords[c].connectTimestamp));
    //Hide the marker if it's our own sessionId
    // if (groupMarkers[c].getTitle() != sessionID) {
    if (groupMarkers[c].getTitle() != firstConnectTimestamp) {
      groupMarkers[c].setMap(map);
    } else {
      groupMarkers[c].setMap(null);
    }
  }
}

//Start debug drawing functions - Fired on map click - disabled for normal operation
function addLatLng(event) {
  var path = guideLine.getPath();
  path.push(event.latLng);
  // drawLines(guideLine.getPath().getArray());
  drawFixedLines(convertCoordinates(guideLine.getPath().getArray()));
  // drawLines(convertCoordinates(guideLine.getPath().getArray()));
}

function polylineChanged(index) {
  // drawLines(convertCoordinates(guideLine.getPath().getArray()));
  drawFixedLines(convertCoordinates(guideLine.getPath().getArray()));
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
//End debug drawing functions

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
  var dLat = ((lat2 - lat1) * Math.PI) / 180;
  var dLon = ((lon2 - lon1) * Math.PI) / 180;
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
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

  homeMarker.setAnimation(google.maps.Animation.BOUNCE);
  setTimeout(function() {
    homeMarker.setAnimation(null)
  }, 600);

  // var key = "arrival1";
  spriteSound.play(); //key
})

socket.on("clear-markers", function(number) {
  clearMarkers(number)
})

socket.on("receive-timestamp", function(ts) {
  // setCookie("id", id, 1)
  setCookie("timestamp", ts, 1)
  console.log("setting id cookie to : " + ts);
  firstConnectTimestamp = ts;
  // cookieID = id;
});


// if (lastMode === 0 || lastMode === null) {
//   createDialogue("Hello, welcome. A Heart from Space is a tool that allows you to draw shapes with others.")
// }

socket.on("receive-start-status", function(currentMode) {

  console.log("current mode :", currentMode);

  // if (currentMode === 0 && lastMode != currentMode) {
  //   // show dialog
  //
  //   createDialogue("Hello, welcome. First we'll try a making a square. When you think the square is good enough, press the 'Done' button, which will fill your section. When the square is full of colour, we'll receive the next instruction.")
  //
  //   $("#doneSection").html("Done?");
  //   $("#doneSection").css("background-color", "rgb(220,220,220)")
  //
  //   if (trianglePolylineTemp != null) {
  //     trianglePolylineTemp.setMap(null);
  //   }
  //   drawDone = false;
  //
  //
  // } else if (currentMode === 1 && lastMode != currentMode) {
  //   //show dialog to create square
  //   createDialogue("Great! Now let's try to make a circle. When you're happy with the circle, press the 'Done' button.")
  //   // toggleSection();
  //
  //   $("#doneSection").html("Done?");
  //   $("#doneSection").css("background-color", "rgb(220,220,220)")
  //
  //   if (trianglePolylineTemp != null) {
  //     trianglePolylineTemp.setMap(null);
  //   }
  //   drawDone = false;
  //
  //
  // } else if (currentMode === 2 && lastMode != currentMode) {
  //
  //   createDialogue("Lovely! Now let's make our heart. When you're happy with our heart, press the 'Done' button.")
  //   // toggleSection();
  //   $("#doneSection").html("Done?");
  //   $("#doneSection").css("background-color", "rgb(220,220,220)")
  //
  //   if (trianglePolylineTemp != null) {
  //     trianglePolylineTemp.setMap(null);
  //   }
  //   drawDone = false;
  //
  //   //show dialog to create circle
  //
  // } else if (currentMode === 3 && lastMode != currentMode) {
  //   //show dialog to create circle
  //   createDialogue("Thank you for taking part! Take a screenshot and share with #aheartfromspace :)");
  //   // toggleSection();
  //   $("#doneSection").html("Done?");
  //   $("#doneSection").css("background-color", "rgb(220,220,220)")
  //   $("#doneSection").css("visibility", "hidden");
  //   // if (trianglePolylineTemp != null) {
  //   //   trianglePolylineTemp.setMap(null);
  //   // }
  //   drawDone = false;
  //
  // }

  lastMode = currentMode;
  // don't show dialog
  // tryGeolocation();
  // requestDeviceOrientation();

})

function createDialogue(dialogueText) {

  $("#dialog-content").html(dialogueText);
  $("#dialog-content").css("visibility", "visible");
  $("#dialog-message").dialog({
    autoOpen: true,
    modal: true,
    closeOnEscape: true,
    open: function() {
      //Click anywhere to close
      $('.ui-widget-overlay').bind('click', function() {
        $('#dialog-message').dialog('close');
      })
    },
    buttons: {
      "OK": function() {
        $(this).dialog("close");
        // window.location.href = target
        // readyToStart();
        // socket.emit("ready-to-start", true);
        // tryGeolocation();
        // requestDeviceOrientation();
      }
    },
    position: {
      my: "center center",
      at: "center center",
      of: window
    }
  });

  $("#dialog-message").siblings('.ui-dialog-buttonpane').find('button:eq(1)').focus();

}

//Makes sure we request sensor access
//Sometimes the connect function triggers before load is completed?
//so this makes sure that it loads properly
tryGeolocation();
requestDeviceOrientation();

var ct = getCookie("timestamp");
if (ct != null) {
  console.log("has timestamp : " + ct);
  firstConnectTimestamp = ct;
  $("#compassInfo").html(firstConnectTimestamp);
} else {
  console.log("no timestamp saved in cookies ");
  socket.emit("request-timestamp");
}

socket.on('connect', function() {

  var ct = getCookie("timestamp");
  if (ct != null) {
    console.log("has timestamp : " + ct);
    firstConnectTimestamp = ct;
    $("#compassInfo").html(firstConnectTimestamp);
  } else {
    console.log("no timestamp saved in cookies ");
    socket.emit("request-timestamp");
  }

  // clearMarkers();

  socket.emit('new-client', 'mobile')
  sessionID = socket.id;
  console.log("connected", socket.connected, sessionID);
  // $("#compassInfo").html(sessionID);


  tryGeolocation();
  requestDeviceOrientation();

  if (currLatLng != null) {
    socket.emit("update-coordinates", currLatLng);
  }

  // firstSocketID = getCookie("firstsocket");

  // if(firstSocketID == null){
  // setCookie("firstsocket", sessionID, 1);
  // }

  //Get sequential id from cookie
  // var id = getCookie("id");
  // if (id != null) {
  //   console.log("has cookie id: " + id);
  //   cookieID = id;
  // } else {
  //   console.log("has no id : " + id);
  //   socket.emit("request-id");
  // }


});

socket.on("receive-group-coordinates", function(groupCoords) {
  // console.log(groupCoords);
  // drawLines(groupCoords);
  drawFixedLines(groupCoords);

  if (showArrows) {
    drawMarkers(groupCoords);
  }

  checkDoneButton(groupCoords);


});

//These two don't do anything anymore
socket.on("ready-status", function(counts) {
  // console.log(counts);
  // $("#compassInfo").html("Done: " + counts.ready + "/" + counts.users + " Mode: " + lastMode);
});

socket.on("start-next", function(data) {

  console.log("start : ", data);
})

function updateHomeMarkerPosition(position) {
  if (google.maps != null) {
    var latlng = new google.maps.LatLng(
      position.coords.latitude,
      position.coords.longitude
    );
    homeMarker.setPosition(latlng);
  }
}

function updateHomeMarkerRotation(data) {
  compassOrientation = data.z;
  compassOrientation = compassOrientation + 0;
  if (compassOrientation > 360) {
    compassOrientation = compassOrientation - 360;
  }

  if (compassOrientation != lastCompassOrientation) {
    var icon = homeMarker.getIcon();
    icon.rotation = compassOrientation;
    homeMarker.setIcon(icon);

    //Only sending rotation updates with location updates
    socket.emit("update-heading", compassOrientation);
    lastCompassOrientation = compassOrientation;
  }
}

//setup sensor listeners
//// TODO:  detect if ios12 and user needs to turn on sensor access
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

//Function called by async script call at bottom of index.html
function initMap() {
  // var myLatLng = {
  //   lat: -25.363,
  //   lng: 131.044
  // };

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 18,
    // center: {
    //   lat: 45.536384,
    //   lng: -73.628949
    // },
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

  google.maps.event.addListener(guideLine.getPath(), "insert_at", insertAt);
  google.maps.event.addListener(guideLine.getPath(), "remove_at", removeAt);
  google.maps.event.addListener(guideLine.getPath(), "set_at", setAt);

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

  //Turn off self tap because it doesn't make any sense
  // google.maps.event.addListener(homeMarker, 'mouseup', function(event) {
  //   spriteSound.play();
  //
  //   homeMarker.setAnimation(google.maps.Animation.BOUNCE);
  //   setTimeout(function() {
  //     homeMarker.setAnimation(null)
  //   }, 600);
  // });

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
