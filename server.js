var express = require('express')
var path = require('path')
var app = express()
var fs = require('fs')
var useragent = require('express-useragent')
var sslRedirect = require('heroku-ssl-redirect');
app.engine('pug', require('pug').__express)
var url = require('url');

require('dotenv').config();

var io = null
var usersList = []
var debugList = []
var groupCoords = [];
var sortList = [];

var savedCoordsString = "";
var idCounter = 0;
var orderCounter = 0;
var headingChangedFlag = false;
var coordinatesChanged = false;
var currentMode = 0;
var recordCoords = false;

var playbackIndex = 0;
var playbackInterval = "";

//Development config
if (process.env.NODE_ENV != 'production') {
  app.use(useragent.express())
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

  //Production config
} else {

  var http = require('http').createServer(app);
  app.use(useragent.express())
  app.use(sslRedirect());
  io = require('socket.io').listen(http);
  http.listen((process.env.PORT || 5000), function() {
    console.log("Node app is running at localhost: " + app.get('port'))
  });
  console.log("production");
}

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

app.get("/", function(request, response) {

  // const queryObject = url.parse(request.url,true).query;
  // console.log(queryObject);
  // if(Object.keys(request.query).length > 0){
  //   if(request.query.hasOwnProperty("heartid")){
  //     joinRoom(request.query.heartid)
  //     console.log("joining room")
  //     response.sendFile("/public/heart.html", {
  //       root: __dirname,
  //     });
  //   }else{
  //     console.log("no room to join, inputs are: ", request.query)
  //     response.sendFile("/public/index.html", {
  //       root: __dirname,
  //     });
  //   }
  // }

  response.sendFile("/public/index.html", {
    root: __dirname,
  });
  // response.redirect('/index.html')

});



var sessions = [];

io.on("connection", function(socket) {
  console.log("connected", socket.id);

  sessions.push({
    id: socket.id,
    users: [socket.id]
  });
  // io.to(socket.id).emit("room-list", rooms);

  socket.emit(
    "room-list",
    sessions.reduce((acc, cur) => {
      acc.push(cur.id);
      return acc;
    }, [])
  );

  socket.broadcast.emit("room-add", socket.id);

  socket.on("request-id", function() {
    io.to(this.id).emit("receive-id", idCounter);
    idCounter += 1;
  });

  socket.on("room-join", function(newSession) {
    // var rooms = Object.keys(this.rooms);
    // socket.leave(rooms[0]);
    //can't break out this function from the socket
    //better to do it on the frontend
    // joinRoom(newSession);
    // function joinRoom(newSession){
    for (var i = 0; i < sessions.length; i++) {
      // see if user is already in the list
      var userIndex = sessions[i].users.findIndex((u) => u === socket.id);
      //if we have an index
      if (userIndex !== -1) {
        //remove user from current session
        sessions[i].users.splice(userIndex, 1);
        //leave session
        socket.leave(sessions[i].id, () => {
          //join new session
          socket.join(newSession, () => {
            //delete old session if empty
            if (sessions[i].users.length === 0) {
              //probably don't need both of those
              socket.broadcast.emit("room-delete", sessions[i].id);
              socket.emit("room-delete", sessions[i].id);
              //remove session from list
              sessions.splice(i, 1);
            }

            //add new user to the new session
            var sessionIndex = sessions.findIndex((s) => s.id === newSession);
            if (sessionIndex != -1) {
              sessions[sessionIndex].users.push(socket.id);
              console.log("joined session:", sessions[sessionIndex]);
            } else {
              sessions.push({
                id: newSession,
                users: [socket.id]
              })
              console.log("created new session:", newSession);

            }
            // rooms = Object.keys(socket.rooms);
            // console.log("room joined", rooms[0]);
            // io.to("room 237").emit("a new user has joined the room"); // broadcast to everyone in the room
          });
        });
        break;
      }
    }
    // }

  });

  socket.on("room-check", function() {
    // var rooms = Object.keys(this.rooms);
    // console.log("room-check:", rooms[0]);
    // socket.to(rooms[0]).emit("room-msg");
    for (var i = 0; i < sessions.length; i++) {
      var userIndex = sessions[i].users.findIndex((u) => u === socket.id);
      if (userIndex !== -1) {
        socket.to(sessions[i].id).emit("room-msg");
      }
    }
  });

  //client is added to list only when it sends some coordinates
  /*socket.on("new-client", function(data) {
    console.log("new client");
    // io.to(this.id).emit("receive-start-status", started)
  })*/

  //this happens automatically when the socket connection breaks
  socket.on("disconnect", function() {
    /*var roomIndex = sessions.indexOf(this.id);
    if (roomIndex !== -1) {
      rooms.splice(roomIndex, 1);
      socket.broadcast.emit("room-delete", this.id);
    }*/
    console.log("disconnect", socket.id);
    for (var i = 0; i < sessions.length; i++) {
      var userIndex = sessions[i].users.findIndex((u) => u === socket.id);
      if (userIndex !== -1) {
        sessions[i].users.splice(userIndex, 1);
        if (sessions[i].users.length === 0) {
          socket.broadcast.emit("room-delete", sessions[i].id);
          socket.emit("room-delete", sessions[i].id);
          sessions.splice(i, 1);
        }
        break;
      }
    }

    var exists = false;
    var index = -1;

    for (var i = 0; i < groupCoords.length; i++) {
      //if we find a match
      if (groupCoords[i].id === this.id) {
        exists = true;
        index = i;
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
      // io.emit("clear-markers", 1) //groupCoords
      isGroupReady();
    } else {
      console.log("disconnect called but id not found - already removed")
    }
  })

  socket.on('send-tap', function(target) {
    console.log("send tap :", target)
    for (var i = 0; i < groupCoords.length; i++) {
      if (groupCoords[i].connectTimestamp == target) {
        io.to(groupCoords[i].id).emit('receive-tap');
        console.log("sending tap to :", groupCoords[i].connectTimestamp);
        // groupCoords[i].done = coords.done
      }
    }

  })

  socket.on("addclient", function() {
    //If user doesn't already exist
    if (usersList.indexOf(this.id) == -1) {
      //Add user to our list of users
      usersList.push(this.id);
      console.log(
        "adding client back to list: ",
        this.id,
        " - updated list: ",
        usersList
      );
      //reply only to user with their ID
      io.to(this.id).emit("client-id", usersList.indexOf(this.id));
      //Client already exists in our list
    } else {
      console.log("Client Already Exists: ", this.id);
    }
  })

  socket.on("update-done-status", function(state) {
    // var sID = this.id
    var exists = false

    for (var i = 0; i < groupCoords.length; i++) {
      //if we find a match, we update the existing coordinate
      if (groupCoords[i].id === this.id) {
        // if (groupCoords[i].connectTimestamp === targetSocketId) {
        // groupCoords[i].done = drawDone
        groupCoords[i].ready = state;
        exists = true
      }
    }

    coordinatesChanged = exists;
    console.log("drawing heart for: ", this.id);
    // isGroupReady();
  })

  socket.on("start-playback", function(filename) {

    var fileData;
    var filePath = path.join(__dirname, '/public/logs/' + filename)
    fs.readFile(filePath, {
      encoding: 'utf-8'
    }, function(err, rawData) {
      if (!err) {
        sequenceIndex = 0;
        playbackIndex = 0;
        fileData = JSON.parse(rawData)
        console.log("Succesfully read " + filename + ", instructions: " + fileData.length)
      } else {
        console.log(err)
      }
    })

    if (playbackInterval != null) {
      clearInterval(playbackInterval);
      playbackInterval = setInterval(function() {
        socket.emit('receive-group-coordinates-playback', fileData[playbackIndex]);
        console.log(playbackIndex);
        playbackIndex++;
        if (playbackIndex > fileData.length) {
          // playbackIndex= 0;
          clearInterval(playbackInterval);
        }
      }, 500) //250 for oct 22, 500 for oct 9
    }

    //Load file
    //Start output to render window, loading json file and sending to frontend
    //Set callback to advance index and load next file

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
      if (JSON.stringify(groupCoords[i].id) === JSON.stringify(this.id)) {
        groupCoords[i].heading = heading
        groupCoords[i].currentTimestamp = Date.now()
        exists = true
      }
    }
    coordinatesChanged = true;
  })

  //Receive coordinates from each participant and add them to our list
  socket.on("update-coordinates", function(coords) {
    var sID = this.id;
    var formattedCoords = JSON.stringify(coords);
    console.log("received: " + formattedCoords + ", " + sID)

    //If we don't have this ID already
    var exists = false
    var existsInDisconnected = false
    var inactiveIds = []


    // for (var i = 0; i < sessions.length; i++) {
    //   // see if user is already in the list
    //   var userIndex = sessions[i].users.findIndex((u) => u === socket.id);
    //   //if we have an index
    //   if (userIndex !== -1) {
    //     //remove user from current session
    //     sessions[i].users.splice(userIndex, 1);
    //     //leave session
    //     socket.leave(sessions[i].id, () => {
    //       //join new session
    //       socket.join(newSession, () => {
    //         //delete old session if empty
    //         if (sessions[i].users.length === 0) {
    //           //probably don't need both of those
    //           socket.broadcast.emit("room-delete", sessions[i].id);
    //           socket.emit("room-delete", sessions[i].id);
    //           //remove session from list
    //           sessions.splice(i, 1);
    //         }
    //
    //         //add new user to the new session
    //         var sessionIndex = sessions.findIndex((s) => s.id === newSession);
    //         if (sessionIndex != -1) {
    //           sessions[sessionIndex].users.push(socket.id);
    //           console.log("joined session:", sessions[sessionIndex]);
    //         } else {
    //           sessions.push({
    //             id: newSession,
    //             users: [socket.id]
    //           })
    //           console.log("created new session:", newSession);
    //
    //         }
    //         // rooms = Object.keys(socket.rooms);
    //         // console.log("room joined", rooms[0]);
    //         // io.to("room 237").emit("a new user has joined the room"); // broadcast to everyone in the room
    //       });
    //     });
    //     break;
    //   }
    // }

    if (coords.roomid != null) {
      var sessionIndex = sessions.findIndex((s) => s.id === coords.roomid);
      if (sessionIndex != -1) {
        for (var i = 0; i < sessions[sessionIndex].users.length; i++) {
          if (sessions[sessionIndex].users[i].connectTimestamp === coords.connectTimestamp) {
            sessions[sessionIndex].users[i].lat = coords.lat;
            sessions[sessionIndex].users[i].lng = coords.lng;
            sessions[sessionIndex].users[i].heading = coords.heading;
            sessions[sessionIndex].users[i].currentTimestamp = Date.now();
            exists = true;
            break;
          }
        }

        //add new element to session
        if (exists === false && typeof coords.connectTimestamp != "undefined") {
          var person = {
            id: this.id,
            lat: coords.lat,
            lng: coords.lng,
            connectTimestamp: coords.connectTimestamp,
            heading: coords.heading,
            currentTimestamp: Date.now()
          }
          sessions[sessionIndex].users.push(person)

          //we need to sort these users as well now
          //Untangle group
          const center = sessions[sessionIndex].users.reduce(calculateCentroid, {
            lat: 0,
            lng: 0
          });

          const angles = sessions[sessionIndex].users.map(({
            lat,
            lng,
            id,
            ready,
            currentTimestamp,
            connectTimestamp,
            roomid
          }) => {
            return {
              lat,
              lng,
              id,
              ready,
              currentTimestamp,
              connectTimestamp,
              roomid,
              angle: Math.atan2(lat - center.lat, lng - center.lng) * 180 / Math.PI
            };
          });

          // let groupCoordsSorted = angles.sort(sortByAngle);
          sessions[sessionIndex].users = angles.sort(sortByAngle);
        }

        //If we haven't found the room in our list of sessions
      } else {

        //add new session with current user's id, and add user to the list
        sessions.push({
          id: coords.roomid,
          users: [coords.roomid]
        })

        //find index of session (coudl just do last item in list)
        var sessionIndex = sessions.findIndex((s) => s.id === coords.roomid);

        //add user to new session
        var person = {
          id: this.id,
          lat: coords.lat,
          lng: coords.lng,
          connectTimestamp: coords.connectTimestamp,
          heading: coords.heading,
          currentTimestamp: Date.now()
        }
        //push user in to new session
        sessions[sessionIndex].users.push(person)
        console.log("created new session:");
      }



    }

    // for (var i = 0; i < groupCoords.length; i++) {
    //   //if we find a match, we update the existing coordinate
    //   //using timestamps means that we update any duplicate markers that are hanging around
    //   // if (JSON.stringify(groupCoords[i].connectTimestamp) === JSON.stringify(coords.connectTimestamp)) {
    //   if (groupCoords[i].connectTimestamp === coords.connectTimestamp) {
    //
    //     groupCoords[i].lat = coords.lat
    //     groupCoords[i].lng = coords.lng
    //     groupCoords[i].heading = coords.heading
    //     groupCoords[i].currentTimestamp = Date.now()
    //     // groupCoords[i].done = coords.done
    //     exists = true
    //   }
    //
    //   //check all coordinates to see if they're fresh, remove if older than 25 seconds
    //   //commented for testing purposes
    //   // if (Date.now() - groupCoords[i].currentTimestamp > 25000) {
    //   //   console.log(Date.now() - groupCoords[i].currentTimestamp)
    //   //   inactiveIds.push(i);
    //   // }
    // }
    //
    // //Remove any inactive ids
    // // if (inactiveIds.length > 0) {
    // //   for (var i = 0; i < inactiveIds.length; i++) {
    // //
    // //     //It's not a good idea to actually remove the coordinate unless the socket is broken
    // //     //
    // //     console.log("removing inactive user: ", inactiveIds[i]);
    // //     groupCoords.splice(inactiveIds[i], 1)
    // //     // io.emit("clear-markers", 1)
    // //   }
    // //   inactiveIds = [];
    // // }
    //
    // //If ID doesn't match with existing IDs, we add a new entry
    // if (exists === false && typeof coords.connectTimestamp != "undefined") {
    //   var person = {
    //     id: this.id,
    //     lat: coords.lat,
    //     lng: coords.lng,
    //     connectTimestamp: coords.connectTimestamp,
    //     heading: coords.heading,
    //     currentTimestamp: Date.now()
    //   }
    //   groupCoords.push(person)
    // }
    //
    // //Sort coordinates so they're always in the same order - for untangling
    // // groupCoords.sort(function(a, b) {
    // //   return parseInt(a.connectTimestamp) - parseInt(b.connectTimestamp)
    // // });
    //
    // //Sort coords by angle to centroid - no untangling required
    // //This should maybe be called with a button press
    // //In the current setup it will be called whenever someone reloads
    // //If someone reloads and their dot is far away, it will mess things up!
    // //We probably need an 'untangle' button that anyone can press
    // //The dot should be in the same spot if we allow caching of locations
    // //This only runs when we have a new addition or someone has reloaded the system
    // if (exists === false) {
    //
    //   //Untangle group
    //   const center = groupCoords.reduce(calculateCentroid, {
    //     lat: 0,
    //     lng: 0
    //   });
    //
    //   const angles = groupCoords.map(({
    //     lat,
    //     lng,
    //     id,
    //     ready,
    //     currentTimestamp,
    //     connectTimestamp
    //   }) => {
    //     return {
    //       lat,
    //       lng,
    //       id,
    //       ready,
    //       currentTimestamp,
    //       connectTimestamp,
    //       angle: Math.atan2(lat - center.lat, lng - center.lng) * 180 / Math.PI
    //     };
    //   });
    //
    //   // let groupCoordsSorted = angles.sort(sortByAngle);
    //   groupCoords = angles.sort(sortByAngle);
    //
    //   //closing the loop - not needed any more
    //   // groupCoordsSorted.push(groupCoordsSorted[0]);
    //   // groupCoords.push(groupCoords[0]);
    //
    //   console.log("new addition")
    //   console.log(groupCoords.length);
    //   console.log(groupCoords);
    //
    // }

    //Sending coordinates on an interval timer
    // io.emit("receive-group-coordinates", groupCoords)
    coordinatesChanged = true;
  });

})

//Utility Function
const calculateCentroid = (acc, {
  lat,
  lng
}, idx, src) => {
  acc.lat += lat / src.length;
  acc.lng += lng / src.length;
  return acc;
};

const sortByAngle = (a, b) => a.angle - b.angle;


function isGroupReady() {
  var readyCounter = 0;
  for (var i = 0; i < groupCoords.length; i++) {
    if (groupCoords[i].ready === true) {
      readyCounter++;
    }
  }

  console.log("number of ready users: ", readyCounter, "/", groupCoords.length);
  // console.log(groupCoords);

  if (readyCounter >= groupCoords.length) {
    //clear the ready flags
    currentMode += 1;

    if (currentMode > 1) {

      for (var i = 0; i < groupCoords.length; i++) {
        groupCoords[i].ready = false;
      }

      currentMode = 0;
    }

    if (!started) {
      io.emit("start-next", true);
      console.log("sending start");
      started = true;
    }
  } else {
    started = false;
  }


  coordinatesChanged = true;

  // console.log("started :", started);

  let counts = {
    users: groupCoords.length,
    ready: readyCounter,
  };

  io.emit("ready-status", counts);
}

function isGroupDone() {
  var doneCounter = 0;
  for (var i = 0; i < groupCoords.length; i++) {
    if (groupCoords[i].done === true) {
      doneCounter++;
    }
  }

  if (doneCounter >= groupCoords.length) {
    //clear the ready flags
    for (var i = 0; i < groupCoords.length; i++) {
      groupCoords[i].ready = false;
    }

    started = false;
    console.log("started : ", started);
    // if (!started) {
    //   io.emit("start-next", true);
    //   console.log("sending start");
    //   started = true;
    // }
  }
}

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

  var name = "recording" + getDateString() + ".json";
  // var name = "recording.json";

  //add trailing bracket
  data += "]";
  // var jsonString = JSON.stringify(data, null, 1)
  fs.writeFile("./public/logs/" + name, data, (err) => {
    if (err) {
      console.error(err)
      return
    }
    // console.log("saved file: ", name);
  })

}

function sendGroupCoordinates() {
  if (coordinatesChanged) {
    coordinatesChanged = false;

    for(var i = 0; i < sessions.length; i ++){
      io.to(sessions[i].id).emit("receive-group-coordinates", sessions[i].users)
    }
    // io.emit("receive-group-coordinates", groupCoords)
    // console.log("coord array length : ", groupCoords.length)
    // if (recordCoords) {
    //   // groupCoords.timestamp = Date.now();
    //   // var timestamp = {
    //   //   timestamp: Date.now()
    //   // };
    //   // savedCoords.push(timestamp);
    //   savedCoordsString += JSON.stringify(groupCoords, null, 1);
    //   savedCoordsString += ",";
    //   // console.log(saveCoords);
    //   // savedCoords.push(saveCoords);
    // }
  }

}

setInterval(sendGroupCoordinates, 250);
