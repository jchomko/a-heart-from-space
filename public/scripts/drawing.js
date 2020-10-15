// Original line drawing function that requires untangling
function drawLines(groupCoords) {

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

function drawHomeTap(){

  if (window.navigator.vibrate) {
    window.navigator.vibrate(500);
  }

  homeMarker.setAnimation(google.maps.Animation.BOUNCE);
  setTimeout(function() {
    homeMarker.setAnimation(null)
  }, 600);

  // var key = "arrival1";
  spriteSound.play(); //key
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

function drawMarkers(groupCoords) {

  var index = 0;
  while (groupMarkers.length < groupCoords.length) {

    // var image = {
    //   // path: "M39.167,30c0,5.062-4.104,9.167-9.166,9.167c-5.063,0-9.167-4.104-9.167-9.167c0-9.125,8.416-18,9.167-18 C30.75,12,39.167,20.875,39.167,30z",
    //   url: '../images/g_marker.svg',
    //   strokeWeight: 2,
    //   fillColor: "#919191",
    //   strokeColor: "#919191",
    //   fillOpacity: 1.0,
    //   scale: 0.75,
    //   anchor: new google.maps.Point(30, 30)
    //   // rotation: groupCoords[c].heading
    // };

    var marker = new google.maps.Marker({
      icon: iconParameters
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

  while (groupMarkers.length > groupCoords.length) {

    groupMarkers[groupMarkers.length - 1].setMap(null);
    groupMarkers.pop();

    console.log("removing marker, total markers: ", groupMarkers.length);
  }


  iconParameters.strokeColor = "#919191";
  iconParameters.fillColor = "#919191";

  //cycle through list of incoming coords
  for (var c = 0; c < groupCoords.length; c++) {

    iconParameters.rotation = groupCoords[c].heading;

    //Get new coordinate
    var lat = groupCoords[c].lat;
    var lng = groupCoords[c].lng;
    var latlng = new google.maps.LatLng(lat, lng);

    //Set marker position
    groupMarkers[c].setPosition(latlng);
    groupMarkers[c].setIcon(iconParameters);
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

function updateHomeMarkerPosition(position) {
  if(google){ //if google maps is loaded 
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

  //Only update if there has been a change
  if (compassOrientation != lastCompassOrientation) {
    var icon = homeMarker.getIcon();
    icon.rotation = compassOrientation;
    homeMarker.setIcon(icon);
    // console.log(compassOrientation)
    socket.emit("update-heading", compassOrientation);
    lastCompassOrientation = compassOrientation;
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
