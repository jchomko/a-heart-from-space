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

  //Add client id to usersList if on mobile
  socket.on("new-client", function(data){

    if (data == "mobile"){

        if(usersList.indexOf(this.id) == -1){
          usersList.push( this.id )
          console.log("New Mobile Client: ", this.id," - updated list: ", usersList)
          //respond with their their id
          io.to(this.id).emit("client-id", usersList.indexOf(this.id))
        }else{
          console.log("Existing Mobile Client: ", this.id," - updated list: ", usersList)
      }
        //if the user is a debug viewer add them to a separate list
      }else if (data == 'debug'){
        if (debugList.indexOf(this.id) == -1){
           debugList.push(this.id)
           console.log("New Debug Client: ", this.id," - updated list: ", debugList)
        }else{
          console.log("Existing Debug Client: ", this.id," - updated list: ", debugList)
         }
      }
  })

  //this happens automatically when the socket connection breaks
  socket.on('disconnect', function(){

    //Remove mobile client from list
    var disconnectedClientIndex = usersList.indexOf(this.id)
    if (disconnectedClientIndex >= 0){
      usersList.splice(disconnectedClientIndex, 1)
      console.log("Mobile Client disconnected: ", this.id," - updated list: ", usersList)
    }

    //Remove debug client from list
    var disconnectedDebugClientIndex = debugList.indexOf(this.id)
    if (disconnectedDebugClientIndex >= 0){
      debugList.splice(disconnectedDebugClientIndex, 1)
      console.log("Debug Client disconnected: ", this.id," - updated list: ", debugList)
    }

  })

  //This we will call when we want a device to go offline
  socket.on('removeclient', function(){
    var disconnectedClientIndex = usersList.indexOf(this.id)
    if (disconnectedClientIndex >= 0){
      usersList.splice(disconnectedClientIndex, 1)
      console.log("removing client from list of active users: ", this.id," - updated list: " + usersList)
    }
  })

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
    console.log(formattedCoords + ", " + sID)
    socket.broadcast.emit("receive-other-coordinates", coords)

  })

  socket.on('reset-sequence', function(){
    sequenceIndex = 0
    clearTimeout(sequenceTimeout)
    executeSequenceLoop()
    console.log("sequence reset")
  })




  socket.on('save-json', function(d, filename){
      //set data to equal data
      data = d

      var jsonString = JSON.stringify(data, null, 1)
      fs.writeFile( "./sequences/"+filename, jsonString, (err) => {
      if (err) {
          console.error(err)
          return
      }
      console.log("File has been created")
      })
  })

})
