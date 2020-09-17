var express = require('express')
var path = require('path')
var app = express()
var fs = require('fs')
var useragent = require('express-useragent')
var sslRedirect = require('heroku-ssl-redirect');

require('dotenv').config();


var io = null
var usersList = []
var debugList = []
var groupCoords = [];
var sortList = [];

var savedCoords = [];

var idCounter = 0;
var orderCounter = 0;
var headingChangedFlag = false;
var coordinatesChanged = false;
var currentMode = 0;
var recordCoords = false;

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
  app.use(sslRedirect());
  io = require('socket.io').listen(http);
  http.listen((process.env.PORT || 5000), function() {
    console.log("Node app is running at localhost: " + app.get('port'))
  });
  console.log("production");

}

app.use(express.static('public'));
// app.use(secure);

app.get('/', function(request, response) {
  // response.redirect('/index.html')
  response.sendFile('/public/index.html', {
    "root": __dirname
  })
})

app.get('/view', function(request, response) {
  response.sendFile('/public/view.html', {
    "root": __dirname
  })
})

io.on('connection', function(socket) {
  socket.on("request-timestamp", function() {
    // io.to(this.id).emit("receive-id", idCounter)
    // idCounter += 1;
    //Giving this via server is a bit weird but probably better than getting it from browser as browser can be off depending on timezone of phone maybe?
    io.to(this.id).emit("receive-timestamp", Date.now())

  })

  socket.on("start-record", function(data) {
    recordCoords = true;
    savedCoords = [];
  })

  socket.on("stop-record", function(data) {
    recordCoords = false;
    saveFile(savedCoords);
  })

  //detect new client
  //client is added to list only when it sends some coordinates
  socket.on("new-client", function(data) {

    console.log("new client : ", data);
    // io.to(this.id).emit("receive-start-status", currentMode)
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
      // console.log("removing :" + JSON.stringify(groupCoords[index]))
      console.log("removing ", this.id);

      groupCoords.splice(index, 1)
      // console.log("coord array length : ", groupCoords.length)
      // coordinatesChanged = true;
      io.emit("clear-markers", 1) //groupCoords
      isGroupReady();
    }

  })

  socket.on('send-tap', function(targetSocketId) {

    for (var i = 0; i < groupCoords.length; i++) {
      if (groupCoords[i].connectTimestamp === targetSocketId) {
        io.to(groupCoords[i].id).emit('receive-tap');
        console.log("sending tap to :", groupCoords[i].id);
        // groupCoords[i].done = coords.done
      }
    }

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

  socket.on("draw-triangle", function(state) {
    // var sID = this.id
    var exists = false

    for (var i = 0; i < groupCoords.length; i++) {
      //if we find a match, we update the existing coordinate
      if (groupCoords[i].id === this.id) {
        // groupCoords[i].done = drawDone
        groupCoords[i].ready = state;
        exists = true
      }
    }

    coordinatesChanged = exists;
    console.log("drawing heart for: ", this.id);
    // isGroupReady();
  })

  // socket.on("ready-to-start", function(status) {
  //
  //   console.log("number of active users : ", groupCoords.length);
  //   console.log("receiving : ", status, "from :", this.id);
  //   var sID = this.id
  //   var exists = false
  //
  //   for (var i = 0; i < groupCoords.length; i++) {
  //     //if we find a match, we update the existing coordinate
  //     if (groupCoords[i].id === this.id) {
  //       groupCoords[i].ready = status
  //       exists = true
  //     }
  //   }
  //   console.log("exists: ", exists);
  //
  //   isGroupReady();
  //
  //   //we need to break this into a separate function and then check it
  //   //when the disconnect function is fired.
  //   // we also need to make a note that pops up when people first come to the Websites
  //   // but what happens when they reload?
  //   // maybe this button thing is too much, too complicated
  //   // maybe we just go square -> circle -> heart and use the completion as the next trigger
  //
  //
  //   //If the person hasn't been registered then nothing will happen
  //   //But that is really an edge case
  //
  // })

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
    var existsInDisconnected = false
    for (var i = 0; i < groupCoords.length; i++) {

      //if we find a match, we update the existing coordinate
      //using timestamps means that we update any duplicate markers that are hanging around
      if (groupCoords[i].connectTimestamp === coords.connectTimestamp) {
        groupCoords[i].lat = coords.lat
        groupCoords[i].lng = coords.lng
        groupCoords[i].heading = coords.heading
        // groupCoords[i].currentTimestamp = Date.now()
        // groupCoords[i].done = coords.done
        exists = true
      }
    }

    //If ID doesn't match with existing IDs
    if (exists === false && typeof coords.connectTimestamp != "undefined") {

      var person = {
        id: this.id,
        lat: coords.lat,
        lng: coords.lng,
        connectTimestamp: coords.connectTimestamp,
        heading: coords.heading
        // currentTimestamp: Date.now()
      }
      groupCoords.push(person)
    }

    groupCoords.sort(function(a, b) {
      return parseInt(a.connectTimestamp) - parseInt(b.connectTimestamp)
    });

    if (exists === false) {
      console.log("new addition")
      console.log(groupCoords.length);
      console.log(groupCoords);

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


function isGroupReady() {

  var readyCounter = 0;
  for (var i = 0; i < groupCoords.length; i++) {
    if (groupCoords[i].ready === true) {
      readyCounter++;
    }
  }

  console.log("number of ready users: ", readyCounter, "/", groupCoords.length);
  // console.log(groupCoords);

  //Make sure not just one person can advance the mode selector
  if (readyCounter >= groupCoords.length && groupCoords.length > 1) {

    //clear the ready flags
    currentMode += 1;

    if (currentMode > 1) {

      for (var i = 0; i < groupCoords.length; i++) {
        groupCoords[i].ready = false;
      }

      currentMode = 0;
    }

    console.log("sending :", currentMode);
    io.emit("receive-start-status", currentMode);

  }


  coordinatesChanged = true;

  // console.log("started :", started);

  let counts = {
    users: groupCoords.length,
    ready: readyCounter
  }

  io.emit("ready-status", counts);

}

// function isGroupDone(){
//   var doneCounter = 0;
//   for (var i = 0; i < groupCoords.length; i++) {
//     if (groupCoords[i].done === true) {
//       doneCounter++;
//     }
//   }
//
//   if (doneCounter >= groupCoords.length) {
//
//     //clear the ready flags
//     for (var i = 0; i < groupCoords.length; i++) {
//       groupCoords[i].done = false;
//     }
//
//     started = false;
//     console.log("started : ", started);
//
//     currentMode += 1;
//
//     if(currentMode > 3){
//       currentMode = 0;
//     }
//
//     io.emit("receive-start-status", currentMode);
//     console.log("sending mode: ", currentMode);
//
//
//     // if (!started) {
//     //   io.emit("start-next", true);
//     //   console.log("sending start");
//     //   started = true;
//     // }
//   }
//
// }

function getDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = date.getHours();
  const min = date.getMinutes();
  const sec = date.getSeconds();
  return `${year}${month}${day}-${hour}:${min}:${sec}`
}

function saveFile(data) {

  var name = "recording " + getDateString() + ".json";

  var jsonString = JSON.stringify(data, null, 1)
  fs.writeFile("./" + name, jsonString, (err) => {
    if (err) {
      console.error(err)
      return
    }
    console.log("saved file: ", name);
  })

}

function sendGroupCoordinates() {

  // if (coordinatesChanged) {
    coordinatesChanged = false;
    io.emit("receive-group-coordinates", groupCoords)
    // console.log("coord array length : ", groupCoords.length)
    if (recordCoords) {
      // groupCoords.timestamp = Date.now();
      var timestamp = {timestamp: Date.now()};
      savedCoords.push(timestamp);
      savedCoords.push(groupCoords);
    }
  // }

}

setInterval(sendGroupCoordinates, 500);
