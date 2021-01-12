var ID = Date.now() + Math.random().toString().slice(2);


function startSession() {

  $("#introduction").css("display", "none");
  setup();

  setCookie("intro-done", true, 1)

  centerMap();

  // $("#welcome").css("display", "none")
  // $("#sensor-setup").css("display", "inline")
  //
  // //Hide gps button if we already have access
  // if(gpsActive){
  //   $("#sensor-gps").css("display", "none")
  // }
  //
  // if(hasSensorAccess){
  //   $("#sensor-compass").css("display", "none")
  // }
}
