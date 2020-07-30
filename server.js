var express = require('express')
var path = require('path')
var app = express()
var fs = require('fs')
var useragent = require('express-useragent')
require('dotenv').config();


var io = null
var usersList = []
var debugList = []
var groupCoords = [];
var idCounter = 0;
var headingChangedFlag = false;
var coordinatesChanged = false;



//Development section
if (process.env.NODE_ENV != 'production') {
  var https = require('https').createServer({
    key: fs.readFileSync('localhost+4-key.pem'),
    cert: fs.readFileSync('localhost+4.pem'),
    requestCert: false,
    rejectUnauthorized: false
  }, app);
  io = require('socket.io').listen(https);
  https.listen((process.env.PORT || 5000), function() {
    console.log("Node app is running at localhost: " + app.get('port'))
  });
  console.log("development")

} else {

  var http = require('http').createServer(app);
  io = require('socket.io').listen(http);
  http.listen((process.env.PORT || 5000), function() {
    console.log("Node app is running at localhost: " + app.get('port'))
  });
  console.log("production");

}

app.use(express.static('public'));

app.get('/', function(request, response) {
  // response.redirect('/index.html')
  response.sendFile('/public/index.html', {
    "root": __dirname
  })
})



io.on('connection', function(socket) {

  socket.on("request-id", function() {
    io.to(this.id).emit("receive-id", idCounter)
    idCounter += 1;
  })

  //detect new client
  //client is added to list only when it sends some coordinates
  socket.on("new-client", function(data) {
    console.log("new client : ", data);
  })

  //this happens automatically when the socket connection breaks
  socket.on('disconnect', function() {

    var exists = false
    var index = -1

    for (var i = 0; i < groupCoords.length; i++) {
      //if we find a match
      if (groupCoords[i].id === this.id) {
        exists = true
        index = i
      }
    }

    //if we have a match
    //remove that match from the list of coordinates
    if (exists == true) {
      console.log("removing :" + JSON.stringify(groupCoords[index]))
      groupCoords.splice(index, 1)
      // console.log("coord array length : ", groupCoords.length)
      // coordinatesChanged = true;
      io.emit("clear-markers", 1) //groupCoords

    }

  })

  socket.on('send-tap', function(targetSocketId) {
    io.to(targetSocketId).emit('receive-tap');
    console.log("sending tap to :", targetSocketId);
  })

  socket.on('addclient', function() {
    //If user doesn't already exist
    if (usersList.indexOf(this.id) == -1) {
      //Add user to our list of users
      usersList.push(this.id)
      console.log("adding client back to list: ", this.id, " - updated list: ", usersList)
      //reply only to user with their ID
      io.to(this.id).emit("client-id", usersList.indexOf(this.id))
      //Client already exists in our list
    } else {
      console.log("Client Already Exists: ", this.id)
    }

  })

  socket.on("draw-triangle", function(drawDone){
    var sID = this.id
    var exists = false

    for (var i = 0; i < groupCoords.length; i++) {
      //if we find a match, we update the existing coordinate
      if (groupCoords[i].id === this.id) {
        groupCoords[i].done = drawDone
        exists = true
      }
    }
    coordinatesChanged = true;
  })

  socket.on("ready-to-start", function(status){

    console.log("number of active users : ", groupCoords.length, );
    var sID = this.id
    var exists = false

    for (var i = 0; i < groupCoords.length; i++) {
      //if we find a match, we update the existing coordinate
      if (groupCoords[i].id === this.id) {
        groupCoords[i].ready = status
        exists = true
      }
    }
    var readyCounter = 0;
    for (var i = 0; i < groupCoords.length; i++) {
      if(groupCoords[i].ready === true){
        readyCounter ++;
      }
    }

    console.log("number of ready users: ", readyCounter);

    //we need to break this into a separate function and then check it
    //when the disconnect function is fired
    
    //If the person hasn't been registered then nothing will happen
    //But that is really an edge case

  })

  socket.on("update-heading", function(heading) {
    var sID = this.id
    var exists = false

    for (var i = 0; i < groupCoords.length; i++) {
      //if we find a match, we update the existing coordinate
      if (groupCoords[i].id === this.id) {
        groupCoords[i].heading = heading
        exists = true
      }
    }

    // coordinatesChanged = true;
    //Update happens on timer now
    // if (exists) {
    // io.emit("receive-group-coordinates", groupCoords)
    // }
  })

  //Receive coordinates from each participant and add them to our list
  socket.on("update-coordinates", function(coords) {

    var sID = this.id
    var formattedCoords = JSON.stringify(coords)
    // console.log("received: " + formattedCoords + ", " + sID)

    //If we don't have this ID already
    var exists = false
    for (var i = 0; i < groupCoords.length; i++) {

      //if we find a match, we update the existing coordinate
      if (groupCoords[i].id === this.id) {
        groupCoords[i].lat = coords.lat
        groupCoords[i].lng = coords.lng
        groupCoords[i].heading = coords.heading
        groupCoords[i].done = coords.done
        exists = true
      }
    }

    //If ID doesn't match with existing IDs
    if (exists == false) {
      var person = {
        id: this.id,
        lat: coords.lat,
        lng: coords.lng,
        seqentialID: coords.seqentialID,
        heading: coords.heading,
        done: coords.done
      }
      groupCoords.push(person)
    }

    //Sending coordinates on an interval timer
    // io.emit("receive-group-coordinates", groupCoords)
    coordinatesChanged = true;
  })

  // socket.on("draw-triangle", function(state) {
  //
  //
  // })
})


function sendGroupCoordinates() {
  if (coordinatesChanged) {
    coordinatesChanged = false;
    io.emit("receive-group-coordinates", groupCoords)
    // console.log("coord array length : ", groupCoords.length)
  }
}

setInterval(sendGroupCoordinates, 150);
