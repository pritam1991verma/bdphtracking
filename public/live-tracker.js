const currentUser = renderTopbar("live-tracker");
document.getElementById("loginMeta").textContent =
  currentUser.name + " (" + currentUser.role + ") - account expires " + currentUser.expiry;

const socket = io();
const TRAIL_COLORS = ["#38bdf8", "#22c55e", "#f59e0b", "#f97316", "#8b5cf6", "#ec4899"];
const state = {
  vehicles: [],
  selectedVehicleId: null,
  markers: new Map(),
  trailLayers: new Map(),
  activeFilter: "moving",
  currentBaseLayer: "street",
  selectedHistoryIds: new Set(),
};

const map = L.map("map", {
  zoomControl: true,
  preferCanvas: true,
}).setView([22.824, 86.236], 12);

const tileLayers = {
  street: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }),
  terrain: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 17,
    attribution: "&copy; OpenTopoMap contributors",
  }),
  satellite: L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri",
    },
  ),
};

tileLayers.street.addTo(map);

function createMarkerIcon(status) {
  return L.divIcon({
    className: "",
    html: '<div class="marker-pin marker-' + getStatusTone(status) + '"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function getVisibleVehicles() {
  const searchText = document.getElementById("searchInput").value.trim().toLowerCase();

  return state.vehicles.filter((vehicle) => {
    const matchesFilter = state.activeFilter === "all" ? true : vehicle.status === state.activeFilter;
    const haystack =
      (vehicle.vehicle_no + " " + vehicle.driver + " " + vehicle.label + " " + (vehicle.imei || "")).toLowerCase();
    return matchesFilter && haystack.includes(searchText);
  });
}

function updateSummary(summary) {
  document.getElementById("totalVehicles").textContent = summary.total || 0;
  document.getElementById("movingVehicles").textContent = summary.moving || 0;
  document.getElementById("idleVehicles").textContent = summary.idle || 0;
  document.getElementById("parkedVehicles").textContent = summary.parked || 0;
  document.getElementById("stoppedVehicles").textContent = summary.stopped || 0;
  document.getElementById("breakdownVehicles").textContent = summary.breakdown || 0;
  document.getElementById("offlineVehicles").textContent = summary.offline || 0;
  document.getElementById("noGpsVehicles").textContent = summary["no-gps"] || 0;
  document.getElementById("disconnectedVehicles").textContent = summary.disconnected || 0;
  document.getElementById("allVehiclesVisible").textContent = summary.total || 0;
}

function syncStatusCards() {
  document.querySelectorAll(".status-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.status === state.activeFilter);
  });

  document.getElementById("activeFilterLabel").textContent =
    "Showing " + formatStatus(state.activeFilter) + " vehicles on the map and in the list.";
}

function renderFleetList() {
  const filtered = getVisibleVehicles();
  document.getElementById("fleetCount").textContent = filtered.length + " vehicles visible";
  document.getElementById("fleetList").innerHTML = filtered
    .map((vehicle) => {
      const activeClass = vehicle.id === state.selectedVehicleId ? "active" : "";
      const checked = state.selectedHistoryIds.has(vehicle.id) ? "checked" : "";

      return `
        <div class="vehicle-item ${activeClass}" data-id="${vehicle.id}">
          <div class="vehicle-top">
            <div>
              <div class="vehicle-name">${vehicle.vehicle_no}</div>
              <div class="vehicle-meta">${vehicle.label} | ${vehicle.type}</div>
            </div>
            <div class="badge ${getStatusTone(vehicle.status)}">${formatStatus(vehicle.status)}</div>
          </div>
          <div class="vehicle-meta">Driver: ${vehicle.driver}</div>
          <div class="vehicle-meta">GPS IMEI: ${vehicle.imei || "-"}</div>
          <div class="vehicle-meta">Speed: ${vehicle.speed} km/h | Fuel: ${vehicle.fuel}% | AdBlue: ${vehicle.adblue}%</div>
          <label class="trip-toggle">
            <input class="trip-vehicle-toggle" type="checkbox" data-id="${vehicle.id}" ${checked} />
            <span>Add to trip history</span>
          </label>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll(".vehicle-item").forEach((item) => {
    item.addEventListener("click", (event) => {
      if (event.target.closest(".trip-toggle")) {
        return;
      }
      focusVehicle(Number(item.dataset.id));
    });
  });

  document.querySelectorAll(".trip-vehicle-toggle").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const id = Number(event.target.dataset.id);
      if (event.target.checked) {
        state.selectedHistoryIds.add(id);
      } else {
        state.selectedHistoryIds.delete(id);
      }
      renderTripHistoryList();
      drawTripHistory();
    });
  });
}

function renderTripHistoryList() {
  const selectedVehicles = state.vehicles.filter((vehicle) => state.selectedHistoryIds.has(vehicle.id));
  document.getElementById("tripHistoryList").innerHTML = selectedVehicles.length
    ? selectedVehicles
        .map(
          (vehicle, index) => `
            <label class="trip-history-chip" style="--trail-color: ${TRAIL_COLORS[index % TRAIL_COLORS.length]}">
              <input class="trip-history-inline-toggle" type="checkbox" data-id="${vehicle.id}" checked />
              <span>${vehicle.vehicle_no} | ${formatStatus(vehicle.status)}</span>
            </label>
          `,
        )
        .join("")
    : '<div class="empty-state">No trip history selected yet.</div>';

  document.querySelectorAll(".trip-history-inline-toggle").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const id = Number(event.target.dataset.id);
      state.selectedHistoryIds.delete(id);
      renderFleetList();
      renderTripHistoryList();
      drawTripHistory();
    });
  });
}

function syncMap() {
  const visibleIds = new Set(getVisibleVehicles().map((vehicle) => vehicle.id));

  state.vehicles.forEach((vehicle) => {
    const existing = state.markers.get(vehicle.id);
    const latLng = [vehicle.lat, vehicle.lng];
    const popupHtml =
      "<strong>" +
      vehicle.vehicle_no +
      "</strong><br/>Driver: " +
      vehicle.driver +
      "<br/>IMEI: " +
      (vehicle.imei || "-") +
      "<br/>Status: " +
      formatStatus(vehicle.status) +
      "<br/>Speed: " +
      vehicle.speed +
      " km/h<br/>Ignition: " +
      (vehicle.ignition ? "On" : "Off");

    if (existing) {
      existing.setLatLng(latLng);
      existing.setIcon(createMarkerIcon(vehicle.status));
      existing.setPopupContent(popupHtml);
      if (visibleIds.has(vehicle.id)) {
        existing.addTo(map);
      } else {
        map.removeLayer(existing);
      }
      return;
    }

    const marker = L.marker(latLng, { icon: createMarkerIcon(vehicle.status) }).bindPopup(popupHtml);
    marker.on("click", () => focusVehicle(vehicle.id));
    state.markers.set(vehicle.id, marker);

    if (visibleIds.has(vehicle.id)) {
      marker.addTo(map);
    }
  });

  drawTripHistory();
}

async function drawTripHistory() {
  const ids = Array.from(state.selectedHistoryIds);
  state.trailLayers.forEach((layer) => map.removeLayer(layer));
  state.trailLayers.clear();

  if (!ids.length) {
    document.getElementById("routeMeta").textContent =
      "Select one or more vehicles to view trip history on the map.";
    return;
  }

  const histories = await fetchJson("/trip-history?vehicleIds=" + ids.join(","));
  const allPoints = [];

  histories.forEach((vehicle, index) => {
    const points = vehicle.history.map((point) => [point.lat, point.lng]);
    if (!points.length) {
      return;
    }

    points.forEach((point) => allPoints.push(point));
    const layer = L.polyline(points, {
      color: TRAIL_COLORS[index % TRAIL_COLORS.length],
      weight: 4,
      opacity: 0.88,
    }).addTo(map);

    state.trailLayers.set(vehicle.id, layer);
  });

  if (allPoints.length) {
    map.fitBounds(L.latLngBounds(allPoints).pad(0.2));
  }

  document.getElementById("routeMeta").textContent =
    "Showing trip history for " + histories.length + " vehicle(s) at the same time.";
}

function updateDetails() {
  const vehicle = state.vehicles.find((item) => item.id === state.selectedVehicleId);
  if (!vehicle) {
    return;
  }

  document.getElementById("detailSubtitle").textContent = "Tracking " + vehicle.vehicle_no + " in real time";
  document.getElementById("vehicleType").textContent = vehicle.type + " | AIS 140";
  document.getElementById("vehicleName").textContent = vehicle.vehicle_no;
  document.getElementById("vehicleDriver").textContent =
    "Driver: " +
    vehicle.driver +
    " | IMEI " +
    (vehicle.imei || "-") +
    " | Last seen " +
    new Date(vehicle.last_seen).toLocaleTimeString();
  document.getElementById("vehicleStatusBadge").className = "badge " + getStatusTone(vehicle.status);
  document.getElementById("vehicleStatusBadge").textContent = formatStatus(vehicle.status);
  document.getElementById("detailSpeed").textContent = vehicle.speed + " km/h";
  document.getElementById("detailFuel").textContent = vehicle.fuel + "%";
  document.getElementById("detailAdblue").textContent = vehicle.adblue + "%";
  document.getElementById("detailIgnition").textContent = vehicle.ignition ? "On" : "Off";
  document.getElementById("detailHeading").textContent = vehicle.heading + " deg";
  document.getElementById("detailOdometer").textContent = vehicle.odometer + " km";
  document.getElementById("detailGps").textContent = vehicle.gps ? "Connected" : "Signal Lost";
  document.getElementById("detailCoords").textContent = vehicle.lat.toFixed(5) + ", " + vehicle.lng.toFixed(5);
}

function focusVehicle(id) {
  state.selectedVehicleId = id;
  state.selectedHistoryIds.add(id);
  renderFleetList();
  renderTripHistoryList();
  drawTripHistory();
  updateDetails();

  const marker = state.markers.get(id);
  if (marker) {
    marker.addTo(map);
    marker.openPopup();
  }
}

function applySnapshot(payload) {
  state.vehicles = payload.vehicles;
  const visibleVehicles = getVisibleVehicles();

  if (!state.selectedVehicleId && visibleVehicles.length) {
    state.selectedVehicleId = visibleVehicles[0].id;
  }

  if (
    state.selectedVehicleId &&
    !state.vehicles.some((vehicle) => vehicle.id === state.selectedVehicleId)
  ) {
    state.selectedVehicleId = visibleVehicles[0] ? visibleVehicles[0].id : null;
  }

  state.selectedHistoryIds.forEach((id) => {
    if (!state.vehicles.some((vehicle) => vehicle.id === id)) {
      state.selectedHistoryIds.delete(id);
    }
  });

  updateSummary(payload.summary);
  syncStatusCards();
  renderFleetList();
  renderTripHistoryList();
  syncMap();
  updateDetails();
}

async function loadBilling() {
  const data = await fetchJson("/billing?userId=" + currentUser.id);
  document.getElementById("billingStatus").textContent = data.status;
  document.getElementById("billingMeta").textContent =
    "User: " + data.user.username + " | Expiry: " + data.user.expiry;
}

function switchBaseLayer(view) {
  if (state.currentBaseLayer === view) {
    return;
  }

  map.removeLayer(tileLayers[state.currentBaseLayer]);
  tileLayers[view].addTo(map);
  state.currentBaseLayer = view;

  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

document.getElementById("searchInput").addEventListener("input", () => {
  renderFleetList();
  renderTripHistoryList();
  syncMap();
});

document.getElementById("renewBtn").addEventListener("click", async () => {
  await fetchJson("/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: currentUser.id }),
  });
  showToast("Billing renewed successfully", "success");
  await loadBilling();
});

document.getElementById("clearTripSelectionBtn").addEventListener("click", () => {
  state.selectedHistoryIds.clear();
  renderFleetList();
  renderTripHistoryList();
  drawTripHistory();
});

document.querySelectorAll(".status-card").forEach((card) => {
  card.addEventListener("click", () => {
    state.activeFilter = card.dataset.status;
    const visible = getVisibleVehicles();
    state.selectedVehicleId = visible[0] ? visible[0].id : null;
    syncStatusCards();
    renderFleetList();
    renderTripHistoryList();
    syncMap();
    updateDetails();
  });
});

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => switchBaseLayer(button.dataset.view));
});

document.getElementById("fullscreenBtn").addEventListener("click", async () => {
  const mapWrap = document.getElementById("mapWrap");

  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else {
    await mapWrap.requestFullscreen();
  }

  setTimeout(() => map.invalidateSize(), 200);
});

document.addEventListener("fullscreenchange", () => {
  setTimeout(() => map.invalidateSize(), 200);
});

socket.on("positions", applySnapshot);
loadBilling();
