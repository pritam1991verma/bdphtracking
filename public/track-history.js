const map = L.map("map").setView([22.8046, 86.2029], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "BDPH Tracking"
}).addTo(map);

const gpsData = [
  { lat:22.8046, lng:86.2029, speed:20, halt:false },
  { lat:22.8055, lng:86.2040, speed:28, halt:false },
  { lat:22.8070, lng:86.2060, speed:35, halt:false },
  { lat:22.8090, lng:86.2080, speed:72, halt:false },
  { lat:22.8110, lng:86.2100, speed:80, halt:false },
  { lat:22.8130, lng:86.2130, speed:0, halt:true },
  { lat:22.8130, lng:86.2130, speed:0, halt:true },
  { lat:22.8145, lng:86.2160, speed:18, halt:false },
  { lat:22.8170, lng:86.2200, speed:60, halt:false },
  { lat:22.8210, lng:86.2260, speed:15, halt:false },
  { lat:22.8250, lng:86.2330, speed:8, halt:false }
];

const route = gpsData.map(p => [p.lat, p.lng]);

const polyline = L.polyline(route,{
  color:"lime",
  weight:5
}).addTo(map);

map.fitBounds(polyline.getBounds());

const marker = L.marker(route[0]).addTo(map);

let currentIndex = 0;
let playbackInterval = null;
let playbackMultiplier = 1;

let overspeed = 0;
let halt = 0;
let harshBrake = 0;
let deviation = 1;

for(let i=1;i<gpsData.length;i++){

  if(gpsData[i].speed > 70){
    overspeed++;
  }

  if(gpsData[i].halt){
    halt++;
  }

  const diff = gpsData[i-1].speed - gpsData[i].speed;

  if(diff > 40){
    harshBrake++;
  }
}

document.getElementById("overspeedCount").innerText = overspeed;
document.getElementById("haltCount").innerText = halt;
document.getElementById("harshCount").innerText = harshBrake;
document.getElementById("deviationCount").innerText = deviation;

function moveVehicle(){

  if(currentIndex >= gpsData.length){
    clearInterval(playbackInterval);
    return;
  }

  const point = gpsData[currentIndex];

  marker.setLatLng([point.lat, point.lng]);

  marker.bindPopup(`
    Speed: ${point.speed} km/h <br>
    ${point.halt ? "Vehicle Halted" : "Vehicle Moving"}
  `);

  if(point.speed > 70){

    marker.bindPopup(`
      🚨 Overspeeding <br>
      Speed: ${point.speed} km/h
    `).openPopup();
  }

  if(point.halt){

    marker.bindPopup(`
      🛑 Vehicle Halted
    `).openPopup();
  }

  currentIndex++;
}

document.getElementById("playBtn").onclick = ()=>{

  clearInterval(playbackInterval);

  playbackInterval = setInterval(moveVehicle,1000/playbackMultiplier);

};

document.getElementById("pauseBtn").onclick = ()=>{

  clearInterval(playbackInterval);

};

document.getElementById("speedSelect").onchange = (e)=>{

  playbackMultiplier = Number(e.target.value);

  if(playbackInterval){

    clearInterval(playbackInterval);

    playbackInterval = setInterval(
      moveVehicle,
      1000/playbackMultiplier
    );
  }
};

document.getElementById("loadBtn").onclick = ()=>{

  currentIndex = 0;

  marker.setLatLng(route[0]);

  map.fitBounds(polyline.getBounds());

};
