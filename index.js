var express = require('express')
var path = require('path')
var app = express()
var http = require('http').Server(app)
var fs = require('fs')
var useragent = require('express-useragent')

app.use(useragent.express())


app.use('/', express.static(path.join(__dirname, 'public')))

app.set('port', (process.env.PORT || 5000))

http.listen((process.env.PORT || 5000), function(){
  console.log("Node app is running at localhost: "+app.get('port'))
})

app.get('/', function(request, response) {
  // if (request.useragent.isMobile){
    response.redirect('/getPosition.html')
  // }

})
