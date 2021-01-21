//Connectivity
var socket = io();

//Map
var map;
var guideLine;

//Drawing
var groupMarkers = [];
var groupPolyLines = []; //Used for triangle drawing
var fixedPolyLine;
var homeMarker;
// var homeMarkerID;

//Sensor variables
var bestAccuracy = 1000;
var hasSensorAccess = false;
var compassOrientation = 0;
var lastCompassOrientation = 0;
var currLatLng = null;

//Operations variables
var showArrows = true;
var sensorsActive = false;
var gpsActive = false;
var sensorsActive = false;
var watchPositionId = null;
var drawDone = false;
var lastMode = null;
var sessionID;
var firstConnectTimestamp;
var roomId = null;
var showInfoPanel = false;

var introData = null;
var introIndex = 0;

// Get room id from URL
const queryParamsString = window.location.search.substr(1);
console.log(queryParamsString);

const queryParams = queryParamsString.split('&').reduce((accumulator, singleQueryParam) => {
  const [key, value] = singleQueryParam.split('=');
  accumulator[key] = value;
  return accumulator;
}, {})

console.log(queryParams.heartid);
if (queryParams.hasOwnProperty("heartid")) {
  roomId = queryParams.heartid;
}


//Icon
var iconParameters = {
  path: "M39.167,30c0,5.062-4.104,9.167-9.166,9.167c-5.063,0-9.167-4.104-9.167-9.167c0-9.125,8.416-18,9.167-18 C30.75,12,39.167,20.875,39.167,30z",
  // path: d="M147.865,84.126c-5.791-4.405-13.443-7.083-21.834-7.083c-8.422,0-16.101,2.698-21.899,7.132l0.031,0.041l21.868-31.583l0,0l21.868,31.583 M126.031,155.469c16.551,0,29.969-13.418,29.969-29.969c0-16.551-13.418-29.969-29.969-29.969c-16.551,0-29.969,13.417-29.969,29.969C96.062,142.051,109.48,155.469,126.031,155.469z",
  strokeWeight: 0,
  strokeColor: "#2A9DD8",
  fillColor: "#2A9DD8",
  fillOpacity: 0.7,
  scale: 0.7,
  // anchor: new google.maps.Point(125, 125), - anchor is set in map.js because it must be a google variable
  rotation: 0
};

//Audio
var spriteSound = new Howl({
  src: ['../audio/Ticket-machine-sound.mp3']
  //,
  // sprite: {
  //   arrival1: [0, 2500],
  //   arrival15: [63000, 2500]
  // }
});


var hasDoneIntro = getCookie("intro-done");
console.log("had done intro: ", hasDoneIntro);

//Frontend Functions
//Start function

// function startSession() {
//
//   $("#introduction").css("display", "none");
//   setup();
//
//   setCookie("intro-done", true, 1)
//
//   centerMap();
//
//   // $("#welcome").css("display", "none")
//   // $("#sensor-setup").css("display", "inline")
//   //
//   // //Hide gps button if we already have access
//   // if(gpsActive){
//   //   $("#sensor-gps").css("display", "none")
//   // }
//   //
//   // if(hasSensorAccess){
//   //   $("#sensor-compass").css("display", "none")
//   // }
// }
//
// function showDoneIntro() {
//   $("#introduction").css("z-index", "1");
//   $("#sensor-setup").css("display", "none");
//   $("#done-button-intro").css("display", "inline");
// }
//
function hideIntroduction() {
  $("#intropanel").css("display", "none");
}
//
// function skipIntro() {
//   $("#introduction").css("display", "none");
//   setup();
//   centerMap();
// }
//Utility Functions

//Set cookie
function setCookie(c_name, value, exdays) {
  var exdate = new Date();
  exdate.setDate(exdate.getDate() + exdays);
  var c_value =
    escape(value) + (exdays == null ? "" : "; expires=" + exdate.toUTCString());
  document.cookie = c_name + "=" + c_value;
}

//Retrieve cookie
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

//Request timestamp
function requestTimestamp() {
  var ct = getCookie("timestamp");
  if (ct != null) {
    console.log("has timestamp : " + ct);
    //Read the value as numeric - mix between numeric and non-numeric values was causing issues
    firstConnectTimestamp = +ct;
    $("#compassInfo").html(firstConnectTimestamp);
  } else {
    console.log("no timestamp saved in cookies ");
    // socket.emit("request-timestamp");
    firstConnectTimestamp = Date.now();
    setCookie("timestamp", firstConnectTimestamp, 1)
    console.log("saving timestamp : ", firstConnectTimestamp);
  }
}


function loadIntroData(){
  $.getJSON('../local-sequences/intro.json', function(obj) {
    // console.log(obj)
    introData = obj
    console.log("Succesfully read intro sequence - n instructions: " + obj.length)

    advanceIntro();

  });

}

function processClick(){
  if(introData[introIndex-1].buttonfunction === "activateSensors"){
    activateSensors();
    advanceIntro();
    console.log("activating sensors");
  }else if(introData[introIndex-1].buttonfunction === "advanceIntro"){
    advanceIntro();
    console.log("advanceIntro");
  }else if(introData[introIndex-1].buttonfunction === "testSound"){
    // drawHomeTap();
    advanceIntro();
    console.log("testSound");
  }else if(introData[introIndex-1].buttonfunction === "closeIntro"){
    hideIntroduction();
    advanceIntro();
    console.log("close");
  }
}

function advanceIntro(){

  if(introIndex < introData.length){

  console.log(introData[introIndex].engtext);
  $("#introtext").html(introData[introIndex].engtext);
  $("#introbutton").html(introData[introIndex].buttontext);

  introIndex += 1;
  if(introIndex > introData.length){
    introIndex = 0;
  }
  // introIndex += 1;
  // if(introIndex > introData.length){
  //   introIndex = 0;
  // }
  }
}

//Create dialogue
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


// function readyToStart(){
//   //remove ready dialogue
//   socket.emit("ready-to-start", true);
// }

//Activate Compass
// function toggleSensorsButton() {
//   if (!sensorsActive) {
//     requestDeviceOrientation();
//     $("#activateSensors").html("Sensors On");
//   }
//   // else{
//   //   $("#activateSensors").html("Activate Sensors");
//   // }
//   // sensorsActive = !sensorsActive;
//   sensorsActive = true;
// }
//
// //Activate GPS
// function toggleGPSButton() {
//   if (!gpsActive) {
//     tryGeolocation();
//     $("#activateGPS").html("GPS On");
//     centerMap();
//     gpsActive = true;
//
//     showDoneIntro();
//   }
//   // else{
//   //   $("#activateGPS").html("Activate GPS");
//   // }
//   // gpsActive = !gpsActive;
// }

//Done button - triggers triangle drawing when done.
function toggleDone() {
  console.log(drawDone)
  if (!drawDone) {
    // drawTriangle();
    // $("#doneSection").html("Done");
    $("#doneIcon").attr("src", "/images/heart-button.png")
    // $("#doneSection").css("background-color", "rgb(180,260,180)")
    // socket.emit("draw-triangle", true)
    // drawDone = true;
    // socket.emit("draw-triangle", true)
    // socket.emit("update-done-status", true)
    socket.emit("update-done-status", true)


  } else {
    // $("#doneSection").html("Done");
    $("#doneIcon").attr("src", "/images/heart-button-blank-trans.png")
    // $("#doneSection").css("background-color", "rgb(220,220,220)")
    //Not used
    // if (trianglePolylineTemp != null) {
    //   trianglePolylineTemp.setMap(null);
    //   console.log("clearing triangle");
    // }
    socket.emit("update-done-status", false)
  }
  drawDone = !drawDone;
}

//This function was to make sure that the done button is always showing the correct status
function checkDoneButton(groupCoords) {
  // for (var i = 0; i < groupCoords.length; i++) {
  //   if (groupCoords[i].connectTimestamp === firstConnectTimestamp) {
  //     if (groupCoords[i].ready) {
  //       $("#doneSection").html("Done");
  //       $("#doneSection").css("background-color", "rgb(180,260,180)")
  //     } else {
  //       $("#doneSection").html("Done");
  //       $("#doneSection").css("background-color", "rgb(220,220,220)")
  //     }
  //   }
  // }
}

//Called when socket connects
function setup() {

  requestTimestamp();
  // clearMarkers();

  socket.emit('new-client', 'mobile')
  sessionID = socket.id;
  console.log("connected", socket.connected, sessionID);
  // $("#compassInfo").html(sessionID);

  tryGeolocation();
  requestDeviceOrientation();

  if (currLatLng != null && firstConnectTimestamp != null) {
    socket.emit("update-coordinates", currLatLng);
  }
}

//Welcome dialogue stuff not currently used
// if (lastMode === 0 || lastMode === null) {
//   createDialogue("Hello, welcome. A Heart from Space is a tool that allows you to draw shapes with others.")
// }

function showDialogue(currentMode) {

  if (currentMode === 0 && lastMode != currentMode) {
    // show dialog

    createDialogue("Hello, welcome. First we'll try a making a square. When you think the square is good enough, press the 'Done' button, which will fill your section. When the square is full of colour, we'll receive the next instruction.")

    $("#doneSection").html("Done?");
    $("#doneSection").css("background-color", "rgb(220,220,220)")

    if (trianglePolylineTemp != null) {
      trianglePolylineTemp.setMap(null);
    }
    drawDone = false;


  } else if (currentMode === 1 && lastMode != currentMode) {
    //show dialog to create square
    createDialogue("Great! Now let's try to make a circle. When you're happy with the circle, press the 'Done' button.")
    // toggleSection();

    $("#doneSection").html("Done?");
    $("#doneSection").css("background-color", "rgb(220,220,220)")

    if (trianglePolylineTemp != null) {
      trianglePolylineTemp.setMap(null);
    }
    drawDone = false;


  } else if (currentMode === 2 && lastMode != currentMode) {

    createDialogue("Lovely! Now let's make our heart. When you're happy with our heart, press the 'Done' button.")
    // toggleSection();
    $("#doneSection").html("Done?");
    $("#doneSection").css("background-color", "rgb(220,220,220)")

    if (trianglePolylineTemp != null) {
      trianglePolylineTemp.setMap(null);
    }
    drawDone = false;

    //show dialog to create circle

  } else if (currentMode === 3 && lastMode != currentMode) {
    //show dialog to create circle
    createDialogue("Thank you for taking part! Take a screenshot and share with #aheartfromspace :)");
    // toggleSection();
    $("#doneSection").html("Done?");
    $("#doneSection").css("background-color", "rgb(220,220,220)")
    $("#doneSection").css("visibility", "hidden");
    // if (trianglePolylineTemp != null) {
    //   trianglePolylineTemp.setMap(null);
    // }
    drawDone = false;

  }

  lastMode = currentMode;
  // don't show dialog
  // tryGeolocation();
  // requestDeviceOrientation();
}

//Socket Communication

// socket.on('connect', function() {
//   // setup();
//   tryGeolocation();
//   requestDeviceOrientation();
//
// });


socket.on("connect", function() {

  sessionID = socket.id;
  console.log("connected", socket.connected, sessionID);
  socket.emit("new-client", "mobile");
  // tryGeolocation();
  // requestDeviceOrientation();
  loadIntroData();

  var url = window.location.origin;
  $("#rooms-list").html("<a href="+url+"/heart.html?heartid="+sessionID+">"+url+"/heart.html?heartid="+sessionID+"</a>")
  //   $("#rooms-list").html(
  //     rooms.map((id) =>
  //       sessionID === id ?
  //       `<div>${sessionID}</div><div></div>` :
  //       `<div>${id}</div><button onclick="join('${id}')">Join</button>`
  //     )
  //     .join("")
  //   );

  if (currLatLng != null) {
    socket.emit("update-coordinates", currLatLng);
  }

});



// var rooms = [];
//
// function displayRooms() {
//   $("#rooms-list").html(
//     rooms.map((id) =>
//       sessionID === id ?
//       `<div>${id}</div><div></div>` :
//       `<div>${id}</div><button onclick="join('${id}')">Join</button>`
//     )
//     .join("")
//   );
// }
//
// function join(id) {
//   socket.emit("room-join", id);
//   sessionID = id;
//   // displayRooms();
// }
//
// function check() {
//   socket.emit("room-check");
// }
//
// socket.on("room-msg", function() {
//   console.log("room-msg");
// });
//
// socket.on("room-list", function(list) {
//   rooms = list;
//   displayRooms();
// });
//
// socket.on("room-add", function(room) {
//   console.log("room-add", room);
//   rooms.push(room);
//   displayRooms();
// });
//
// socket.on("room-delete", function(room) {
//   console.log("room-delete", room);
//   rooms = rooms.filter((r) => r !== room);
//   displayRooms();
// });



socket.on("receive-tap", function() {
  drawHomeTap();
})

// socket.on("receive-timestamp", function(ts) {
//   // I suppose sometimes the timestamp might not be set before we send off a packet of data, maybe that's a problem?
//   setCookie("timestamp", ts, 1)
//   console.log("setting id cookie to : " + ts);
//   firstConnectTimestamp = ts;
//
// });

socket.on("receive-start-status", function(currentMode) {

  console.log("current mode :", currentMode);
  showDialogue(currentMode);
})

socket.on("receive-group-coordinates", function(groupCoords) {

  // console.log(groupCoords);

  drawLines(groupCoords);
  if (showArrows) {
    drawMarkers(groupCoords);
  }
  checkDoneButton(groupCoords);

});

//Display any errors that come up
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

//Called when browser loads
requestTimestamp();

if (queryParams.hasOwnProperty("heartid")) {
  roomId = queryParams.heartid;


  console.log("requestion join :", queryParams.heartid);
  // join(queryParams.heartid);
  // hideIntroduction();
}

function toggleHelp(){
  showInfoPanel = !showInfoPanel;
  if(showInfoPanel){
    // $("#helppanel").css("overflow", "scroll");
    $("#helppanel").css("display", "block");
    $("#aboutIcon").attr("src", "/images/close_dot.png");
  }else{
    // $("#infopanel").css("overflow", "auto");
    $("#helppanel").css("display", "none");
    $("#aboutIcon").attr("src", "/images/help_dot.png");

  }
}

function activateSensors(){
  //Call these only when we have done the tutorial
  tryGeolocation();
  //Call this before tutorial to check if it's necessary
  requestDeviceOrientation();
  // hideIntroduction();
  // $("#sensor-start").css("visibility","hidden");
}

//Call these only when we have done the tutorial
// tryGeolocation();
//Call this before tutorial to check if it's necessary
// requestDeviceOrientation();
