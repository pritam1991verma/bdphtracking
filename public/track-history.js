console.log("Track History JS Loaded");

const map = L.map("historyMap").setView([22.8046, 86.2029], 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

/* =========================
   VEHICLE ICON
========================= */

const vehicleIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/744/744465.png",
  iconSize: [45, 45],
  iconAnchor: [22, 22]
});

/* =========================
   STOP ICON
========================= */

const stopIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1828/1828843.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

/* =========================
   OVERSPEED ICON
========================= */

const overspeedIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/565/565340.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

/* =========================
   HARSH BRAKE ICON
========================= */

const harshIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3524/3524659.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

/* =========================
   DUMMY GPS DATA
========================= */

const gpsData = [

{
vehicle:"JH05AB1234",
lat:22.8046,
lng:86.2029,
speed:22,
time:"2026-05-13 08:00:00"
},

{
vehicle:"JH05AB1234",
lat:22.8060,
lng:86.2040,
speed:40,
time:"2026-05-13 08:05:00"
},

{
vehicle:"JH05AB1234",
lat:22.8080,
lng:86.2060,
speed:85,
time:"2026-05-13 08:10:00"
},

{
vehicle:"JH05AB1234",
lat:22.8100,
lng:86.2080,
speed:82,
time:"2026-05-13 08:12:00"
},

{
vehicle:"JH05AB1234",
lat:22.8120,
lng:86.2110,
speed:0,
time:"2026-05-13 08:20:00"
},

{
vehicle:"JH05AB1234",
lat:22.8120,
lng:86.2110,
speed:0,
time:"2026-05-13 08:45:00"
},

{
vehicle:"JH05AB1234",
lat:22.8140,
lng:86.2140,
speed:18,
time:"2026-05-13 08:47:00",
harsh:true
},

{
vehicle:"JH05AB1234",
lat:22.8170,
lng:86.2200,
speed:36,
time:"2026-05-13 08:55:00"
}

];

/* =========================
   POLYLINE
========================= */

const routeCoords = gpsData.map(point => [point.lat, point.lng]);

const routeLine = L.polyline(routeCoords, {
  color: "lime",
  weight: 5
}).addTo(map);

map.fitBounds(routeLine.getBounds());

/* =========================
   VEHICLE MARKER
========================= */

const vehicleMarker = L.marker(routeCoords[0], {
  icon: vehicleIcon
}).addTo(map);

/* =========================
   PLAYBACK VARIABLES
========================= */

let currentIndex = 0;
let playbackInterval = null;
let playbackSpeed = 1000;
let playbackRunning = false;

/* =========================
   HALT DURATION
========================= */

function getHaltDuration(start, end) {

  const diff =
    (new Date(end) - new Date(start)) / 60000;

  return `${diff} Minutes`;
}

/* =========================
   EVENT MARKERS
========================= */

function createEventMarkers() {

  for (let i = 0; i < gpsData.length; i++) {

    const point = gpsData[i];

    /* OVERSPEED */

    if (point.speed > 80) {

      L.marker([point.lat, point.lng], {
        icon: overspeedIcon
      })
      .addTo(map)
      .bindPopup(`
        <b>Overspeed Alert</b><br>
        Vehicle: ${point.vehicle}<br>
        Speed: ${point.speed} km/h<br>
        Time: ${point.time}
      `);
    }

    /* HARSH BRAKING */

    if (point.harsh) {

      L.marker([point.lat, point.lng], {
        icon: harshIcon
      })
      .addTo(map)
      .bindPopup(`
        <b>Harsh Braking</b><br>
        Vehicle: ${point.vehicle}<br>
        Time: ${point.time}
      `);
    }

    /* HALT */

    if (
      point.speed === 0 &&
      gpsData[i + 1] &&
      gpsData[i + 1].speed === 0
    ) {

      const duration = getHaltDuration(
        point.time,
        gpsData[i + 1].time
      );

      L.marker([point.lat, point.lng], {
        icon: stopIcon
      })
      .addTo(map)
      .bindPopup(`
        <b>Vehicle Halted</b><br>
        Vehicle: ${point.vehicle}<br>
        Duration: ${duration}<br>
        Start: ${point.time}<br>
        End: ${gpsData[i + 1].time}
      `);
    }
  }
}

createEventMarkers();

/* =========================
   MOVE VEHICLE
========================= */

function moveVehicle() {

  if (currentIndex >= gpsData.length) {

    clearInterval(playbackInterval);

    playbackRunning = false;

    return;
  }

  const point = gpsData[currentIndex];

  vehicleMarker.setLatLng([
    point.lat,
    point.lng
  ]);

  vehicleMarker.bindPopup(`
    <b>${point.vehicle}</b><br>
    Speed: ${point.speed} km/h<br>
    Time: ${point.time}
  `);

  vehicleMarker.openPopup();

  map.panTo([
    point.lat,
    point.lng
  ]);

  currentIndex++;
}

/* =========================
   PLAY BUTTON
========================= */

document.getElementById("playBtn").addEventListener("click", () => {

  if (playbackRunning) return;

  playbackRunning = true;

  playbackInterval = setInterval(
    moveVehicle,
    playbackSpeed
  );
});

/* =========================
   PAUSE BUTTON
========================= */

document.getElementById("pauseBtn").addEventListener("click", () => {

  clearInterval(playbackInterval);

  playbackRunning = false;
});

/* =========================
   SPEED CONTROL
========================= */

document.getElementById("speedSelect").addEventListener("change", (e) => {

  const speed = Number(e.target.value);

  playbackSpeed = 1000 / speed;

  if (playbackRunning) {

    clearInterval(playbackInterval);

    playbackInterval = setInterval(
      moveVehicle,
      playbackSpeed
    );
  }
});

/* =========================
   LOAD BUTTON
========================= */

document.getElementById("loadHistoryBtn").addEventListener("click", () => {

  currentIndex = 0;

  vehicleMarker.setLatLng(routeCoords[0]);

  map.fitBounds(routeLine.getBounds());

});
