javascript
/* =========================================
   MAP INITIALIZATION
========================================= */

const map = L.map('map',{
zoomControl:false
}).setView([22.8046, 86.2029], 12);

/* =========================================
   MAP MODES
========================================= */

/* NORMAL */

const normal = L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
{
attribution:'© OpenStreetMap'
}
).addTo(map);

/* TERRAIN */

const terrain = L.tileLayer(
'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
{
attribution:'© OpenTopoMap'
}
);

/* SATELLITE */

const satellite = L.tileLayer(
'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
{
attribution:'© Esri'
}
);

/* DARK */

const dark = L.tileLayer(
'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
{
attribution:'© CARTO'
}
);

/* LAYER CONTROL */

L.control.layers({
"Normal":normal,
"Terrain":terrain,
"Satellite":satellite,
"Dark":dark
}).addTo(map);

/* =========================================
   GPS DUMMY DATA
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
   ROUTE COLOR LOGIC
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
   ROUTE DRAWING
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

const stopIcon = L.icon({

iconUrl:
"https://cdn-icons-png.flaticon.com/512/1828/1828843.png",

iconSize:[30,30]

});

const overspeedIcon = L.icon({

iconUrl:
"https://cdn-icons-png.flaticon.com/512/565/565340.png",

iconSize:[30,30]

});

const harshIcon = L.icon({

iconUrl:
"https://cdn-icons-png.flaticon.com/512/3524/3524659.png",

iconSize:[30,30]

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
<div style="
min-width:180px;
font-family:Arial;
">

<h3 style="margin:0">
JH05AB1234
</h3>

<p style="
color:green;
font-weight:bold;
margin:8px 0;
">
● Moving
</p>

<p id="popupSpeed">
20 km/h
</p>

<p>
Fuel : 72%
</p>

<p>
Driver : Ramesh
</p>

</div>
`)
.openOn(map);

/* =========================================
   EVENT MARKERS
========================================= */

/* OVERSPEED */

L.marker([
gpsData[4].lat,
gpsData[4].lng
],{
icon:overspeedIcon
})
.addTo(map)
.bindPopup(`
<b>Overspeed Detected</b><br>
Speed : 85 km/h
`);

/* STOP */

L.marker([
gpsData[5].lat,
gpsData[5].lng
],{
icon:stopIcon
})
.addTo(map)
.bindPopup(`
<b>Vehicle Halted</b><br>
Duration : 15 Minutes
`);

/* HARSH BRAKING */

L.marker([
gpsData[6].lat,
gpsData[6].lng
],{
icon:harshIcon
})
.addTo(map)
.bindPopup(`
<b>Harsh Braking Event</b>
`);

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

/* MOVE MARKER */

marker.setLatLng([
point.lat,
point.lng
]);

/* MOVE POPUP */

vehiclePopup.setLatLng([
point.lat,
point.lng
]);

/* UPDATE POPUP */

vehiclePopup.setContent(`
<div style="
min-width:180px;
font-family:Arial;
">

<h3 style="margin:0">
JH05AB1234
</h3>

<p style="
color:green;
font-weight:bold;
margin:8px 0;
">
● Moving
</p>

<p id="popupSpeed">
${point.speed} km/h
</p>

<p>
Time : ${point.time}
</p>

<p>
Fuel : 72%
</p>

<p>
Ignition : ON
</p>

</div>
`);

/* MAP FOLLOW */

map.panTo([
point.lat,
point.lng
],{
animate:true,
duration:0.4
});

/* ROTATION FIX */

const nextPoint =
gpsData[currentIndex + 1];

if(nextPoint){

const icon =
marker.getElement();

if(icon){

const angle = Math.atan2(
nextPoint.lng - point.lng,
nextPoint.lat - point.lat
) * 180 / Math.PI;

icon.style.transformOrigin =
"center center";

icon.style.transition =
"transform 0.2s linear";

const existingTransform =
icon.style.transform.replace(
/rotate\\([^)]*\\)/g,
''
);

icon.style.transform =
`${existingTransform}
rotate(${angle}deg)`;

}

}

/* UPDATE TIMER */

document.getElementById("currentTime")
.innerText =
point.time;

/* UPDATE SLIDER */

const progress =
(currentIndex / (gpsData.length - 1)) * 100;

document.getElementById("timelineSlider")
.value = progress;

/* GRAPH PLAYHEAD */

const playhead =
document.getElementById("playhead");

if(playhead){

playhead.style.left =
progress + "%";

}

currentIndex++;

}

/* =========================================
   PLAY BUTTON
========================================= */

document.getElementById("playBtn")
.addEventListener("click",()=>{

if(playbackRunning) return;

playbackRunning = true;

playbackInterval = setInterval(
moveVehicle,
playbackSpeed
);

});

/* =========================================
   PAUSE BUTTON
========================================= */

document.getElementById("pauseBtn")
.addEventListener("click",()=>{

clearInterval(playbackInterval);

playbackRunning = false;

});

/* =========================================
   REWIND BUTTON
========================================= */

document.getElementById("rewindBtn")
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

/* =========================================
   SPEED CONTROL
========================================= */

document.getElementById("speedSelect")
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

/* =========================================
   TIMELINE SLIDER
========================================= */

document.getElementById("timelineSlider")
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

document.getElementById("currentTime")
.innerText =
point.time;

});

/* =========================================
   AUTO FIT BOUNDS
========================================= */

const bounds = L.latLngBounds(
gpsData.map(p=>[p.lat,p.lng])
);

map.fitBounds(bounds,{
padding:[50,50]
});

