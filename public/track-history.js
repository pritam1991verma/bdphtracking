/* =========================================
   SAFE ELEMENT GETTER
========================================= */

function getEl(id){
return document.getElementById(id);
}

/* =========================================
   MAP INITIALIZATION
========================================= */

const map = L.map('map',{
zoomControl:false
}).setView([22.8046, 86.2029], 12);

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
'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
{
attribution:'© OpenTopoMap'
}
);

const satellite = L.tileLayer(
'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
{
attribution:'© Esri'
}
);

const dark = L.tileLayer(
'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{y}{x}{r}.png',
{
attribution:'© CARTO'
}
);

L.control.layers({
"Normal":normal,
"Terrain":terrain,
"Satellite":satellite,
"Dark":dark
}).addTo(map);

/* =========================================
   GPS DATA
========================================= */

const gpsData = [

{lat:22.8046,lng:86.2029,speed:20,time:"08:00:00"},
{lat:22.8060,lng:86.2040,speed:35,time:"08:05:00"},
{lat:22.8080,lng:86.2060,speed:48,time:"08:10:00"},
{lat:22.8100,lng:86.2080,speed:62,time:"08:15:00"},
{lat:22.8120,lng:86.2100,speed:85,time:"08:20:00"},
{lat:22.8140,lng:86.2130,speed:0,time:"08:30:00"},
{lat:22.8140,lng:86.2130,speed:0,time:"08:45:00"},
{lat:22.8170,lng:86.2200,speed:38,time:"08:50:00"}

];

/* =========================================
   ROUTE COLOR
========================================= */

function getRouteColor(speed){

if(speed <= 40) return "lime";

if(speed <= 60) return "yellow";

if(speed <= 80) return "orange";

return "red";

}

/* =========================================
   GLOW ROUTE
========================================= */

L.polyline(
gpsData.map(p=>[p.lat,p.lng]),
{
color:'#00ff88',
weight:16,
opacity:0.15
}
).addTo(map);

/* =========================================
   MAIN ROUTE
========================================= */

for(let i=0;i<gpsData.length-1;i++){

const current = gpsData[i];
const next = gpsData[i+1];

L.polyline([
[current.lat,current.lng],
[next.lat,next.lng]
],{
color:getRouteColor(current.speed),
weight:6
}).addTo(map);

}

/* =========================================
   ICONS
========================================= */

const truckIcon = L.icon({

iconUrl:
"https://cdn-icons-png.flaticon.com/512/744/744465.png",

iconSize:[50,50],
iconAnchor:[25,25]

});

/* =========================================
   VEHICLE MARKER
========================================= */

const marker = L.marker([
gpsData[0].lat,
gpsData[0].lng
],{
icon:truckIcon
}).addTo(map);

/* =========================================
   MOVING POPUP
========================================= */

const vehiclePopup = L.popup({
closeButton:false,
autoClose:false,
closeOnClick:false,
className:'premiumPopup'
})
.setLatLng([
gpsData[0].lat,
gpsData[0].lng
])
.setContent(`
<b>JH05AB1234</b><br>
Speed : 20 km/h<br>
Fuel : 72%
`)
.openOn(map);

/* =========================================
   PLAYBACK VARIABLES
========================================= */

let currentIndex = 0;
let playbackInterval;
let playbackRunning = false;
let playbackSpeed = 1000;

/* =========================================
   MOVE VEHICLE
========================================= */

function moveVehicle(){

if(currentIndex >= gpsData.length){

clearInterval(playbackInterval);

playbackRunning = false;

return;

}

const point = gpsData[currentIndex];

/* MOVE */

marker.setLatLng([
point.lat,
point.lng
]);

vehiclePopup.setLatLng([
point.lat,
point.lng
]);

/* POPUP */

vehiclePopup.setContent(`
<b>JH05AB1234</b><br>
Speed : ${point.speed} km/h<br>
Time : ${point.time}<br>
Fuel : 72%
`);

/* FOLLOW */

map.panTo([
point.lat,
point.lng
],{
animate:true,
duration:0.4
});

/* ROTATION */

const nextPoint =
gpsData[currentIndex + 1];

if(nextPoint){

const icon = marker.getElement();

if(icon){

const angle = Math.atan2(
nextPoint.lng - point.lng,
nextPoint.lat - point.lat
) * 180 / Math.PI;

icon.style.transformOrigin =
"center center";

const existingTransform =
icon.style.transform.replace(
/rotate\([^)]*\)/g,
''
);

icon.style.transform =
`${existingTransform} rotate(${angle}deg)`;

}

}

/* SPEED TEXT */

if(getEl("speedText")){

getEl("speedText").innerHTML =
point.speed + ' KM/H';

}

if(getEl("speedMeter")){

getEl("speedMeter").innerHTML =
point.speed;

}

/* TIMER */

if(getEl("currentTime")){

getEl("currentTime").innerText =
point.time;

}

/* SLIDER */

const progress =
(currentIndex / (gpsData.length - 1)) * 100;

if(getEl("timelineSlider")){

getEl("timelineSlider").value =
progress;

}

/* PLAYHEAD */

if(getEl("playhead")){

getEl("playhead").style.left =
progress + "%";

}

currentIndex++;

}

/* =========================================
   PLAY
========================================= */

if(getEl("playBtn")){

getEl("playBtn")
.addEventListener("click",()=>{

if(playbackRunning) return;

playbackRunning = true;

playbackInterval = setInterval(
moveVehicle,
playbackSpeed
);

});

}

/* =========================================
   PAUSE
========================================= */

if(getEl("pauseBtn")){

getEl("pauseBtn")
.addEventListener("click",()=>{

clearInterval(playbackInterval);

playbackRunning = false;

});

}

/* =========================================
   REWIND
========================================= */

if(getEl("rewindBtn")){

getEl("rewindBtn")
.addEventListener("click",()=>{

currentIndex = 0;

marker.setLatLng([
gpsData[0].lat,
gpsData[0].lng
]);

vehiclePopup.setLatLng([
gpsData[0].lat,
gpsData[0].lng
]);

map.panTo([
gpsData[0].lat,
gpsData[0].lng
]);

});

}

/* =========================================
   SPEED CONTROL
========================================= */

if(getEl("speedSelect")){

getEl("speedSelect")
.addEventListener("change",(e)=>{

const speed =
Number(e.target.value);

playbackSpeed = 1000 / speed;

if(playbackRunning){

clearInterval(playbackInterval);

playbackInterval = setInterval(
moveVehicle,
playbackSpeed
);

}

});

}

/* =========================================
   TIMELINE
========================================= */

if(getEl("timelineSlider")){

getEl("timelineSlider")
.addEventListener("input",(e)=>{

const index = Math.floor(
(e.target.value / 100) *
(gpsData.length - 1)
);

currentIndex = index;

const point = gpsData[index];

marker.setLatLng([
point.lat,
point.lng
]);

vehiclePopup.setLatLng([
point.lat,
point.lng
]);

map.panTo([
point.lat,
point.lng
]);

});

}

/* =========================================
   FIT BOUNDS
========================================= */

const bounds = L.latLngBounds(
gpsData.map(p=>[p.lat,p.lng])
);

map.fitBounds(bounds,{
padding:[50,50]
});
