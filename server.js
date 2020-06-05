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


if(process.env.NODE_ENV != 'production') {

  var https = require('https').createServer({
        key: fs.readFileSync('localhost+4-key.pem'),
        cert: fs.readFileSync('localhost+4.pem'),
        requestCert: false,
        rejectUnauthorized: false}, app);
  io = require('socket.io').listen(https);
  https.listen((process.env.PORT || 5000), function(){
           console.log("Node app is running at localhost: "+ app.get('port'))
         });
  console.log("development")

}else{

  var http = require('http').createServer(app);
  io = require('socket.io').listen(http);
  http.listen((process.env.PORT || 5000), function(){
        console.log("Node app is running at localhost: "+ app.get('port'))
      });
  console.log("production");

}

app.use(express.static('public'));

app.get('/', function(request, response) {
    // response.redirect('/index.html')
    response.sendFile('/public/index.html', {"root": __dirname})
})


io.on('connection', function(socket){

  socket.on("request-id", function(){
    io.to(this.id).emit("receive-id", idCounter)
    idCounter+= 1;

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

     console.log("removed element" + JSON.stringify(groupCoords))

     groupCoords.sort(function (a, b){
       return parseFloat(a.sequentialID) - parseFloat(b.sequentialID)
     });

     // console.log(JSON.stringify(groupCoords))

     io.emit("receive-group-coordinates", groupCoords)

  })

  // //This can manually called when we want a device to go offline
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

    //If user doesn't already exist
    if (usersList.indexOf(this.id) == -1){
      //Add user to our list of users
      usersList.push( this.id )
      console.log("adding client back to list: ", this.id," - updated list: ", usersList)
      //reply only to user with their ID
      io.to(this.id).emit("client-id", usersList.indexOf(this.id))

    //Client already exists in our list
    }else{
      console.log("Client Already Exists: ", this.id)
    }

  })


  socket.on("update-heading", function(heading){
      var sID = this.id
      var exists = false

      for( var i=0; i < groupCoords.length; i ++){

        //if we find a match, we update the existing coordinate
        if(groupCoords[i].id === this.id){
            groupCoords[i].heading = heading
            exists = true
        }
      }
      if(exists){
        io.emit("receive-group-coordinates", groupCoords)
      }
  })

  //Receive coordinates from each participant and add them to our list
  socket.on("update-coordinates", function(coords){

    var sID = this.id
    var formattedCoords = JSON.stringify(coords)
    // console.log("received: " + formattedCoords + ", " + sID)

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

    //WE don't need to sort these anymore because we are doing complicated drawing techniques to find closest points
    // groupCoords.sort(function (a, b){
    //   return parseFloat(a.sequentialID) - parseFloat(b.sequentialID)
    // });

    // console.log("received, sorted: " + JSON.stringify(groupCoords))

    //this sends the list back to the original sender
    //it isn't a problem because we check for our own id in the list
    //it might make sense to only send this every little while because each user submitting their data
    //triggers the send of this to everyone
    //but that insures that everyone gets the latest info
    //and plus when people are still they don't update so much
    //the only other way to do this would be to have everyone maintain their own lists of people's points
    //but i don't think we need that much efficiency

    io.emit("receive-group-coordinates", groupCoords)

  })
})
