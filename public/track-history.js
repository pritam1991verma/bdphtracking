const map = L.map('map').setView([22.8046,86.2029],13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
attribution:'BDPH Tracking'
}).addTo(map);

let playbackMarker;
let playbackInterval;
let playbackSpeed = 1000;

const route = [
[22.8046,86.2029],
[22.8066,86.2049],
[22.8096,86.2099],
[22.8146,86.2159],
[22.8246,86.2329]
];

const polyline = L.polyline(route,{
color:'lime',
weight:5
}).addTo(map);

map.fitBounds(polyline.getBounds());

playbackMarker = L.marker(route[0]).addTo(map);

document.getElementById("speedSelect").addEventListener("change",(e)=>{

const val = Number(e.target.value);

if(val===1) playbackSpeed=1000;
if(val===2) playbackSpeed=500;
if(val===5) playbackSpeed=200;
if(val===10) playbackSpeed=100;

});

document.getElementById("playBtn").onclick = ()=>{

let i=0;

clearInterval(playbackInterval);

playbackInterval = setInterval(()=>{

if(i>=route.length){
clearInterval(playbackInterval);
return;
}

playbackMarker.setLatLng(route[i]);

i++;

},playbackSpeed);

};

document.getElementById("pauseBtn").onclick = ()=>{

clearInterval(playbackInterval);

};

document.getElementById("overspeedCount").innerText = 3;
document.getElementById("haltCount").innerText = 5;
document.getElementById("harshCount").innerText = 2;
document.getElementById("deviationCount").innerText = 1;
