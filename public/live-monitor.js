const currentUser = renderTopbar("live-tracker");
const socket = io();
const TRAIL_COLORS = ["#38bdf8", "#22c55e", "#f59e0b", "#f97316", "#8b5cf6", "#ec4899"];

const state = {
  vehicles: [],
  markers: new Map(),
  trailLayers: new Map(),
  geofenceLayer: null,
  routeLayer: null,
  playbackMarker: null,
  selectedVehicleId: null,
  selectedHistoryIds: new Set(),
  activeFilter: "all",
  currentBaseLayer: "street",
  initialBoundsSet: false,
  activeMapAction: "live",
  geofencePoints: [],
  routePoints: [],
  playbackTimer: null,
  vehicleIcons: {},
  nearbyCategory: "fuel",
  requestedVehicleId: Number(new URLSearchParams(window.location.search).get("vehicleId")) || null,
  initialQueryFocusDone: false,
};

function getSummaryFromVehicles(vehicles) {
  return {
    total: vehicles.length,
    moving: vehicles.filter((v) => v.status === "moving").length,
    stopped: vehicles.filter((v) => v.status === "stopped").length,
    parked: vehicles.filter((v) => v.status === "parked").length,
    idle: vehicles.filter((v) => v.status === "idle").length,
    offline: vehicles.filter((v) => v.status === "offline").length,
    breakdown: vehicles.filter((v) => v.status === "breakdown").length,
    "no-gps": vehicles.filter((v) => v.status === "no-gps").length,
    disconnected: vehicles.filter((v) => v.status === "disconnected").length,
  };
}

const map = L.map("map", {
  zoomControl: true,
  preferCanvas: true,
}).setView([22.824, 86.236], 11);

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
  return createVehicleIcon(null, status);
}

function getVehicleGlyph(type) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("bus")) {
    return "BUS";
  }
  if (normalized.includes("van")) {
    return "VAN";
  }
  if (normalized.includes("car")) {
    return "CAR";
  }
  return "CAR";
}

function getVehicleTypeKey(type) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("school")) {
    return "school bus";
  }
  if (normalized.includes("staff")) {
    return "staff bus";
  }
  if (normalized.includes("mini")) {
    return "mini bus";
  }
  if (normalized.includes("bus")) {
    return "bus";
  }
  if (normalized.includes("van")) {
    return "van";
  }
  return "car";
}

function createVehicleIcon(type, status) {
  const typeKey = getVehicleTypeKey(type);
  const normalized = String(type || "").toLowerCase();
  const categoryClass = normalized.includes("school")
    ? "category-school"
    : normalized.includes("staff")
      ? "category-staff"
      : normalized.includes("mini")
        ? "category-mini"
        : normalized.includes("bus")
          ? "category-bus"
          : normalized.includes("van")
      ? "category-van"
      : "category-car";
  const customIcon = state.vehicleIcons[typeKey];

  return L.divIcon({
    className: "vehicle-marker-shell",
    html: customIcon
      ? '<div class="vehicle-marker vehicle-marker-custom marker-' +
        getStatusTone(status) +
        " " +
        categoryClass +
        '"><img class="vehicle-marker-image" src="' +
        customIcon +
        '" alt="' +
        typeKey +
        ' icon" /></div>'
      : '<div class="vehicle-marker marker-' +
        getStatusTone(status) +
        " " +
        categoryClass +
        '">' +
        '<span class="vehicle-marker-label">' +
        getVehicleGlyph(type) +
        "</span>" +
        "</div>",
    iconSize: customIcon ? [48, 48] : [42, 22],
    iconAnchor: customIcon ? [24, 24] : [21, 11],
  });
}

function getLastSeenLabel(vehicle) {
  const timestamp = vehicle.last_seen || vehicle.updated_at;
  return timestamp ? new Date(timestamp).toLocaleString() : "Waiting for sync";
}

function createVehiclePopupHtml(vehicle) {
  const smartNote = vehicle.breakdownActive
    ? "Breakdown active. Repair duration is being tracked."
    : vehicle.fuel <= 25
      ? "Fuel is low. Consider refuel before next long movement."
      : vehicle.adblue <= 25
        ? "AdBlue is low. Refill planning is recommended."
        : vehicle.status === "moving"
          ? "Vehicle is moving with live telemetry and route activity."
          : "Vehicle is stable and ready for map actions.";

  return `
    <div class="tracker-vehicle-popup">
      <div class="tracker-vehicle-popup-head">
        <div>
          <div class="tracker-vehicle-popup-kicker">${vehicle.type} | AIS 140</div>
          <strong>${vehicle.vehicle_no}</strong>
          <div class="small">IMEI ${vehicle.imei || "-"} | ${vehicle.driver}</div>
        </div>
        <span class="status-pill ${getStatusTone(vehicle.status)}">${formatStatus(vehicle.status)}</span>
      </div>
      <div class="tracker-vehicle-popup-note">${smartNote}</div>
      <div class="tracker-vehicle-popup-grid">
        <div><span>Speed</span><strong>${vehicle.speed} km/h</strong></div>
        <div><span>Fuel</span><strong>${vehicle.fuel}%</strong></div>
        <div><span>AdBlue</span><strong>${vehicle.adblue}%</strong></div>
        <div><span>Ignition</span><strong>${vehicle.ignition ? "On" : "Off"}</strong></div>
      </div>
      <div class="tracker-vehicle-popup-meta">
        Last seen: ${getLastSeenLabel(vehicle)}${vehicle.breakdownActive && vehicle.breakdownAt ? " | Breakdown at " + new Date(vehicle.breakdownAt).toLocaleString() : ""}
      </div>
      <div class="tracker-vehicle-popup-actions">
        <button class="tracker-popup-action primary" type="button" data-popup-action="open-map" data-id="${vehicle.id}">Open on Map</button>
        <button class="tracker-popup-action" type="button" data-popup-action="trip-history" data-id="${vehicle.id}">Trip</button>
        <button class="tracker-popup-action" type="button" data-popup-action="geofence" data-id="${vehicle.id}">Geofence</button>
        <button class="tracker-popup-action" type="button" data-popup-action="route" data-id="${vehicle.id}">Route</button>
        ${
          vehicle.breakdownActive
            ? `<button class="tracker-popup-action success" type="button" data-popup-action="fixed" data-id="${vehicle.id}">Mark Fixed</button>`
            : `<button class="tracker-popup-action danger" type="button" data-popup-action="breakdown" data-id="${vehicle.id}">Breakdown</button>`
        }
      </div>
    </div>
  `;
}

function getFilteredVehicles() {
  const searchText = document.getElementById("searchInput").value.trim().toLowerCase();
  return state.vehicles.filter((vehicle) => {
    const matchesStatus = state.activeFilter === "all" ? true : vehicle.status === state.activeFilter;
    const haystack =
      (vehicle.vehicle_no + " " + vehicle.label + " " + vehicle.driver + " " + (vehicle.imei || "")).toLowerCase();
    return matchesStatus && haystack.includes(searchText);
  });
}

function updateSummary(summary) {
  document.getElementById("totalVehicles").textContent = summary.total || 0;
  document.getElementById("allVehiclesVisible").textContent = getFilteredVehicles().length;
  document.getElementById("movingVehicles").textContent = summary.moving || 0;
  document.getElementById("stoppedVehicles").textContent = summary.stopped || 0;
  document.getElementById("parkedVehicles").textContent = summary.parked || 0;
  document.getElementById("idleVehicles").textContent = summary.idle || 0;
  document.getElementById("offlineVehicles").textContent = summary.offline || 0;
  document.getElementById("breakdownVehicles").textContent = summary.breakdown || 0;
  document.getElementById("noGpsVehicles").textContent = summary["no-gps"] || 0;
  document.getElementById("disconnectedVehicles").textContent = summary.disconnected || 0;
  document.getElementById("allVehiclesHint").textContent =
    (summary.moving || 0) + " moving, " + ((summary.parked || 0) + (summary.stopped || 0)) + " halted or parked.";
}

function syncFilterButtons() {
  document.querySelectorAll(".tracker-stat").forEach((button) => {
    button.classList.toggle("active", button.dataset.status === state.activeFilter);
  });
  document.getElementById("statusSelect").value = state.activeFilter;
}

function renderVehicleSelect() {
  const select = document.getElementById("vehicleSelect");
  const filtered = getFilteredVehicles();
  select.innerHTML =
    '<option value="">Select Vehicle</option>' +
    filtered
      .map(
        (vehicle) =>
          `<option value="${vehicle.id}" ${vehicle.id === state.selectedVehicleId ? "selected" : ""}>${vehicle.vehicle_no} | ${vehicle.label}</option>`,
      )
      .join("");
}

function renderTripHistoryList() {
  const vehicles = state.vehicles.filter((vehicle) => state.selectedHistoryIds.has(vehicle.id));
  document.getElementById("tripHistoryList").innerHTML = vehicles.length
    ? vehicles
        .map(
          (vehicle, index) => `
            <label class="trip-history-chip" style="--trail-color: ${TRAIL_COLORS[index % TRAIL_COLORS.length]}">
              <input class="trip-history-toggle" type="checkbox" data-id="${vehicle.id}" checked />
              <span>${vehicle.vehicle_no} | ${formatStatus(vehicle.status)}</span>
            </label>
          `,
        )
        .join("")
    : '<div class="empty-state">No trip history selected.</div>';

  document.querySelectorAll(".trip-history-toggle").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      state.selectedHistoryIds.delete(Number(checkbox.dataset.id));
      renderTripHistoryList();
      drawTripHistory();
    });
  });
}

function handleModuleAction(action) {
  if (action === "recenter" || action === "live") {
    const visible = getFilteredVehicles().map((vehicle) => [vehicle.lat, vehicle.lng]);
    if (visible.length) {
      map.fitBounds(L.latLngBounds(visible).pad(0.12));
    }
    return;
  }

  if (action === "focus-critical") {
    state.activeFilter = "breakdown";
    state.activeMapAction = "breakdown";
  } else if (action === "focus-health") {
    state.activeFilter = "all";
  } else if (action === "focus-moving") {
    state.activeFilter = "moving";
  } else if (action === "focus-fuel") {
    state.activeFilter = "all";
    const lowFuelVehicle = [...state.vehicles].sort((a, b) => a.fuel - b.fuel)[0];
    if (lowFuelVehicle) {
      focusVehicle(lowFuelVehicle.id);
    }
  } else if (action === "focus-selected") {
    if (state.selectedVehicleId) {
      focusVehicle(state.selectedVehicleId);
    }
  } else if (action === "focus-reminders") {
    state.activeFilter = "offline";
  } else if (action === "show-history") {
    drawTripHistory();
  }

  syncFilterButtons();
  renderVehicleSelect();
  syncMap();
  updateSummary(getSummaryFromVehicles(state.vehicles));
  updateMapActionStatus();
}

function updateMapActionStatus() {
  const selected = state.vehicles.find((vehicle) => vehicle.id === state.selectedVehicleId);
  document.querySelectorAll(".tracker-command-btn").forEach((button) => {
    const action = button.dataset.sideAction;
    const resolvedAction = action === "breakdown" && selected?.breakdownActive ? "fixed" : action;
    button.classList.toggle("active", resolvedAction === state.activeMapAction || (resolvedAction === "nearby" && state.activeMapAction === "nearby"));
    if (action === "breakdown") {
      button.textContent = selected && selected.breakdownActive ? "Mark Fixed" : "Breakdown";
      button.classList.toggle("success", Boolean(selected && selected.breakdownActive));
      button.classList.toggle("danger", !selected || !selected.breakdownActive);
    }
  });
}

function createNearbyPlaces(vehicle, category, radiusKm) {
  const catalog = {
    fuel: [
      ["BP Fuel Hub", "Fuel Pump"],
      ["Highway Diesel Point", "Fuel Pump"],
      ["City Transit Fuel Bay", "Fuel Pump"],
    ],
    def: [
      ["BlueChem Urea Station", "DEF Station"],
      ["Clean Route AdBlue Center", "DEF Station"],
      ["Emission Care Point", "DEF Station"],
    ],
    atm: [
      ["SBI ATM", "ATM"],
      ["HDFC Cash Point", "ATM"],
      ["Axis Bank ATM", "ATM"],
    ],
    workshop: [
      ["Prime Fleet Workshop", "Workshop"],
      ["Transit Service Garage", "Workshop"],
      ["Rapid Repair Bay", "Workshop"],
    ],
  };

  const base = catalog[category] || catalog.fuel;
  return base.map((item, index) => ({
    name: item[0],
    type: item[1],
    distance: Number((Math.min(radiusKm - 0.8, 1.8 + index * (radiusKm / 6))).toFixed(1)),
    address:
      vehicle.label +
      " corridor, sector " +
      (index + 2) +
      ", " +
      vehicle.vehicle_no,
    phone: "9" + String(830000000 + vehicle.id * 1000 + index * 77),
  }));
}

function renderNearbyList() {
  const vehicle = state.vehicles.find((item) => item.id === state.selectedVehicleId);
  const container = document.getElementById("nearbyList");
  const meta = document.getElementById("nearbyMeta");
  if (!vehicle) {
    meta.textContent = "Select a vehicle to explore nearby services.";
    container.innerHTML = '<div class="empty-state">Nearby points will appear here for the selected vehicle.</div>';
    return;
  }

  const radiusKm = Number(document.getElementById("nearbyRadiusSelect").value || 10);
  const places = createNearbyPlaces(vehicle, state.nearbyCategory, radiusKm);
  const categoryLabels = {
    fuel: "Fuel pumps",
    def: "DEF / Urea stations",
    atm: "ATMs",
    workshop: "Workshops",
  };
  meta.textContent = categoryLabels[state.nearbyCategory] + " within " + radiusKm + " km of " + vehicle.vehicle_no + ".";
  container.innerHTML = places
    .map(
      (place) => `
        <div class="tracker-nearby-item">
          <div class="tracker-nearby-item-head">
            <div>
              <strong>${place.name}</strong>
              <div class="small">${place.type}</div>
            </div>
            <span class="tracker-nearby-distance">${place.distance} km</span>
          </div>
          <div class="small">${place.address}</div>
          <div class="tracker-nearby-item-meta">
            <span>${place.phone}</span>
            <button class="tracker-nearby-maplink" type="button" data-nearby-focus="${place.distance}">Open on Map</button>
          </div>
        </div>
      `,
    )
    .join("");

  container.querySelectorAll("[data-nearby-focus]").forEach((button, index) => {
    button.addEventListener("click", () => {
      const offset = 0.01 + index * 0.004;
      map.flyTo([vehicle.lat + offset, vehicle.lng + offset], Math.max(map.getZoom(), 12), { duration: 0.6 });
      showToast("Nearby point highlighted for " + vehicle.vehicle_no, "info");
    });
  });
}

function showActionPanel(title, subtitle, bodyHtml) {
  document.getElementById("actionPanelTitle").textContent = title;
  document.getElementById("actionPanelSubtitle").textContent = subtitle;
  document.getElementById("actionPanelBody").innerHTML = bodyHtml;
  document.getElementById("mapActionPanel").classList.remove("hidden");
}

function hideActionPanel() {
  document.getElementById("mapActionPanel").classList.add("hidden");
}

function clearMapConstruction() {
  state.geofencePoints = [];
  state.routePoints = [];
}

function updateConstructionLayers() {
  if (state.geofenceLayer) {
    map.removeLayer(state.geofenceLayer);
    state.geofenceLayer = null;
  }
  if (state.routeLayer) {
    map.removeLayer(state.routeLayer);
    state.routeLayer = null;
  }

  if (state.activeMapAction === "geofence" && state.geofencePoints.length) {
    if (state.geofencePoints.length >= 3) {
      state.geofenceLayer = L.polygon(state.geofencePoints, {
        color: "#2563eb",
        weight: 2,
        fillColor: "#60a5fa",
        fillOpacity: 0.18,
      }).addTo(map);
    } else {
      state.geofenceLayer = L.polyline(state.geofencePoints, {
        color: "#2563eb",
        weight: 2,
        dashArray: "6,6",
      }).addTo(map);
    }
  }

  if (state.activeMapAction === "route" && state.routePoints.length) {
    state.routeLayer = L.polyline(state.routePoints, {
      color: "#f97316",
      weight: 3,
      dashArray: "10,6",
    }).addTo(map);
  }
}

function bindActionPanelEvents() {
  const selected = state.vehicles.find((vehicle) => vehicle.id === state.selectedVehicleId);

  const saveGeofenceBtn = document.getElementById("saveGeofenceBtn");
  if (saveGeofenceBtn) {
    saveGeofenceBtn.addEventListener("click", async () => {
      try {
        if (state.geofencePoints.length < 3) {
          showToast("Add at least three points on map for geofence", "error");
          return;
        }
        const name = document.getElementById("geofenceName").value.trim();
        if (!name) {
          showToast("Enter geofence name", "error");
          return;
        }
        await fetchJson("/vehicles/" + selected.id + "/geofence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, points: state.geofencePoints }),
        });
        showToast("Geofence saved for " + selected.vehicle_no, "success");
        state.activeMapAction = "live";
        clearMapConstruction();
        updateConstructionLayers();
        hideActionPanel();
        updateMapActionStatus();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  }

  const clearGeofenceBtn = document.getElementById("clearGeofenceBtn");
  if (clearGeofenceBtn) {
    clearGeofenceBtn.addEventListener("click", () => {
      clearMapConstruction();
      updateConstructionLayers();
    });
  }

  const saveRouteBtn = document.getElementById("saveRouteBtn");
  if (saveRouteBtn) {
    saveRouteBtn.addEventListener("click", async () => {
      try {
        if (state.routePoints.length < 2) {
          showToast("Add at least two points on map for route", "error");
          return;
        }
        const name = document.getElementById("routeName").value.trim();
        if (!name) {
          showToast("Enter route name", "error");
          return;
        }
        await fetchJson("/vehicles/" + selected.id + "/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, points: state.routePoints }),
        });
        showToast("Route assigned to " + selected.vehicle_no, "success");
        state.activeMapAction = "live";
        clearMapConstruction();
        updateConstructionLayers();
        hideActionPanel();
        updateMapActionStatus();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  }

  const clearRouteBtn = document.getElementById("clearRouteBtn");
  if (clearRouteBtn) {
    clearRouteBtn.addEventListener("click", () => {
      clearMapConstruction();
      updateConstructionLayers();
    });
  }

  const saveBreakdownBtn = document.getElementById("saveBreakdownBtn");
  if (saveBreakdownBtn) {
    saveBreakdownBtn.addEventListener("click", async () => {
      try {
        const reason = document.getElementById("breakdownReason").value.trim();
        const when = document.getElementById("breakdownDateTime").value;
        if (!reason || !when) {
          showToast("Enter breakdown date, time, and reason", "error");
          return;
        }
        await fetchJson("/vehicles/" + selected.id + "/breakdown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, startedAt: new Date(when).toISOString() }),
        });
        showToast(selected.vehicle_no + " marked as breakdown", "success");
        hideActionPanel();
        state.activeMapAction = "live";
        updateMapActionStatus();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  }

  const saveFixedBtn = document.getElementById("saveFixedBtn");
  if (saveFixedBtn) {
    saveFixedBtn.addEventListener("click", async () => {
      try {
        const fixedReason = document.getElementById("fixedReason").value.trim();
        const fixedAt = document.getElementById("fixedDateTime").value;
        if (!fixedAt) {
          showToast("Enter fixed date and time", "error");
          return;
        }
        await fetchJson("/vehicles/" + selected.id + "/fix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fixedAt: new Date(fixedAt).toISOString(),
            fixedReason,
          }),
        });
        showToast(selected.vehicle_no + " marked as fixed", "success");
        hideActionPanel();
        state.activeMapAction = "live";
        updateMapActionStatus();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  }

  const playTripBtn = document.getElementById("playTripBtn");
  if (playTripBtn) {
    playTripBtn.addEventListener("click", async () => {
      if (!selected) {
        showToast("Select a vehicle first", "error");
        return;
      }
      const from = document.getElementById("tripFrom").value;
      const to = document.getElementById("tripTo").value;
      const histories = await fetchJson("/trip-history?vehicleIds=" + selected.id);
      const history = histories[0]?.history || [];
      const filtered = history.filter((point) => {
        const time = new Date(point.timestamp).getTime();
        const fromTime = from ? new Date(from).getTime() : -Infinity;
        const toTime = to ? new Date(to).getTime() : Infinity;
        return time >= fromTime && time <= toTime;
      });

      if (!filtered.length) {
        showToast("No trip history found in selected time range", "error");
        return;
      }

      if (state.playbackMarker) {
        map.removeLayer(state.playbackMarker);
      }
      if (state.playbackTimer) {
        clearInterval(state.playbackTimer);
      }

      let index = 0;
      state.playbackMarker = L.circleMarker([filtered[0].lat, filtered[0].lng], {
        radius: 7,
        color: "#0f172a",
        fillColor: "#38bdf8",
        fillOpacity: 1,
      }).addTo(map);

      state.playbackTimer = setInterval(() => {
        index += 1;
        if (index >= filtered.length) {
          clearInterval(state.playbackTimer);
          state.playbackTimer = null;
          return;
        }
        state.playbackMarker.setLatLng([filtered[index].lat, filtered[index].lng]);
      }, 500);

      showToast("Trip playback started for " + selected.vehicle_no, "success");
    });
  }
}

function openActionPanel(action) {
  const selected = state.vehicles.find((vehicle) => vehicle.id === state.selectedVehicleId);
  if (!selected) {
    showToast("Select a vehicle first", "error");
    return;
  }

  if (action === "trip-history") {
    showActionPanel(
      "Trip History Player",
      "Select date and time range, then play the trip history for " + selected.vehicle_no + ".",
      `
        <div class="form-stack">
          <input class="field" id="tripFrom" type="datetime-local" />
          <input class="field" id="tripTo" type="datetime-local" />
          <button class="btn btn-secondary" id="playTripBtn" type="button">Play Trip History</button>
        </div>
      `,
    );
  } else if (action === "geofence") {
    clearMapConstruction();
    updateConstructionLayers();
    showActionPanel(
      "Create Geofence",
      "Click on the map to add geofence points for " + selected.vehicle_no + ".",
      `
        <div class="form-stack">
          <input class="field" id="geofenceName" type="text" placeholder="Geofence name" value="${selected.vehicle_no} Zone" />
          <div class="small">Add at least 3 points by clicking on the map.</div>
          <button class="btn btn-secondary" id="saveGeofenceBtn" type="button">Save Geofence</button>
          <button class="btn btn-muted" id="clearGeofenceBtn" type="button">Clear Points</button>
        </div>
      `,
    );
  } else if (action === "route") {
    clearMapConstruction();
    updateConstructionLayers();
    showActionPanel(
      "Assign Route",
      "Click on the map to create route points for " + selected.vehicle_no + ".",
      `
        <div class="form-stack">
          <input class="field" id="routeName" type="text" placeholder="Route name" value="${selected.vehicle_no} Route" />
          <div class="small">Add at least 2 route points by clicking on the map.</div>
          <button class="btn btn-secondary" id="saveRouteBtn" type="button">Save Route</button>
          <button class="btn btn-muted" id="clearRouteBtn" type="button">Clear Route</button>
        </div>
      `,
    );
  } else if (action === "breakdown") {
    showActionPanel(
      "Mark Breakdown",
      "Add breakdown date, time, and reason for " + selected.vehicle_no + ".",
      `
        <div class="form-stack">
          <input class="field" id="breakdownDateTime" type="datetime-local" />
          <textarea class="field tracker-textarea" id="breakdownReason" placeholder="Enter breakdown reason"></textarea>
          <button class="btn btn-danger" id="saveBreakdownBtn" type="button">Save Breakdown</button>
        </div>
      `,
    );
  } else if (action === "fixed") {
    showActionPanel(
      "Mark Fixed",
      "Close the breakdown for " + selected.vehicle_no + " and store final repair time.",
      `
        <div class="form-stack">
          <input class="field" id="fixedDateTime" type="datetime-local" />
          <textarea class="field tracker-textarea" id="fixedReason" placeholder="Optional fix note or workshop remark"></textarea>
          <button class="btn btn-secondary" id="saveFixedBtn" type="button">Save Fixed Status</button>
        </div>
      `,
    );
  } else {
    hideActionPanel();
  }

  bindActionPanelEvents();
}

function handlePopupAction(action, vehicleId) {
  const selectedVehicleId = Number(vehicleId);
  focusVehicle(selectedVehicleId, false);
  const marker = state.markers.get(selectedVehicleId);
  const vehicle = state.vehicles.find((item) => item.id === selectedVehicleId);

  if (!vehicle) {
    return;
  }

  if (action === "open-map") {
    map.flyTo([vehicle.lat, vehicle.lng], Math.max(map.getZoom(), 13), {
      duration: 0.5,
    });
    if (marker) {
      marker.openPopup();
    }
    return;
  }

  const actionMap = {
    "trip-history": "trip-history",
    geofence: "geofence",
    route: "route",
    breakdown: "breakdown",
    fixed: "fixed",
    nearby: "nearby",
  };

  const nextAction = actionMap[action];
  if (!nextAction) {
    return;
  }

  state.activeMapAction = nextAction;
  updateMapActionStatus();
  if (nextAction === "nearby") {
    renderNearbyList();
    hideActionPanel();
  } else {
    openActionPanel(nextAction);
  }
}

function renderInsights() {
  const candidates = [...state.vehicles]
    .sort((a, b) => {
      const scoreA =
        (a.status === "breakdown" ? 4 : 0) +
        (a.status === "offline" ? 3 : 0) +
        (a.status === "no-gps" ? 3 : 0) +
        (a.status === "disconnected" ? 3 : 0) +
        (a.fuel < 25 ? 2 : 0) +
        (a.adblue < 25 ? 2 : 0);
      const scoreB =
        (b.status === "breakdown" ? 4 : 0) +
        (b.status === "offline" ? 3 : 0) +
        (b.status === "no-gps" ? 3 : 0) +
        (b.status === "disconnected" ? 3 : 0) +
        (b.fuel < 25 ? 2 : 0) +
        (b.adblue < 25 ? 2 : 0);
      return scoreB - scoreA;
    })
    .slice(0, 4);

  document.getElementById("insightList").innerHTML = candidates
    .map((vehicle) => {
      let note = "Vehicle is healthy and reporting normally.";
      if (vehicle.status === "breakdown") {
        note = "Breakdown status detected. Dispatch maintenance follow-up.";
      } else if (vehicle.status === "offline" || vehicle.status === "disconnected") {
        note = "Connectivity lost. Check device power, network, or installation.";
      } else if (vehicle.status === "no-gps") {
        note = "GPS signal is unavailable. Confirm antenna visibility.";
      } else if (vehicle.fuel < 25) {
        note = "Fuel is low and may need refilling soon.";
      } else if (vehicle.adblue < 25) {
        note = "AdBlue is low and should be scheduled for refill.";
      } else if (vehicle.status === "moving") {
        note = "Actively moving with live telemetry coming in.";
      }

      return `
        <button class="list-item tracker-insight-item" type="button" data-id="${vehicle.id}">
          <strong>${vehicle.vehicle_no} | ${formatStatus(vehicle.status)}</strong>
          <div class="small">${note}</div>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll(".tracker-insight-item").forEach((button) => {
    button.addEventListener("click", () => focusVehicle(Number(button.dataset.id)));
  });
}

function updateDetails(vehicle) {
  if (!vehicle) {
    return;
  }

  document.getElementById("vehicleType").textContent = vehicle.type + " | AIS 140";
  document.getElementById("vehicleName").textContent = vehicle.vehicle_no;
  document.getElementById("vehicleStatusBadge").className = "badge " + getStatusTone(vehicle.status);
  document.getElementById("vehicleStatusBadge").textContent = formatStatus(vehicle.status);
  document.getElementById("vehicleDriver").textContent =
    "Driver: " + vehicle.driver + " | IMEI " + (vehicle.imei || "-") + " | Last seen " + new Date(vehicle.last_seen).toLocaleTimeString();
  document.getElementById("detailSpeed").textContent = vehicle.speed + " km/h";
  document.getElementById("detailFuel").textContent = vehicle.fuel + "%";
  document.getElementById("detailAdblue").textContent = vehicle.adblue + "%";
  document.getElementById("detailIgnition").textContent = vehicle.ignition ? "On" : "Off";
  document.getElementById("detailHeading").textContent = vehicle.heading + " deg";
  document.getElementById("detailOdometer").textContent = vehicle.odometer + " km";
  document.getElementById("detailGps").textContent = vehicle.gps ? "Connected" : "Signal Lost";
  document.getElementById("detailCoords").textContent = vehicle.lat.toFixed(5) + ", " + vehicle.lng.toFixed(5);
  document.getElementById("monitoringSubtitle").textContent =
    vehicle.vehicle_no +
    " is currently " +
    formatStatus(vehicle.status).toLowerCase() +
    " with live AIS 140 telemetry shown on a fixed monitoring map.";
  renderNearbyList();
}

function syncMap() {
  const visibleIds = new Set(getFilteredVehicles().map((vehicle) => vehicle.id));
  const initialPoints = [];

  state.vehicles.forEach((vehicle) => {
    const latLng = [vehicle.lat, vehicle.lng];
    const popupHtml = createVehiclePopupHtml(vehicle);
    let marker = state.markers.get(vehicle.id);

    if (!marker) {
      marker = L.marker(latLng, { icon: createVehicleIcon(vehicle.type, vehicle.status) }).bindPopup(popupHtml, {
        className: "tracker-popup-shell",
        maxWidth: 360,
        minWidth: 320,
        autoPanPadding: [32, 32],
        autoPan: false,
      });
      marker.on("click", () => focusVehicle(vehicle.id, false));
      state.markers.set(vehicle.id, marker);
    } else {
      marker.setLatLng(latLng);
      marker.setIcon(createVehicleIcon(vehicle.type, vehicle.status));
      marker.setPopupContent(popupHtml);
    }

    if (visibleIds.has(vehicle.id)) {
      marker.addTo(map);
      initialPoints.push(latLng);
    } else {
      map.removeLayer(marker);
    }
  });

  if (!state.initialBoundsSet && initialPoints.length) {
    map.fitBounds(L.latLngBounds(initialPoints).pad(0.12));
    state.initialBoundsSet = true;
  }
}

map.on("click", (event) => {
  if (state.activeMapAction === "geofence") {
    state.geofencePoints.push([event.latlng.lat, event.latlng.lng]);
    updateConstructionLayers();
  } else if (state.activeMapAction === "route") {
    state.routePoints.push([event.latlng.lat, event.latlng.lng]);
    updateConstructionLayers();
  }
});

async function drawTripHistory() {
  state.trailLayers.forEach((layer) => map.removeLayer(layer));
  state.trailLayers.clear();

  const ids = Array.from(state.selectedHistoryIds);
  if (!ids.length) {
    document.getElementById("routeMeta").textContent = "No trip history selected.";
    return;
  }

  const histories = await fetchJson("/trip-history?vehicleIds=" + ids.join(","));
  histories.forEach((vehicle, index) => {
    const points = vehicle.history.map((point) => [point.lat, point.lng]);
    if (!points.length) {
      return;
    }

    const layer = L.polyline(points, {
      color: TRAIL_COLORS[index % TRAIL_COLORS.length],
      weight: 3.5,
      opacity: 0.72,
    }).addTo(map);

    state.trailLayers.set(vehicle.id, layer);
  });

  document.getElementById("routeMeta").textContent =
    "Showing trip history for " + histories.length + " vehicle(s) without moving the map view.";
}

function focusVehicle(id, openPopup = true) {
  const vehicle = state.vehicles.find((item) => item.id === id);
  if (!vehicle) {
    return;
  }

  state.selectedVehicleId = id;
  state.selectedHistoryIds.add(id);
  renderVehicleSelect();
  renderTripHistoryList();
  drawTripHistory();
  updateDetails(vehicle);
  updateMapActionStatus();

  const marker = state.markers.get(id);
  if (marker && openPopup) {
    marker.openPopup();
  }
}

map.on("popupopen", (event) => {
  const popupElement = event.popup.getElement();
  if (!popupElement) {
    return;
  }
  L.DomEvent.disableClickPropagation(popupElement);
  popupElement.addEventListener("click", (clickEvent) => {
    const button = clickEvent.target.closest("[data-popup-action]");
    if (!button) {
      return;
    }
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    handlePopupAction(button.dataset.popupAction, button.dataset.id);
  });
});

function applySnapshot(payload) {
  state.vehicles = payload.vehicles;
  if (state.requestedVehicleId && state.vehicles.some((vehicle) => vehicle.id === state.requestedVehicleId)) {
    state.selectedVehicleId = state.requestedVehicleId;
    state.requestedVehicleId = null;
  } else if (!state.selectedVehicleId && state.vehicles.length) {
    state.selectedVehicleId = state.vehicles[0].id;
  }

  updateSummary(payload.summary);
  syncFilterButtons();
  renderVehicleSelect();
  syncMap();
  renderInsights();
  updateMapActionStatus();

  const selected = state.vehicles.find((vehicle) => vehicle.id === state.selectedVehicleId);
  if (selected) {
    updateDetails(selected);
    if (!state.initialQueryFocusDone && state.selectedVehicleId) {
      focusVehicle(state.selectedVehicleId, false);
      map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
      const marker = state.markers.get(state.selectedVehicleId);
      if (marker) {
        marker.openPopup();
      }
      state.initialQueryFocusDone = true;
    }
  }

  drawTripHistory();
}

function renderVehicleIconPreview() {
  const type = document.getElementById("vehicleIconTypeSelect").value;
  const image = state.vehicleIcons[type];
  document.getElementById("vehicleIconPreview").innerHTML = image
    ? `<img src="${image}" alt="${type} icon" class="tracker-icon-preview-image" />`
    : "No custom icon selected.";
}

async function loadVehicleIcons() {
  state.vehicleIcons = await fetchJson("/vehicle-icons");
  renderVehicleIconPreview();
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
  document.querySelectorAll(".tracker-view-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

document.getElementById("searchInput").addEventListener("input", () => {
  updateSummary(getSummaryFromVehicles(state.vehicles));
  renderVehicleSelect();
  syncMap();
});

document.getElementById("statusSelect").addEventListener("change", (event) => {
  state.activeFilter = event.target.value;
  syncFilterButtons();
  renderVehicleSelect();
  syncMap();
  updateSummary(getSummaryFromVehicles(state.vehicles));
  updateMapActionStatus();
});

document.querySelectorAll(".tracker-stat").forEach((button) => {
  button.addEventListener("click", () => {
    state.activeFilter = button.dataset.status;
    document.getElementById("statusSelect").value = state.activeFilter;
    syncFilterButtons();
    renderVehicleSelect();
    syncMap();
    updateSummary(getSummaryFromVehicles(state.vehicles));
    updateMapActionStatus();
  });
});

document.getElementById("showAllVehiclesBtn").addEventListener("click", () => {
  state.activeFilter = "all";
  document.getElementById("statusSelect").value = "all";
  document.getElementById("searchInput").value = "";
  syncFilterButtons();
  renderVehicleSelect();
  syncMap();
  updateSummary(getSummaryFromVehicles(state.vehicles));

  const allPoints = state.vehicles.map((vehicle) => [vehicle.lat, vehicle.lng]);
  if (allPoints.length) {
    map.fitBounds(L.latLngBounds(allPoints).pad(0.12));
  }

  showToast("Showing all vehicles on the map", "info");
});

document.getElementById("vehicleSelect").addEventListener("change", (event) => {
  if (event.target.value) {
    focusVehicle(Number(event.target.value));
  }
});

document.querySelectorAll(".tracker-view-btn").forEach((button) => {
  button.addEventListener("click", () => switchBaseLayer(button.dataset.view));
});

document.getElementById("clearTripSelectionBtn").addEventListener("click", () => {
  state.selectedHistoryIds.clear();
  renderTripHistoryList();
  drawTripHistory();
  updateMapActionStatus();
});

document.querySelectorAll(".tracker-command-btn").forEach((button) => {
  button.addEventListener("click", () => {
    if (!state.selectedVehicleId && button.dataset.sideAction !== "live") {
      showToast("Select a vehicle icon first", "error");
      return;
    }

    const selected = state.vehicles.find((vehicle) => vehicle.id === state.selectedVehicleId);
    state.activeMapAction =
      button.dataset.sideAction === "breakdown" && selected?.breakdownActive ? "fixed" : button.dataset.sideAction;

    if (state.activeMapAction === "trip-history") {
      drawTripHistory();
      openActionPanel("trip-history");
    } else if (state.activeMapAction === "geofence") {
      openActionPanel("geofence");
    } else if (state.activeMapAction === "route") {
      openActionPanel("route");
    } else if (state.activeMapAction === "breakdown") {
      openActionPanel("breakdown");
    } else if (state.activeMapAction === "fixed") {
      openActionPanel("fixed");
    } else if (state.activeMapAction === "nearby") {
      hideActionPanel();
      renderNearbyList();
    } else {
      hideActionPanel();
    }

    updateMapActionStatus();
  });
});

document.getElementById("closeActionPanelBtn").addEventListener("click", () => {
  hideActionPanel();
  state.activeMapAction = "live";
  clearMapConstruction();
  updateConstructionLayers();
  updateMapActionStatus();
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
loadVehicleIcons();

document.getElementById("sideOpenMapBtn").addEventListener("click", () => {
  if (state.selectedVehicleId) {
    handlePopupAction("open-map", state.selectedVehicleId);
  }
});

document.getElementById("sideTripBtn").addEventListener("click", () => {
  if (!state.selectedVehicleId) {
    showToast("Select a vehicle first", "error");
    return;
  }
  state.activeMapAction = "trip-history";
  updateMapActionStatus();
  openActionPanel("trip-history");
});

document.querySelectorAll(".tracker-nearby-pill").forEach((button) => {
  button.addEventListener("click", () => {
    state.nearbyCategory = button.dataset.nearby;
    document.querySelectorAll(".tracker-nearby-pill").forEach((item) => {
      item.classList.toggle("active", item.dataset.nearby === state.nearbyCategory);
    });
    renderNearbyList();
  });
});

document.getElementById("nearbyRadiusSelect").addEventListener("change", () => {
  renderNearbyList();
});

document.getElementById("vehicleIconTypeSelect").addEventListener("change", renderVehicleIconPreview);

document.getElementById("uploadVehicleIconBtn").addEventListener("click", async () => {
  const type = document.getElementById("vehicleIconTypeSelect").value;
  const file = document.getElementById("vehicleIconFileInput").files[0];
  if (!file) {
    showToast("Choose an icon image first", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const result = await fetchJson("/vehicle-icons/" + encodeURIComponent(type), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: reader.result }),
      });
      state.vehicleIcons = result.icons;
      renderVehicleIconPreview();
      syncMap();
      showToast("Vehicle icon uploaded successfully", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  };
  reader.readAsDataURL(file);
});

document.getElementById("deleteVehicleIconBtn").addEventListener("click", async () => {
  const type = document.getElementById("vehicleIconTypeSelect").value;
  try {
    const result = await fetchJson("/vehicle-icons/" + encodeURIComponent(type), {
      method: "DELETE",
    });
    state.vehicleIcons = result.icons;
    renderVehicleIconPreview();
    syncMap();
    showToast("Vehicle icon removed successfully", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
});
