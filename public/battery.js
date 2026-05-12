renderTopbar("battery");

const batteryState = {
  alerts: [],
  vehicles: [],
  summary: null,
  search: "",
  filter: "all",
  map: null,
  markers: new Map(),
  focusVehicleId: Number(new URLSearchParams(window.location.search).get("vehicleId")) || null,
};

function getBatteryTone(type) {
  if (type === "BATTERY_DISCONNECTED") {
    return "breakdown";
  }
  if (type === "LOW_VOLTAGE") {
    return "stopped";
  }
  return "offline";
}

function formatBatteryType(type) {
  return String(type || "")
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatBatteryAssetStatus(status) {
  const normalized = String(status || "healthy").toLowerCase();
  if (normalized === "replacement-due") {
    return "Replacement Due";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getBatteryAssetTone(status) {
  const normalized = String(status || "healthy").toLowerCase();
  if (normalized === "critical" || normalized === "replacement-due") {
    return "breakdown";
  }
  if (normalized === "watch") {
    return "idle";
  }
  return "moving";
}

function createBatteryIcon(vehicle) {
  const hasAlert = vehicle.status === "Alert";
  const color = hasAlert ? "#ef4444" : "#22c55e";
  return L.divIcon({
    className: "battery-map-icon-shell",
    html: `<span class="battery-map-icon" style="--battery-marker:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function ensureBatteryMap() {
  if (batteryState.map) {
    return;
  }

  batteryState.map = L.map("batteryMap", {
    zoomControl: true,
    attributionControl: true,
  }).setView([22.82, 86.23], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(batteryState.map);
}

function applyFilters(alerts) {
  const query = batteryState.search.trim().toLowerCase();
  return alerts.filter((alert) => {
    const matchesQuery =
      !query ||
      [alert.vehicle_no, alert.driver, alert.driverPhone, alert.label, alert.vehicleType, alert.batterySerialNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

    if (!matchesQuery) {
      return false;
    }

    if (batteryState.filter === "all") {
      return true;
    }

    if (batteryState.filter === "open" || batteryState.filter === "resolved") {
      return alert.status === batteryState.filter;
    }

    return alert.type === batteryState.filter;
  });
}

function renderBatterySummary(summary) {
  document.getElementById("batterySummaryGrid").innerHTML = `
    <article class="summary-card summary-card-static">
      <span class="label">Open Alerts</span>
      <strong class="value">${summary.openAlerts}</strong>
      <p class="small">Battery incidents waiting for action.</p>
    </article>
    <article class="summary-card summary-card-static">
      <span class="label">Disconnected</span>
      <strong class="value">${summary.disconnected}</strong>
      <p class="small">Possible disconnect or theft risk.</p>
    </article>
    <article class="summary-card summary-card-static">
      <span class="label">Low Voltage</span>
      <strong class="value">${summary.lowVoltage}</strong>
      <p class="small">Vehicles below the 11V protection threshold.</p>
    </article>
    <article class="summary-card summary-card-static">
      <span class="label">Offline</span>
      <strong class="value">${summary.offline}</strong>
      <p class="small">Devices silent beyond 5 minutes.</p>
    </article>
    <article class="summary-card summary-card-static">
      <span class="label">Healthy Vehicles</span>
      <strong class="value">${summary.healthyVehicles}</strong>
      <p class="small">Vehicles with no open battery alert.</p>
    </article>
    <article class="summary-card summary-card-static">
      <span class="label">Average Voltage</span>
      <strong class="value">${summary.averageVoltage} V</strong>
      <p class="small">Current fleet-wide external voltage level.</p>
    </article>
  `;

  document.getElementById("batteryHeroPulse").textContent = summary.openAlerts
    ? summary.openAlerts + " active power alerts"
    : "Fleet battery health is stable";
  document.getElementById("batteryHeroMeta").textContent =
    "Healthy vehicles: " +
    summary.healthyVehicles +
    " | Avg voltage: " +
    summary.averageVoltage +
    " V | Last update: " +
    new Date(summary.lastUpdate).toLocaleTimeString();
}

function renderBatteryAlerts() {
  const alerts = applyFilters(batteryState.alerts);
  const root = document.getElementById("batteryAlertList");

  root.innerHTML = alerts.length
    ? alerts
        .map(
          (alert) => `
            <article class="battery-alert-card ${alert.status}">
              <div class="battery-alert-head">
                <div>
                  <span class="status-pill ${getBatteryTone(alert.type)}">${formatBatteryType(alert.type)}</span>
                  <strong>${alert.vehicle_no}</strong>
                  <div class="small">${alert.driver || "No driver"} | ${alert.driverPhone || "-"}</div>
                  <div class="small">Battery: ${alert.batterySerialNumber || "-"} | Asset ${formatBatteryAssetStatus(alert.batteryAssetStatus)}</div>
                </div>
                <span class="status-pill ${alert.status === "open" ? "breakdown" : "moving"}">${formatStatus(alert.status)}</span>
              </div>
              <p class="small battery-alert-message">${alert.message || "Battery protection event captured."}</p>
              <div class="battery-alert-meta">
                <span>${Number(alert.externalVoltage || 0).toFixed(1)} V</span>
                <span>${alert.ignition ? "Ignition ON" : "Ignition OFF"}</span>
                <span>${formatDateTime(alert.createdAt)}</span>
              </div>
              <div class="battery-alert-actions">
                <button class="btn btn-secondary battery-open-map-btn" type="button" data-vehicle-id="${alert.vehicleId}">Open On Map</button>
                ${
                  alert.status === "open"
                    ? `<button class="btn btn-primary battery-resolve-btn" type="button" data-id="${alert.id}">Resolve</button>`
                    : `<span class="small">Resolved ${formatDateTime(alert.resolvedAt)}</span>`
                }
              </div>
            </article>
          `,
        )
        .join("")
    : '<div class="empty-state">No battery alerts match the current search or filter.</div>';

  root.querySelectorAll(".battery-resolve-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const result = await fetchJson("/battery-alerts/" + button.dataset.id + "/resolve", {
          method: "POST",
        });
        showToast(result.message, "success");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });

  root.querySelectorAll(".battery-open-map-btn").forEach((button) => {
    button.addEventListener("click", () => focusVehicleOnMap(Number(button.dataset.vehicleId)));
  });
}

function renderBatteryVehicles() {
  const query = batteryState.search.trim().toLowerCase();
  const vehicles = batteryState.vehicles.filter((vehicle) => {
    if (!query) {
      return true;
    }
    return [vehicle.vehicle_no, vehicle.driver, vehicle.driverPhone, vehicle.label, vehicle.type, vehicle.batterySerialNumber]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  document.getElementById("batteryVehicleList").innerHTML = vehicles.length
    ? vehicles
        .map(
          (vehicle) => `
            <article class="battery-vehicle-card ${vehicle.status === "Alert" ? "alert" : "normal"}">
              <div class="battery-vehicle-head">
                <div>
                  <strong>${vehicle.vehicle_no}</strong>
                  <div class="small">${vehicle.label || "-"} | ${vehicle.type}</div>
                  <div class="small">Battery ${vehicle.batterySerialNumber || "-"} | Asset ${formatBatteryAssetStatus(vehicle.batteryAssetStatus)}</div>
                </div>
                <span class="status-pill ${vehicle.status === "Alert" ? "breakdown" : "moving"}">${vehicle.status}</span>
              </div>
              <div class="battery-vehicle-grid">
                <div><span class="label">Voltage</span><strong>${Number(vehicle.externalVoltage || 0).toFixed(1)} V</strong></div>
                <div><span class="label">Ignition</span><strong>${vehicle.ignition ? "ON" : "OFF"}</strong></div>
                <div><span class="label">Driver</span><strong>${vehicle.driver || "-"}</strong></div>
                <div><span class="label">Last Signal</span><strong>${new Date(vehicle.batterySignalAt).toLocaleTimeString()}</strong></div>
              </div>
              <div class="battery-vehicle-actions">
                <span class="status-pill ${getBatteryAssetTone(vehicle.batteryAssetStatus)}">${formatBatteryAssetStatus(vehicle.batteryAssetStatus)}</span>
                <button class="btn btn-secondary battery-open-map-btn" type="button" data-vehicle-id="${vehicle.id}">Open On Map</button>
              </div>
            </article>
          `,
        )
        .join("")
    : '<div class="empty-state">No vehicles match the current search.</div>';

  document.querySelectorAll(".battery-vehicle-list .battery-open-map-btn").forEach((button) => {
    button.addEventListener("click", () => focusVehicleOnMap(Number(button.dataset.vehicleId)));
  });
}

function syncBatteryMap() {
  ensureBatteryMap();
  const bounds = [];

  batteryState.vehicles.forEach((vehicle) => {
    const key = String(vehicle.id);
    const position = [vehicle.lat, vehicle.lng];
    bounds.push(position);

    let marker = batteryState.markers.get(key);
    if (!marker) {
      marker = L.marker(position, { icon: createBatteryIcon(vehicle) }).addTo(batteryState.map);
      batteryState.markers.set(key, marker);
    } else {
      marker.setLatLng(position);
      marker.setIcon(createBatteryIcon(vehicle));
    }

    marker.bindPopup(
      `
        <strong>${vehicle.vehicle_no}</strong><br />
        Voltage: ${Number(vehicle.externalVoltage || 0).toFixed(1)} V<br />
        Battery Status: ${vehicle.status}<br />
        Driver: ${vehicle.driver || "-"}<br />
        Last Signal: ${formatDateTime(vehicle.batterySignalAt)}
      `,
      { autoPan: false },
    );
  });

  if (bounds.length && !batteryState._fitted) {
    batteryState.map.fitBounds(bounds, { padding: [36, 36] });
    batteryState._fitted = true;
  }
}

function focusVehicleOnMap(vehicleId) {
  const vehicle = batteryState.vehicles.find((item) => item.id === vehicleId);
  const marker = batteryState.markers.get(String(vehicleId));
  if (!vehicle || !marker || !batteryState.map) {
    return;
  }

  batteryState.map.setView([vehicle.lat, vehicle.lng], 14, { animate: true });
  marker.openPopup();
}

function applyOverview(overview) {
  batteryState.summary = overview.summary;
  batteryState.alerts = overview.alerts;
  batteryState.vehicles = overview.vehicles;

  renderBatterySummary(overview.summary);
  renderBatteryAlerts();
  renderBatteryVehicles();
  syncBatteryMap();
  if (batteryState.focusVehicleId) {
    focusVehicleOnMap(batteryState.focusVehicleId);
  }
}

async function loadBatteryOverview() {
  try {
    const overview = await fetchJson("/battery-overview");
    applyOverview(overview);
  } catch (error) {
    showToast(error.message, "error");
  }
}

document.getElementById("batteryVehicleSearch").addEventListener("input", (event) => {
  batteryState.search = event.target.value || "";
  renderBatteryAlerts();
  renderBatteryVehicles();
});

document.getElementById("batteryAlertFilter").addEventListener("change", (event) => {
  batteryState.filter = event.target.value;
  renderBatteryAlerts();
});

const batterySocket = io();
batterySocket.on("battery:updated", applyOverview);

loadBatteryOverview();
