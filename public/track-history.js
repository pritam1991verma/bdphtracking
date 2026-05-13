const map = L.map("historyMap").setView([22.8046, 86.2029], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
 attribution: "© OpenStreetMap"
}).addTo(map);

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

function getRouteColor(speed){

if(speed <= 40) return "lime";
if(speed <= 60) return "yellow";
if(speed <= 80) return "orange";
return "red";

}

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

const truckIcon = L.icon({
iconUrl:"https://cdn-icons-png.flaticon.com/512/744/744465.png",
iconSize:[50,50],
iconAnchor:[25,25]
});

const stopIcon = L.icon({
iconUrl:"https://cdn-icons-png.flaticon.com/512/1828/1828843.png",
iconSize:[30,30]
});

const overspeedIcon = L.icon({
iconUrl:"https://cdn-icons-png.flaticon.com/512/565/565340.png",
iconSize:[30,30]
});

const harshIcon = L.icon({
iconUrl:"https://cdn-icons-png.flaticon.com/512/3524/3524659.png",
iconSize:[30,30]
});

const marker = L.marker([
gpsData[0].lat,
gpsData[0].lng
],{
icon:truckIcon
}).addTo(map);

marker.bindPopup(`
<b>JH05AB1234</b><br>
Driver : Ramesh<br>
Speed : 20 km/h<br>
Fuel : 72%<br>
GSM : Strong
`);

L.marker([
gpsData[4].lat,
gpsData[4].lng
],{
icon:overspeedIcon
}).addTo(map)
.bindPopup("Overspeed Detected");

L.marker([
gpsData[5].lat,
gpsData[5].lng
],{
icon:stopIcon
}).addTo(map)
.bindPopup("Vehicle Halted : 15 Minutes");

L.marker([
gpsData[6].lat,
gpsData[6].lng
],{
icon:harshIcon
}).addTo(map)
.bindPopup("Harsh Braking Event");

let currentIndex = 0;
let playbackInterval;
let playbackRunning = false;
let playbackSpeed = 1000;

function moveVehicle(){

if(currentIndex >= gpsData.length){
clearInterval(playbackInterval);
playbackRunning = false;
return;
}

const point = gpsData[currentIndex];

marker.setLatLng([
point.lat,
point.lng
]);

marker.setPopupContent(`
<b>JH05AB1234</b><br>
Speed : ${point.speed} km/h<br>
Time : ${point.time}<br>
Fuel : 72%<br>
Ignition : ON
`);

map.panTo([
point.lat,
point.lng
]);

document.getElementById("currentTime").innerText = point.time;

document.getElementById("timelineSlider").value =
(currentIndex / (gpsData.length - 1)) * 100;

currentIndex++;

}

document.getElementById("playBtn")
.addEventListener("click",()=>{

if(playbackRunning) return;

playbackRunning = true;

playbackInterval = setInterval(
moveVehicle,
playbackSpeed
);

});

document.getElementById("pauseBtn")
.addEventListener("click",()=>{

clearInterval(playbackInterval);
playbackRunning = false;

});

document.getElementById("rewindBtn")
.addEventListener("click",()=>{

currentIndex = 0;

marker.setLatLng([
gpsData[0].lat,
gpsData[0].lng
]);

});

document.getElementById("speedSelect")
.addEventListener("change",(e)=>{

const speed = Number(e.target.value);

playbackSpeed = 1000 / speed;

if(playbackRunning){

clearInterval(playbackInterval);

playbackInterval = setInterval(
moveVehicle,
playbackSpeed
);

}

});

document.getElementById("timelineSlider")
.addEventListener("input",(e)=>{

const index = Math.floor(
(e.target.value / 100) * (gpsData.length - 1)
);

currentIndex = index;

const point = gpsData[index];

marker.setLatLng([
point.lat,
point.lng
]);

map.panTo([
point.lat,
point.lng
]);
