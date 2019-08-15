var express = require('express')
var path = require('path')
var app = express()
var http = require('http').Server(app)
var fs = require('fs')
var useragent = require('express-useragent')
var socketIo = require('socket.io')
var io = null
var usersList = []
var debugList = []
var groupCoords = [];
var idCounter = 0;

app.use(useragent.express())


app.use('/', express.static(path.join(__dirname, 'public')))

app.set('port', (process.env.PORT || 5000))

http.listen((process.env.PORT || 5000), function(){
  console.log("Node app is running at localhost: "+app.get('port'))
})

app.get('/', function(request, response) {
    response.redirect('/getPosition.html')
})

io = socketIo(http)
io.on('connection', function(socket){

  socket.on("request-id", function(){
    io.to(this.id).emit("receive-id", idCounter)
    idCounter++;

  })

  //Add client id to usersList if on mobile
  socket.on("new-client", function(data){

    // if (data == "mobile"){
    //
    //     if(usersList.indexOf(this.id) == -1){
    //       usersList.push( this.id )
    //       console.log("New Mobile Client: ", this.id," - updated list: ", usersList)
    //       //respond with their their id
    //       io.to(this.id).emit("client-id", usersList.indexOf(this.id))
    //     }else{
    //       console.log("Existing Mobile Client: ", this.id," - updated list: ", usersList)
    //   }
    //     //if the user is a debug viewer add them to a separate list
    //   }else if (data == 'debug'){
    //     if (debugList.indexOf(this.id) == -1){
    //        debugList.push(this.id)
    //        console.log("New Debug Client: ", this.id," - updated list: ", debugList)
    //     }else{
    //       console.log("Existing Debug Client: ", this.id," - updated list: ", debugList)
    //      }
    //   }

  })

  //this happens automatically when the socket connection breaks
  socket.on('disconnect', function(){
    //Remove mobile client from list
    // var disconnectedClientIndex = usersList.indexOf(this.id)
    // if (disconnectedClientIndex >= 0){
    //   usersList.splice(disconnectedClientIndex, 1)
    //   console.log("Mobile Client disconnected: ", this.id," - updated list: ", usersList)
    // }
    //
    // //Remove debug client from list
    // var disconnectedDebugClientIndex = debugList.indexOf(this.id)
    // if (disconnectedDebugClientIndex >= 0){
    //   debugList.splice(disconnectedDebugClientIndex, 1)
    //   console.log("Debug Client disconnected: ", this.id," - updated list: ", debugList)
    // }

    var exists = false
    var index = -1

    for( var i=0; i < groupCoords.length; i ++){
      //if we find a match
      if(groupCoords[i].id === this.id){
          exists = true
          index = i
       }
     }

     //if we have a match
     //remove that match from the list of coordinates
     if(exists == true){
       groupCoords.splice(index, 1)
     }

     console.log("removed eleemnt" + groupCoords)
  })

  // //This we will call when we want a device to go offline
  // socket.on('removeclient', function(){
  //   // var disconnectedClientIndex = usersList.indexOf(this.id)
  //   // if (disconnectedClientIndex >= 0){
  //   //   usersList.splice(disconnectedClientIndex, 1)
  //   //   console.log("removing client from list of active users: ", this.id," - updated list: " + usersList)
  //   // }
  //
  //   var exists = false
  //   var index = -1
  //
  //   for( var i=0; i < groupCoords.length; i ++){
  //
  //     //if we find a match
  //     if(groupCoords[i].id === this.id){
  //         groupCoords[i].lat = coords.lat
  //         groupCoords[i].lng = coords.lng
  //         exists = true
  //         index = i
  //      }
  //    }
  //
  //    //if we have a match
  //    //remove that match from the list of coordinates
  //    if(exists == true){
  //      groupCoords.splice(index, 1)
  //    }
  //
  //
  //
  //
  // })

  socket.on('addclient', function(){
    if (usersList.indexOf(this.id) == -1){
      usersList.push( this.id )
      console.log("adding client back to list: ", this.id," - updated list: ", usersList)
      io.to(this.id).emit("client-id", usersList.indexOf(this.id))
    }else{
      console.log("Client Already Exists: ", this.id)
    }
  })

  socket.on("update-coordinates", function(coords){

    var sID = this.id
    var formattedCoords = JSON.stringify(coords)
    console.log("received: " + formattedCoords + ", " + sID)

    //If we don't have this ID already
    var exists = false
    for( var i=0; i < groupCoords.length; i ++){

      //if we find a match, we update the existing coordinate
      if(groupCoords[i].id === this.id){
          groupCoords[i].lat = coords.lat
          groupCoords[i].lng = coords.lng
          exists = true
      }
    }

    //If ID doesn't match with existing IDs
    if(exists == false){
      var person = {id:this.id, lat:coords.lat, lng:coords.lng, seqentialID:coords.seqentialID}
      groupCoords.push(person)
    }

    groupCoords.sort(function (a, b){
      return a.sequentialID - b.sequentialID
    });

    console.log(JSON.stringify(groupCoords))

    io.emit("receive-group-coordinates", groupCoords)

  })
})
