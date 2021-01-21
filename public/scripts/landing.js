
var generatedId = Date.now() + Math.random().toString().slice(2);

var url = window.location.origin;
$("#rooms-list").html("<a href="+url+"/heart.html?heartid="+generatedId+">"+url+"/heart.html?heartid="+generatedId+"</a>")

// // TODO: does the number of sessions decrease after a user disconnects?
