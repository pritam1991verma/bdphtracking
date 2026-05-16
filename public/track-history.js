window.onload = function(){

/* MAP */

const map = L.map('map').setView(
[22.8046,86.2029],
13
);

/* NORMAL */

const normal = L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
{
attribution:'© OpenStreetMap'
}
).addTo(map);

/* TERRAIN */

const terrain = L.tileLayer(
'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
);

/* SATELLITE */

const satellite = L.tileLayer(
'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
);

/* DARK */

const dark = L.tileLayer(
'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
);

/* LAYERS */

L.control.layers({
"Normal":normal,
"Terrain":terrain,
"Satellite":satellite,
"Dark":dark
}).addTo(map);

/* ROUTE */

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

/* ROUTE LINE */

L.polyline(route,{
color:'#00ff88',
weight:6
}).addTo(map);

/* GLOW */

L.polyline(route,{
color:'#00ff88',
weight:16,
opacity:0.15
}).addTo(map);

/* ICON */

const truckIcon = L.icon({

iconUrl:
'https://cdn-icons-png.flaticon.com/512/744/744465.png',

iconSize:[50,50],

iconAnchor:[25,25]

});

/* MARKER */

const truck = L.marker(route[0],{
icon:truckIcon
}).addTo(map);

/* PLAYBACK */

let current = 0;

let interval;

function moveTruck(){

if(current >= route.length){

clearInterval(interval);

return;

}

truck.setLatLng(route[current]);

map.panTo(route[current]);

const speed =
Math.floor(35 + Math.random()*50);

const speedText =
document.getElementById('speedText');

if(speedText){

speedText.innerHTML =
speed + ' KM/H';

}

const speedMeter =
document.getElementById('speedMeter');

if(speedMeter){

speedMeter.innerHTML =
speed;

}

const timeline =
document.getElementById('timelineSlider');

if(timeline){

timeline.value =
(current/(route.length-1))*100;

}

current++;

}

/* PLAY */

const playBtn =
document.getElementById('playBtn');

if(playBtn){

playBtn.onclick = function(){

clearInterval(interval);

interval =
setInterval(moveTruck,1000);

};

}

/* PAUSE */

const pauseBtn =
document.getElementById('pauseBtn');

if(pauseBtn){

pauseBtn.onclick = function(){

clearInterval(interval);

};

}

/* REWIND */

const rewindBtn =
document.getElementById('rewindBtn');

if(rewindBtn){

rewindBtn.onclick = function(){

current = 0;

truck.setLatLng(route[0]);

};

}

/* FIT */

map.fitBounds(route);

};
