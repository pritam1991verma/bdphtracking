const map = L.map("map").setView([22.8046, 86.2029], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "BDPH Tracking"
}).addTo(map);

const vehicleIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61231.png",
  iconSize: [40,40],
  iconAnchor: [20,20]
});

const stopIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1828/1828843.png",
  iconSize: [28,28]
});

const overspeedIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/564/564619.png",
  iconSize: [28,28]
});

const harshIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/463/463612.png",
  iconSize: [28,28]
});

const gpsData = [

{
vehicle:"JH05AB1234",
lat:22.8046,
lng:86.2029,
speed:20,
halt:false,
overspeed:false,
harsh:false
},

{
vehicle:"JH05AB1234",
lat:22.8060,
lng:86.2040,
speed:40,
halt:false,
overspeed:false,
harsh:false
},

{
vehicle:"JH05AB1234",
lat:22.8080,
lng:86.2060,
speed:82,
halt:false,
overspeed:true,
harsh:false
},

{
vehicle:"JH05AB1234",
lat:22.8100,
lng:86.2080,
speed:78,
halt:false,
overspeed:true,
harsh:false
},

{
vehicle:"JH05AB1234",
lat:22.8120,
lng:86.2110,
speed:0,
halt:true,
overspeed:false,
harsh:false
},

{
vehicle:"JH05AB1234",
lat:22.8140,
lng:86.2140,
speed:15,
halt:false,
overspeed:false,
harsh:true
},

{
vehicle:"JH05AB1234",
lat:22.8170,
lng:86.2200,
speed:35,
halt:false,
overspeed:false,
harsh:false
}

];

const route = gpsData.map(p=>[p.lat,p.lng]);

const polyline = L.polyline(route,{
color:"lime",
weight:5
}).addTo(map);

map.fitBounds(polyline.getBounds());

const vehicleMarker = L.marker(route[0],{
icon:vehicleIcon
}).addTo(map);

let currentIndex = 0;
let playbackInterval = null;
let playbackRunning = false;
let playbackSpeed = 1000;

function updateCounts(){

const haltCount = gpsData.filter(p=>p.halt).length;
const overspeedCount = gpsData.filter(p=>p.overspeed).length;
const harshCount = gpsData.filter(p=>p.harsh).length;

document.getElementById("haltCount").innerText = haltCount;
document.getElementById("overspeedCount").innerText = overspeedCount;
document.getElementById("harshCount").innerText = harshCount;
document.getElementById("deviationCount").innerText = 1;

}

updateCounts();

function createEventMarkers(){

gpsData.forEach(point=>{

if(point.halt){

L.marker([point.lat,point.lng],{
icon:stopIcon
})
.addTo(map)
.bindPopup(`
🛑 Vehicle Halted<br>
Vehicle: ${point.vehicle}
`);

}

if(point.overspeed){

L.marker([point.lat,point.lng],{
icon:overspeedIcon
})
.addTo(map)
.bindPopup(`
🚨 Overspeeding<br>
Speed: ${point.speed} km/h
`);

}

if(point.harsh){

L.marker([point.lat,point.lng],{
icon:harshIcon
})
.addTo(map)
.bindPopup(`
⚠ Harsh Driving Detected
`);

}

});

}

createEventMarkers();

function moveVehicle(){

if(currentIndex >= gpsData.length){

clearInterval(playbackInterval);
playbackRunning = false;
return;

}

const point = gpsData[currentIndex];

vehicleMarker.setLatLng([point.lat,point.lng]);

vehicleMarker.bindPopup(`
Vehicle: ${point.vehicle}<br>
Speed: ${point.speed} km/h
`);

map.panTo([point.lat,point.lng]);

currentIndex++;

}

document.getElementById("loadBtn").onclick = ()=>{

currentIndex = 0;

vehicleMarker.setLatLng(route[0]);

map.fitBounds(polyline.getBounds());

};

document.getElementById("playBtn").onclick = ()=>{

if(playbackRunning) return;

playbackRunning = true;

playbackInterval = setInterval(
moveVehicle,
playbackSpeed
);

};

document.getElementById("pauseBtn").onclick = ()=>{

clearInterval(playbackInterval);

playbackRunning = false;

};

document.getElementById("speedSelect").onchange = (e)=>{

const val = Number(e.target.value);

if(val===1) playbackSpeed=1000;
if(val===2) playbackSpeed=500;
if(val===5) playbackSpeed=200;
if(val===10) playbackSpeed=100;

if(playbackRunning){

clearInterval(playbackInterval);

playbackInterval = setInterval(
moveVehicle,
playbackSpeed
);

}

};
