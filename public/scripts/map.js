//Function called by async script call at bottom of index.html
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 18,
    disableDefaultUI: true,
    mapTypeId: 'roadmap',
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

  map.setTilt(0);

  //Uncomment below for debugging mode - add 'location' points with mouse click
  // guideLine = new google.maps.Polyline({
  //   strokeColor: "#989898",
  //   strokeOpacity: 0.1,
  //   strokeWeight: 5,
  //   editable: true
  //   // draggable: true
  // });
  //
  // guideLine.setMap(map);
  // google.maps.event.addListener(guideLine.getPath(), "insert_at", insertAt);
  // google.maps.event.addListener(guideLine.getPath(), "remove_at", removeAt);
  // google.maps.event.addListener(guideLine.getPath(), "set_at", setAt);
  // map.addListener("click", addLatLng);

  fixedPolyLine = new google.maps.Polyline({
    strokeColor: "#f70000",
    strokeOpacity: 1,
    strokeWeight: 5
  });

  fixedPolyLine.setMap(map);

  iconParameters.anchor = new google.maps.Point(30,30);

  homeMarker = new google.maps.Marker({
    title: "Home",
    icon: iconParameters
  });

  homeMarker.setMap(map);
  
}

function centerMap() {
  map.panTo(new google.maps.LatLng(currLatLng.lat, currLatLng.lng));
}



//Uncomment for debug drawing function
// function addLatLng(event) {
//   var path = guideLine.getPath();
//   path.push(event.latLng);
//   drawLines(convertCoordinates(guideLine.getPath().getArray()));
// }
//
// function polylineChanged(index) {
//   // drawLines(convertCoordinates(guideLine.getPath().getArray()));
//   drawLines(convertCoordinates(guideLine.getPath().getArray()));
//   // drawLines(guideLine.getPath().getArray());
//   // console.log("drawing lines : ", guideLine.getPath().getArray());
// }
//
// function insertAt(index) {
//   if (guideLine.getPath().length - index !== 1) {
//     polylineChanged();
//   }
// }
//
// function removeAt(index) {
//   polylineChanged();
// }
//
// function setAt(index) {
//   polylineChanged();
// }
// function convertCoordinates(coordsToConvert) {
//   var formattedCoords = [];
//   for (var i = 0; i < coordsToConvert.length; i++) {
//     var formattedCoord = {
//       lat: coordsToConvert[i].lat(),
//       lng: coordsToConvert[i].lng()
//     };
//     formattedCoords.push(formattedCoord);
//   }
//   return formattedCoords;
// }
