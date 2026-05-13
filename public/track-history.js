const map = L.map('map').setView([22.8046, 86.2029], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'BDPH Tracking'
}).addTo(map);

const route = [
  [22.8046, 86.2029],
  [22.8066, 86.2049],
  [22.8096, 86.2099],
  [22.8146, 86.2159],
  [22.8246, 86.2329],
  [22.8346, 86.2429]
];

const polyline = L.polyline(route, {
  color: 'lime',
  weight: 5
}).addTo(map);

map.fitBounds(polyline.getBounds());

const marker = L.marker(route[0]).addTo(map);

let playbackIndex = 0;
let playbackInterval = null;
let playbackSpeed = 1000;

document.getElementById("playBtn").addEventListener("click", () => {

  clearInterval(playbackInterval);

  playbackInterval = setInterval(() => {

    if (playbackIndex >= route.length) {
      clearInterval(playbackInterval);
      return;
    }

    marker.setLatLng(route[playbackIndex]);

    playbackIndex++;

  }, playbackSpeed);

});

document.getElementById("pauseBtn").addEventListener("click", () => {

  clearInterval(playbackInterval);

});

document.getElementById("speedSelect").addEventListener("change", (e) => {

  const speed = Number(e.target.value);

  if(speed === 1) playbackSpeed = 1000;
  if(speed === 2) playbackSpeed = 500;
  if(speed === 5) playbackSpeed = 200;
  if(speed === 10) playbackSpeed = 100;

});

document.getElementById("overspeedCount").innerText = 3;
document.getElementById("haltCount").innerText = 5;
document.getElementById("harshCount").innerText = 2;
document.getElementById("deviationCount").innerText = 1;
