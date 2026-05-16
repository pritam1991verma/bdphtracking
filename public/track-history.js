window.onload = function(){

/* =========================================
   MAP
========================================= */

const map = L.map('map').setView(
[22.8046,86.2029],
13
);

/* =========================================
   MAP MODES
========================================= */

const normal = L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
{
attribution:'© OpenStreetMap'
}
).addTo(map);

const terrain = L.tileLayer(
'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
);

const satellite = L.tileLayer(
'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
);

const dark = L.tileLayer(
'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
);

/* =========================================
   LAYERS
========================================= */

L.control.layers({
"Normal":normal,
"Terrain":terrain,
"Satellite":satellite,
"Dark":dark
}).addTo(map);

/* =========================================
   ROUTE
========================================= */

const route = [

[22.8046,86.2029],
[22.8056,86.2040],
[22.8072,86.2058],
[22.8090,86.2080],
[22.8108,86.2100],
[22.8125,86.2135],
[22.8140,86.2170],
[22.8170,86.2200]

];

/* =========================================
   MAIN ROUTE
========================================= */

L.polyline(route,{
color:'#00ff88',
weight:6,
smoothFactor:1.5,
lineCap:'round',
lineJoin:'round'
}).addTo(map);

/* =========================================
   GLOW ROUTE
========================================= */

L.polyline(route,{
color:'#00ff88',
weight:16,
opacity:0.15,
smoothFactor:1.5
}).addTo(map);

/* =========================================
   START ICON
========================================= */

L.marker(route[0],{

icon:L.icon({

iconUrl:
'https://cdn-icons-png.flaticon.com/512/25/25694.png',

iconSize:[32,32]

})

})
.bindPopup(`
<b>Trip Started</b>
`)
.addTo(map);

/* =========================================
   END ICON
========================================= */

L.marker(route[route.length-1],{

icon:L.icon({

iconUrl:
'https://cdn-icons-png.flaticon.com/512/1828/1828665.png',

iconSize:[32,32]

})

})
.bindPopup(`
<b>Trip Ended</b>
`)
.addTo(map);

/* =========================================
   OVERSPEED
========================================= */

L.marker(route[4],{

icon:L.icon({

iconUrl:
'https://cdn-icons-png.flaticon.com/512/565/565340.png',

iconSize:[36,36]

})

})
.bindPopup(`
<b>Overspeeding</b><br>
85 KM/H
`)
.addTo(map);

/* =========================================
   HARSH BRAKE
========================================= */

L.marker(route[5],{

icon:L.icon({

iconUrl:
'https://cdn-icons-png.flaticon.com/512/3524/3524659.png',

iconSize:[36,36]

})

})
.bindPopup(`
<b>Harsh Braking</b>
`)
.addTo(map);

/* =========================================
   VEHICLE HALT
========================================= */

L.marker(route[6],{

icon:L.icon({

iconUrl:
'https://cdn-icons-png.flaticon.com/512/1828/1828843.png',

iconSize:[34,34]

})

})
.bindPopup(`
<b>Vehicle Halted</b><br>
15 Minutes
`)
.addTo(map);

/* =========================================
   VEHICLE ICON
========================================= */

const truckIcon = L.icon({

iconUrl:
'https://cdn-icons-png.flaticon.com/512/744/744465.png',

iconSize:[50,50],

iconAnchor:[25,25]

});

/* =========================================
   VEHICLE MARKER
========================================= */

const truck = L.marker(route[0],{
icon:truckIcon
}).addTo(map);

/* =========================================
   PLAYBACK VARIABLES
========================================= */

let current = 0;

let interval;
   /* =========================================
   ACTION MESSAGE
========================================= */

function showMessage(text){

const msg =
document.getElementById("actionMessage");

if(!msg) return;

msg.innerHTML = text;

msg.style.display = "block";

setTimeout(()=>{

msg.style.display = "none";

},1500);

}

/* =========================================
   MOVE VEHICLE
========================================= */

function moveTruck(){

if(current >= route.length){

clearInterval(interval);

return;

}

/* MOVE */

truck.setLatLng(route[current]);

/* FOLLOW */

map.panTo(route[current]);

/* ROTATION */

const icon =
truck.getElement();

if(icon && current < route.length-1){

const start =
route[current];

const end =
route[current+1];

const angle = Math.atan2(
end[1]-start[1],
end[0]-start[0]
) * 180 / Math.PI;

icon.style.transformOrigin =
"center center";

const existingTransform =
icon.style.transform.replace(
/rotate\([^)]*\)/g,
''
);

icon.style.transform =
`${existingTransform}
rotate(${angle}deg)`;

}

/* SPEED */

const speed =
Math.floor(35 + Math.random()*50);

/* UPDATE SPEED TEXT */

const speedText =
document.getElementById('speedText');

if(speedText){

speedText.innerHTML =
speed + ' KM/H';

}

/* UPDATE SPEEDOMETER */

const speedMeter =
document.getElementById('speedMeter');

if(speedMeter){

speedMeter.innerHTML =
speed;

}

/* UPDATE TIMELINE */

const timeline =
document.getElementById('timelineSlider');

if(timeline){

timeline.value =
(current/(route.length-1))*100;

}

/* PLAYHEAD */

const playhead =
document.getElementById("playhead");

if(playhead){

playhead.style.left =
(current/(route.length-1))*100 + "%";

}

/* CURRENT TIME */

const currentTime =
document.getElementById("currentTime");

if(currentTime){

const hrs =
8 + Math.floor(current / 2);

const mins =
(current % 2) * 30;

currentTime.innerHTML =
`${hrs}:${
mins === 0 ? "00" : mins
}:00`;

}

current++;

}

/* =========================================
   PLAY BUTTON
========================================= */

const playBtn =
document.getElementById('playBtn');

if(playBtn){

playBtn.onclick = function(){

showMessage("PLAYBACK STARTED");

clearInterval(interval);

interval =
setInterval(moveTruck,1000);

};

}

/* =========================================
   PAUSE BUTTON
========================================= */

const pauseBtn =
document.getElementById('pauseBtn');

if(pauseBtn){

pauseBtn.onclick = function(){

showMessage("PLAYBACK PAUSED");

clearInterval(interval);

};

};

}

/* =========================================
   REWIND BUTTON
========================================= */

const rewindBtn =
document.getElementById('rewindBtn');

if(rewindBtn){

rewindBtn.onclick = function(){

showMessage("PLAYBACK REWIND");

clearInterval(interval);
current = 0;

truck.setLatLng(route[0]);

map.panTo(route[0]);

const timeline =
document.getElementById('timelineSlider');

if(timeline){

timeline.value = 0;

}

};

}

/* =========================================
   SPEED CONTROL
========================================= */

const speedSelect =
document.getElementById("speedSelect");

if(speedSelect){

speedSelect.addEventListener(
"change",
function(e){

const speed =
Number(e.target.value);
   showMessage(speed + "X FAST FORWARD");

clearInterval(interval);

interval =
setInterval(
moveTruck,
1000 / speed
);

}
);

}

/* =========================================
   TIMELINE SLIDER
========================================= */

const timelineSlider =
document.getElementById("timelineSlider");

if(timelineSlider){

timelineSlider.addEventListener(
"input",
function(e){
   showMessage("PLAYBACK POSITION CHANGED");

clearInterval(interval);

const index = Math.floor(
(e.target.value / 100) *
(route.length - 1)
);

current = index;

/* MOVE */

truck.setLatLng(route[index]);

/* FOLLOW */

map.panTo(route[index]);

/* SPEED */

const speed =
Math.floor(35 + Math.random()*50);

const speedText =
document.getElementById("speedText");

if(speedText){

speedText.innerHTML =
speed + " KM/H";

}

const speedMeter =
document.getElementById("speedMeter");

if(speedMeter){

speedMeter.innerHTML =
speed;

}
   /* =========================================
   LOAD BUTTON
========================================= */

const loadTripBtn =
document.getElementById("loadTripBtn");

if(loadTripBtn){

loadTripBtn.onclick = function(){

showMessage("TRIP LOADED");

map.fitBounds(route);

};

}

/* PLAYHEAD */

const playhead =
document.getElementById("playhead");

if(playhead){

playhead.style.left =
e.target.value + "%";

}

/* TIME */

const currentTime =
document.getElementById("currentTime");

if(currentTime){

const hrs =
8 + Math.floor(index / 2);

const mins =
(index % 2) * 30;

currentTime.innerHTML =
`${hrs}:${
mins === 0 ? "00" : mins
}:00`;

}

});
}

/* =========================================
   FIT BOUNDS
========================================= */

map.fitBounds(route);

};
