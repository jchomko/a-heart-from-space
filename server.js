var express = require("express");
var path = require("path");
var app = express();
var fs = require("fs");
var useragent = require("express-useragent");
require("dotenv").config();

var io = null;
var usersList = [];
var debugList = [];
var groupCoords = [];
var idCounter = 0;
var headingChangedFlag = false;
var coordinatesChanged = false;
var started = false;

// we keep track of rooms (sessions) and their sockets (users)
function Sessions() {
  this.sessions = [];
}

// each socket automatically joins a room (session) identified by its own id, so we add a new session on connect
Sessions.prototype.addSession = function(socketId) {
  this.sessions.push({
    id: socketId,
    //lng: undefined,
    //lat: undefined,
    users: [
      {
        id: socketId,
        lng: undefined,
        lat: undefined,
        heading: undefined,
        done: false
      }
    ]
  });
};

// adds a socket (user) to a room (session)
Sessions.prototype.addUserToSession = function(sessionId, user) {
  const sessionIndex = this.sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex !== -1) {
    this.sessions[sessionIndex].users.push({
      id: user.id,
      lng: user.lng,
      lat: user.lat,
      heading: user.heading,
      done: user.done
    });
  }
};

// deletes a socket (user) to a room (session)
Sessions.prototype.deleteUserFromSession = function(socketId) {
  const [sessionIndex, userIndex] = this.findUser(socketId);
  if (sessionIndex !== undefined) {
    const deletedUsers = this.sessions[sessionIndex].users.splice(userIndex, 1);
    const sessionId = this.sessions[sessionIndex].id;
    if (this.sessions[sessionIndex].users.length === 0) {
      this.sessions.splice(sessionIndex, 1);
      return [sessionId, true, deletedUsers[0]];
    } else {
      return [sessionId, false, deletedUsers[0]];
    }
  }
};

// finds a socket (user) in a room (session)
Sessions.prototype.findUser = function(socketId) {
  console.log("findUser", socketId);
  console.dir(this.sessions, { depth: null, colors: true });

  for (let i = 0; i < this.sessions.length; i++) {
    const userIndex = this.sessions[i].users.findIndex(u => u.id === socketId);
    if (userIndex !== -1) {
      return [i, userIndex];
    }
  }
  console.log("user not found"); // why?
};

// returns an array of all rooms (sessions)
Sessions.prototype.getSessionsIds = function() {
  return (
    this.sessions
      //.filter((s) => s.lng !== undefined && s.lat !== undefined)
      .reduce((acc, cur) => {
        acc.push(cur.id);
        return acc;
      }, [])
  );
};

// returns sockets (users) in a given room (session)
Sessions.prototype.getSessionUsers = function(sessionId) {
  console.log("getSessionUsers for", sessionId);
  const sessionIndex = this.sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex !== -1) {
    return this.sessions[sessionIndex].users;
  }
  // return this.getSessionUsers(socketId);
  /*console.log("sessionIndex", sessionIndex, "userIndex", userIndex);
  if (sessionIndex !== undefined) {
    console.log("returning", this.sessions[sessionIndex].users);
    return this.sessions[sessionIndex].users;
  }*/
};

/*Sessions.prototype.remove = function (socketId) {
  var [sessionIndex, userIndex] = this.findUser(socketId);
  if (sessionIndex !== undefined) {
    this.sessions[sessionIndex].users.splice(userIndex, 1);
    if (this.sessions[sessionIndex].users.length === 0) {
      var sessionId = this.sessions[sessionIndex].id;
      this.sessions.splice(sessionIndex, 1);
      return sessionId;
    }
  }
};*/

// updates coordinates for a given socket (user)
Sessions.prototype.updateCoordinates = function(socketId, lng, lat) {
  const [sessionIndex, userIndex] = this.findUser(socketId);
  this.sessions[sessionIndex].users[userIndex].lng = lng;
  this.sessions[sessionIndex].users[userIndex].lat = lat;
  var usersToNotify = this.sessions[sessionIndex].users.filter(
    (u, index) => index !== userIndex
  );
  if (usersToNotify.length > 0) {
    return this.sessions[sessionIndex].id;
  }
};

// updates heading for a given socket (user)
Sessions.prototype.updateHeading = function(socketId, heading) {
  const [sessionIndex, userIndex] = this.findUser(socketId);
  if (sessionIndex !== undefined) {
    this.sessions[sessionIndex].users[userIndex].heading = heading;
    var usersToNotify = this.sessions[sessionIndex].users.filter(
      (u, index) => index !== userIndex
    );
    if (usersToNotify.length > 0) {
      return this.sessions[sessionIndex].id;
    }
  }
};

var sessions = new Sessions();

//Development section
if (process.env.NODE_ENV != "production") {
  var https = require("https").createServer(
    {
      key: fs.readFileSync("localhost+4-key.pem"),
      cert: fs.readFileSync("localhost+4.pem"),
      requestCert: false,
      rejectUnauthorized: false
    },
    app
  );
  io = require("socket.io").listen(https);
  https.listen(process.env.PORT || 5000, function() {
    console.log("Node app is running at localhost: " + app.get("port"));
  });
  console.log("development");
} else {
  var http = require("http").createServer(app);
  io = require("socket.io").listen(http);
  http.listen(process.env.PORT || 5000, function() {
    console.log("Node app is running at localhost: " + app.get("port"));
  });
  console.log("production");
}

app.use(express.static("public"));

app.get("/", function(request, response) {
  // response.redirect('/index.html')
  response.sendFile("/public/index.html", {
    root: __dirname
  });
});

io.on("connection", function(socket) {
  console.log("connected", socket.id);

  // notifies all clients except sender that a new room (session) has become available
  socket.broadcast.emit("new-session-available", socket.id);

  // sends an array of ids of all rooms (sessions) to the connected client
  socket.emit("available-sessions", sessions.getSessionsIds());

  // remembers the new room (session)
  sessions.addSession(socket.id);

  /*socket.on("request-id", function () {
    io.to(this.id).emit("receive-id", idCounter);
    idCounter += 1;
  });*/

  // a socket (user) joins a new room (session)
  socket.on("join-session", function(newSessionId) {
    const [
      sessionId,
      isSessionToDelete,
      deletedUser
    ] = sessions.deleteUserFromSession(socket.id);
    console.log(
      "join-session",
      "socket.id =",
      socket.id,
      "newSessionId =",
      newSessionId,
      "isSessionToDelete",
      isSessionToDelete
    );

    // at first they leave the previous room (session)
    socket.leave(sessionId, () => {
      // then they join a new room (session)
      socket.join(newSessionId, () => {
        // if there are no sockets (users) left in the previous room (session), we notify all clients that the room (session) has been deleted
        if (isSessionToDelete === true) {
          //socket.broadcast.emit("delete-session", sessionId);
          //socket.emit("delete-session", sessionId);
          io.emit("session-deleted", sessionId);
        }

        // notifies the sockets (users) of the new room (session) that a new socket (user) has joined the room
        socket.to(newSessionId).emit("new-user-joined", deletedUser);

        // sends an array of ids of the existing sockets (users) in the new room (session) to the client
        socket.emit("session-users", sessions.getSessionUsers(newSessionId));

        // adds the socket (user) to the new room (session)
        sessions.addUserToSession(newSessionId, deletedUser);
      });
    });
  });

  socket.on("update-coordinates", function(lng, lat) {
    //console.log("update-coordinates", lng, lat);
    const sessionToNotify = sessions.updateCoordinates(socket.id, lng, lat);
    if (sessionToNotify !== undefined) {
      socket
        .to(sessionToNotify)
        .emit("update-user-coordinates", socket.id, lng, lat);
    }
  });

  socket.on("update-heading", function(heading) {
    console.log("update-heading", heading);
    const sessionToNotify = sessions.updateHeading(socket.id, heading);
    if (sessionToNotify !== undefined) {
      socket.to(sessionToNotify).emit("update-user-heading", heading);
    }
  });

  // on disconnect we delete the socket (user) from its room (session) and delete the room (session) if it's empty (has no users/sockets)
  socket.on("disconnect", function() {
    console.log("disconnect", socket.id);
    const [sessionId, isSessionToDelete] = sessions.deleteUserFromSession(
      socket.id
    );
    console.log("sessionId", sessionId, "isSessionToDelete", isSessionToDelete);
    if (isSessionToDelete === true) {
      // notify all clients that the room (session) has been deleted
      // socket.broadcast.emit("delete-session", sessionId);
      // socket.emit("delete-session", sessionId);
      io.emit("session-deleted", sessionId);
    } else {
      // notify all clients except sender that the user (socket) has been deleted
      socket.broadcast.emit("user-deleted", socket.id);
    }
  });

  //detect new client
  //client is added to list only when it sends some coordinates
  /*socket.on("new-client", function(data) {
    console.log("new client");
    // io.to(this.id).emit("receive-start-status", started)
  })*/

  //this happens automatically when the socket connection breaks
  /*socket.on("disconnect", function () {
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
      console.log("removing :" + JSON.stringify(groupCoords[index]));
      groupCoords.splice(index, 1);
      // console.log("coord array length : ", groupCoords.length)
      // coordinatesChanged = true;
      io.emit("clear-markers", 1); //groupCoords
      // isGroupReady();
    }
  });*/

  socket.on("send-tap", function(targetSocketId) {
    io.to(targetSocketId).emit("receive-tap");
    console.log("sending tap to :", targetSocketId);
  });

  /*socket.on("addclient", function () {
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
  });*/

  socket.on("draw-triangle", function(drawDone) {
    var sID = this.id;
    var exists = false;

    for (var i = 0; i < groupCoords.length; i++) {
      //if we find a match, we update the existing coordinate
      if (groupCoords[i].id === this.id) {
        groupCoords[i].done = drawDone;
        exists = true;
      }
    }
    isGroupDone();
    coordinatesChanged = true;
  });

  socket.on("ready-to-start", function(status) {
    console.log("number of active users : ", groupCoords.length);
    console.log("receiving : ", status, "from :", this.id);
    var sID = this.id;
    var exists = false;

    for (var i = 0; i < groupCoords.length; i++) {
      //if we find a match, we update the existing coordinate
      if (groupCoords[i].id === this.id) {
        groupCoords[i].ready = status;
        exists = true;
      }
    }
    console.log("exists: ", exists);

    // isGroupReady();

    //we need to break this into a separate function and then check it
    //when the disconnect function is fired.
    // we also need to make a note that pops up when people first come to the Websites
    // but what happens when they reload?
    // maybe this button thing is too much, too complicated
    // maybe we just go square -> circle -> heart and use the completion as the next trigger

    //If the person hasn't been registered then nothing will happen
    //But that is really an edge case
  });

  /*socket.on("update-heading", function (heading) {
    var sID = this.id;
    var exists = false;

    for (var i = 0; i < groupCoords.length; i++) {
      //if we find a match, we update the existing coordinate
      if (groupCoords[i].id === this.id) {
        groupCoords[i].heading = heading;
        exists = true;
      }
    }

    // coordinatesChanged = true;
    //Update happens on timer now
    // if (exists) {
    // io.emit("receive-group-coordinates", groupCoords)
    // }
  });*/

  //Receive coordinates from each participant and add them to our list
  /*socket.on("update-coordinates", function (coords) {
    var sID = this.id;
    // var formattedCoords = JSON.stringify(coords);
    // console.log("received: " + formattedCoords + ", " + sID)

    //If we don't have this ID already
    var exists = false;
    for (var i = 0; i < groupCoords.length; i++) {
      //if we find a match, we update the existing coordinate
      if (groupCoords[i].id === this.id) {
        groupCoords[i].lat = coords.lat;
        groupCoords[i].lng = coords.lng;
        groupCoords[i].heading = coords.heading;
        groupCoords[i].done = coords.done;
        exists = true;
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
        done: coords.done,
      };
      groupCoords.push(person);
    }

    //Sending coordinates on an interval timer
    // io.emit("receive-group-coordinates", groupCoords)
    coordinatesChanged = true;
  });*/

  // socket.on("draw-triangle", function(state) {
  //
  //
  // })
});

function isGroupReady() {
  var readyCounter = 0;
  for (var i = 0; i < groupCoords.length; i++) {
    if (groupCoords[i].ready === true) {
      readyCounter++;
    }
  }

  console.log("number of ready users: ", readyCounter);
  // console.log(groupCoords);

  if (readyCounter >= groupCoords.length) {
    //clear the ready flags
    for (var i = 0; i < groupCoords.length; i++) {
      groupCoords[i].ready = false;
    }

    if (!started) {
      io.emit("start-next", true);
      console.log("sending start");
      started = true;
    }
  } else {
    started = false;
  }

  // console.log("started :", started);

  let counts = {
    users: groupCoords.length,
    ready: readyCounter
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

function sendGroupCoordinates() {
  if (coordinatesChanged) {
    coordinatesChanged = false;
    io.emit("receive-group-coordinates", groupCoords);
    // console.log("coord array length : ", groupCoords.length)
  }
}

setInterval(sendGroupCoordinates, 150);
