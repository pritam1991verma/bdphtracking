const socket = io();

const state = {
  vehicles: [],
  selectedVehicleId: null,
  markers: new Map(),
  selectedRoute: null,
};

const map = L.map("map", {
  zoomControl: true,
  preferCanvas: true,
}).setView([22.824, 86.236], 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

function createMarkerIcon(status) {
  return L.divIcon({
    className: "",
    html: '<div class="marker-pin marker-' + status + '"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function formatStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function updateSummary(summary) {
  document.getElementById("totalVehicles").textContent = summary.total;
  document.getElementById("movingVehicles").textContent = summary.moving;
  document.getElementById("idleVehicles").textContent = summary.idle;
  document.getElementById("averageSpeed").textContent = summary.averageSpeed + " km/h";
  document.getElementById("lastUpdate").textContent = new Date(
    summary.lastUpdate,
  ).toLocaleTimeString();
}

function renderFleetList() {
  const searchText = document.getElementById("searchInput").value.trim().toLowerCase();
  const filtered = state.vehicles.filter((vehicle) => {
    const haystack = (
      vehicle.vehicle_no +
      " " +
      vehicle.driver +
      " " +
      vehicle.label
    ).toLowerCase();

    return haystack.includes(searchText);
  });

  document.getElementById("fleetCount").textContent = filtered.length + " vehicles visible";

  document.getElementById("fleetList").innerHTML = filtered
    .map((vehicle) => {
      const activeClass = vehicle.id === state.selectedVehicleId ? "active" : "";

      return `
        <button class="vehicle-item ${activeClass}" data-id="${vehicle.id}">
          <div class="vehicle-top">
            <div>
              <div class="vehicle-name">${vehicle.vehicle_no}</div>
              <div class="vehicle-meta">${vehicle.label} • ${vehicle.type}</div>
            </div>
            <div class="badge ${vehicle.status}">${formatStatus(vehicle.status)}</div>
          </div>
          <div class="vehicle-meta">Driver: ${vehicle.driver}</div>
          <div class="vehicle-meta">Speed: ${vehicle.speed} km/h • Fuel: ${vehicle.fuel}%</div>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll(".vehicle-item").forEach((button) => {
    button.addEventListener("click", () => focusVehicle(Number(button.dataset.id)));
  });
}

function syncMap() {
  state.vehicles.forEach((vehicle) => {
    const existing = state.markers.get(vehicle.id);
    const latLng = [vehicle.lat, vehicle.lng];
    const popupHtml =
      "<strong>" +
      vehicle.vehicle_no +
      "</strong><br/>Driver: " +
      vehicle.driver +
      "<br/>Speed: " +
      vehicle.speed +
      " km/h<br/>Fuel: " +
      vehicle.fuel +
      "%";

    if (existing) {
      existing.setLatLng(latLng);
      existing.setIcon(createMarkerIcon(vehicle.status));
      existing.setPopupContent(popupHtml);
      return;
    }

    const marker = L.marker(latLng, { icon: createMarkerIcon(vehicle.status) })
      .addTo(map)
      .bindPopup(popupHtml);

    marker.on("click", () => focusVehicle(vehicle.id));
    state.markers.set(vehicle.id, marker);
  });

  Array.from(state.markers.keys()).forEach((id) => {
    const stillExists = state.vehicles.some((vehicle) => vehicle.id === id);
    if (!stillExists) {
      map.removeLayer(state.markers.get(id));
      state.markers.delete(id);
    }
  });

  if (state.selectedVehicleId) {
    drawSelectedRoute();
  }
}

function drawSelectedRoute() {
  const vehicle = state.vehicles.find((item) => item.id === state.selectedVehicleId);

  if (state.selectedRoute) {
    map.removeLayer(state.selectedRoute);
    state.selectedRoute = null;
  }

  if (!vehicle) {
    return;
  }

  state.selectedRoute = L.polyline(
    vehicle.history.map((point) => [point.lat, point.lng]),
    {
      color: "#38bdf8",
      weight: 4,
      opacity: 0.9,
    },
  ).addTo(map);

  const bounds = L.latLngBounds(vehicle.history.map((point) => [point.lat, point.lng]));
  bounds.extend([vehicle.lat, vehicle.lng]);
  map.fitBounds(bounds.pad(0.35));

  document.getElementById("routeMeta").textContent =
    "Showing the last " +
    vehicle.history.length +
    " recorded points for " +
    vehicle.vehicle_no +
    ".";
}

function updateDetails() {
  const vehicle = state.vehicles.find((item) => item.id === state.selectedVehicleId);

  if (!vehicle) {
    return;
  }

  document.getElementById("detailSubtitle").textContent =
    "Tracking " + vehicle.vehicle_no + " in real time";
  document.getElementById("vehicleType").textContent = vehicle.type;
  document.getElementById("vehicleName").textContent = vehicle.vehicle_no;
  document.getElementById("vehicleDriver").textContent =
    "Driver: " +
    vehicle.driver +
    " • Last seen " +
    new Date(vehicle.last_seen).toLocaleTimeString();
  document.getElementById("vehicleStatusBadge").className = "badge " + vehicle.status;
  document.getElementById("vehicleStatusBadge").textContent = formatStatus(vehicle.status);
  document.getElementById("detailSpeed").textContent = vehicle.speed + " km/h";
  document.getElementById("detailFuel").textContent = vehicle.fuel + "%";
  document.getElementById("detailIgnition").textContent = vehicle.ignition ? "On" : "Off";
  document.getElementById("detailHeading").textContent = vehicle.heading + "°";
  document.getElementById("detailOdometer").textContent = vehicle.odometer + " km";
  document.getElementById("detailCoords").textContent =
    vehicle.lat.toFixed(5) + ", " + vehicle.lng.toFixed(5);
}

function applySnapshot(payload) {
  state.vehicles = payload.vehicles;

  if (!state.selectedVehicleId && state.vehicles.length) {
    state.selectedVehicleId = state.vehicles[0].id;
  }

  updateSummary(payload.summary);
  renderFleetList();
  syncMap();
  updateDetails();
}

function focusVehicle(id) {
  state.selectedVehicleId = id;
  renderFleetList();
  drawSelectedRoute();
  updateDetails();

  const marker = state.markers.get(id);
  if (marker) {
    marker.openPopup();
  }
}

function loadBilling() {
  fetch("/billing")
    .then((res) => res.json())
    .then((data) => {
      document.getElementById("billingStatus").textContent = data.status;
      document.getElementById("billingMeta").textContent =
        "User: " + data.username + " • Expiry: " + data.expiry;
    });
}

function login() {
  fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "1234" }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        alert("Login failed");
        return;
      }

      document.getElementById("loginStatus").textContent = "Logged in";
      document.getElementById("loginMeta").textContent =
        "Welcome " + data.user.username + ". Account expiry: " + data.user.expiry;
      alert("Login success");
    });
}

function payNow() {
  fetch("/pay", { method: "POST" })
    .then((res) => res.json())
    .then((data) => {
      alert(data.message);
      loadBilling();
    });
}

document.getElementById("searchInput").addEventListener("input", renderFleetList);
document.getElementById("loginBtn").addEventListener("click", login);
document.getElementById("renewBtn").addEventListener("click", payNow);

socket.on("positions", applySnapshot);
loadBilling();
