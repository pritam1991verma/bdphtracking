renderTopbar("vehicles");

let editingVehicleId = null;

function getActionIcon(kind) {
  const icons = {
    battery:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 7h1.5A1.5 1.5 0 0 1 19 8.5v7a1.5 1.5 0 0 1-1.5 1.5H16v1h-2v-1H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h7V6h2v1Zm-7 2v6h6V9H9Zm2 1h2v1.5h1.5V13H13v1.5h-2V13H9.5v-1.5H11V10Z" fill="currentColor"/></svg>',
    tyres:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 1 0 18a9 9 0 0 1 0-18Zm0 2a7 7 0 1 0 0 14a7 7 0 0 0 0-14Zm0 2.2A4.8 4.8 0 1 1 7.2 12A4.81 4.81 0 0 1 12 7.2Zm0 2A2.8 2.8 0 1 0 14.8 12A2.8 2.8 0 0 0 12 9.2Z" fill="currentColor"/></svg>',
    tracker:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2Zm0 5.3l-1.15 3.15L7.7 11.6l3.15 1.15L12 15.9l1.15-3.15l3.15-1.15l-3.15-1.15L12 7.3Z" fill="currentColor"/></svg>',
    edit:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.25V20h3.75L18.8 8.94l-3.75-3.75L4 16.25Zm2 1.8l.92-2.78l8.13-8.13l.92.92l-8.13 8.13L6 18.05ZM20.7 7.04a1 1 0 0 0 0-1.41L18.37 3.3a1 1 0 0 0-1.41 0l-1.13 1.13l3.75 3.75l1.12-1.14Z" fill="currentColor"/></svg>',
    delete:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Z" fill="currentColor"/></svg>',
  };
  return icons[kind] || "";
}

function getBatteryAssetView(vehicle) {
  const voltage = Number(vehicle.externalVoltage || 0);
  const assetStatus = String(vehicle.batteryAssetStatus || "healthy").toLowerCase();

  if (voltage === 0 && !vehicle.ignition) {
    return { label: "Disconnected", tone: "breakdown" };
  }
  if (voltage > 0 && voltage < 11) {
    return { label: "Low Voltage", tone: "stopped" };
  }
  if (assetStatus === "critical" || assetStatus === "replacement-due") {
    return { label: formatStatus(assetStatus.replaceAll(" ", "-")), tone: "breakdown" };
  }
  if (assetStatus === "watch") {
    return { label: "Watch", tone: "idle" };
  }
  if (!vehicle.network) {
    return { label: "Device Offline", tone: "offline" };
  }
  return { label: "Healthy", tone: "moving" };
}

function renderVehicleRows(vehicles) {
  document.getElementById("vehicleTableBody").innerHTML = vehicles
    .map(
      (vehicle) => {
        const battery = getBatteryAssetView(vehicle);
        return `
        <tr>
          <td>${vehicle.vehicle_no}</td>
          <td class="imei-col">${vehicle.imei || "-"}</td>
          <td>${vehicle.label}</td>
          <td>${vehicle.driver}<div class="small">${vehicle.driverPhone || "-"}</div></td>
          <td>${vehicle.type}</td>
          <td><span class="status-pill ${getStatusTone(vehicle.status)}">${formatStatus(vehicle.status)}</span></td>
          <td>${vehicle.fuel}%</td>
          <td>${vehicle.adblue}%</td>
          <td class="battery-serial-col">
            <strong>${vehicle.batterySerialNumber || "-"}</strong>
            <div class="small">${Number(vehicle.externalVoltage || 0).toFixed(1)} V</div>
          </td>
          <td class="battery-col">
            <div class="vehicle-battery-cell">
              <span class="status-pill ${battery.tone}">${battery.label}</span>
              <div class="vehicle-inline-meta">
                <span class="small">${vehicle.batterySerialNumber || "-"}</span>
                <a class="action-icon-btn battery-link-btn" href="/battery.html?vehicleId=${vehicle.id}" title="Open battery dashboard">${getActionIcon("battery")}</a>
              </div>
            </div>
          </td>
          <td class="tyre-col">
            <a class="action-icon-btn action-icon-neutral" href="/tyres.html?vehicleId=${vehicle.id}" title="Manage tyres">${getActionIcon("tyres")}</a>
          </td>
          <td class="action-col">
            <div class="vehicle-action-row">
              <a class="action-icon-btn action-icon-neutral" href="/live-monitor.html?vehicleId=${vehicle.id}" target="_blank" rel="noopener noreferrer" title="Open in tracker">${getActionIcon("tracker")}</a>
              <button class="action-icon-btn action-icon-neutral edit-vehicle-btn" type="button" data-id="${vehicle.id}" title="Edit vehicle">${getActionIcon("edit")}</button>
              <button class="action-icon-btn action-icon-danger delete-vehicle-btn" type="button" data-id="${vehicle.id}" title="Delete vehicle">${getActionIcon("delete")}</button>
            </div>
          </td>
        </tr>
      `;
      },
    )
    .join("");

  document.querySelectorAll(".edit-vehicle-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const vehicles = await fetchJson("/vehicles");
        const vehicle = vehicles.find((item) => String(item.id) === String(button.dataset.id));
        if (!vehicle) {
          showToast("Vehicle not found", "error");
          return;
        }
        populateVehicleForm(vehicle);
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });

  document.querySelectorAll(".delete-vehicle-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = window.confirm("Delete this vehicle?");
      if (!confirmed) {
        return;
      }

      try {
        const result = await fetchJson("/vehicles/" + button.dataset.id, { method: "DELETE" });
        showToast(result.message, "success");
        await loadVehicles();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

async function loadVehicles() {
  const vehicles = await fetchJson("/vehicles");
  renderVehicleRows(vehicles);
}

function resetVehicleForm() {
  const form = document.getElementById("vehicleForm");
  form.reset();
  form.elements.vehicleId.value = "";
  editingVehicleId = null;
  document.getElementById("vehicleSubmitBtn").textContent = "Add Vehicle";
  document.getElementById("cancelVehicleEditBtn").classList.add("hidden");
  document.getElementById("gpsDevicePreview").textContent =
    "Enter GPS IMEI to auto-fetch AIS 140 device data.";
  showMessage("vehicleMessage", "", "");
}

function populateVehicleForm(vehicle) {
  const form = document.getElementById("vehicleForm");
  editingVehicleId = vehicle.id;
  form.elements.vehicleId.value = vehicle.id;
  form.elements.vehicle_no.value = vehicle.vehicle_no || "";
  form.elements.label.value = vehicle.label || "";
  form.elements.driver.value = vehicle.driver || "";
  form.elements.driverPhone.value = vehicle.driverPhone || "";
  form.elements.type.value = vehicle.type || "";
  form.elements.imei.value = vehicle.imei || "";
  form.elements.lat.value = vehicle.lat ?? "";
  form.elements.lng.value = vehicle.lng ?? "";
  form.elements.speed.value = vehicle.speed ?? "";
  form.elements.heading.value = vehicle.heading ?? "";
  form.elements.fuel.value = vehicle.fuel ?? "";
  form.elements.adblue.value = vehicle.adblue ?? "";
  form.elements.externalVoltage.value = vehicle.externalVoltage ?? "";
  form.elements.batterySerialNumber.value = vehicle.batterySerialNumber || "";
  form.elements.batteryAssetStatus.value = vehicle.batteryAssetStatus || "healthy";
  form.elements.axleConfiguration.value = vehicle.axleConfiguration || "6x4";
  form.elements.status.value = vehicle.status || "";
  form.elements.ignition.value = vehicle.ignition ? "true" : "false";
  document.getElementById("vehicleSubmitBtn").textContent = "Update Vehicle";
  document.getElementById("cancelVehicleEditBtn").classList.remove("hidden");
  document.getElementById("gpsDevicePreview").textContent =
    "Editing " + vehicle.vehicle_no + ". Update fields and save changes to sync tracker, tyres, and battery view.";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function fillVehicleFromDevice(device) {
  const form = document.getElementById("vehicleForm");
  form.elements.lat.value = device.lat;
  form.elements.lng.value = device.lng;
  form.elements.speed.value = device.speed;
  form.elements.heading.value = device.heading;
  form.elements.fuel.value = device.fuel;
  form.elements.adblue.value = device.adblue;
  form.elements.externalVoltage.value = device.externalVoltage ?? "";
  if (form.elements.batteryAssetStatus) {
    form.elements.batteryAssetStatus.value = Number(device.externalVoltage || 0) < 11 ? "watch" : "healthy";
  }
  form.elements.ignition.value = device.ignition ? "true" : "false";
  form.elements.status.value = device.status;
  document.getElementById("gpsDevicePreview").textContent =
    device.deviceType +
    " device synced: " +
    formatStatus(device.status) +
    ", " +
    device.lat +
    ", " +
    device.lng +
    ", speed " +
    device.speed +
    " km/h";
}

async function fetchGpsDevice() {
  const imei = document.getElementById("imeiInput").value.trim();
  if (!imei) {
    showToast("Enter GPS IMEI first", "error");
    return;
  }

  try {
    const result = await fetchJson("/gps-device/" + encodeURIComponent(imei));
    fillVehicleFromDevice(result.device);
    showToast("AIS 140 GPS data fetched successfully", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
}

document.getElementById("vehicleForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const vehicleId = form.get("vehicleId");
  const isEdit = Boolean(vehicleId);

  try {
    await fetchJson(isEdit ? "/vehicles/" + vehicleId : "/vehicles", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicle_no: form.get("vehicle_no"),
        label: form.get("label"),
        driver: form.get("driver"),
        driverPhone: form.get("driverPhone"),
        type: form.get("type"),
        imei: form.get("imei"),
        lat: form.get("lat"),
        lng: form.get("lng"),
        speed: form.get("speed"),
        heading: form.get("heading"),
        fuel: form.get("fuel"),
        adblue: form.get("adblue"),
        externalVoltage: form.get("externalVoltage"),
        batterySerialNumber: form.get("batterySerialNumber"),
        batteryAssetStatus: form.get("batteryAssetStatus"),
        axleConfiguration: form.get("axleConfiguration"),
        status: form.get("status"),
        ignition: form.get("ignition") === "true",
      }),
    });

    resetVehicleForm();
    showMessage("vehicleMessage", isEdit ? "Vehicle updated successfully." : "Vehicle added successfully.", "success");
    showToast(isEdit ? "Vehicle updated successfully" : "Vehicle added successfully", "success");
    await loadVehicles();
  } catch (error) {
    const message =
      isEdit && /404/.test(String(error.message))
        ? "Vehicle edit route is not active on the running server. Restart localhost:3000 once, then try again."
        : error.message;
    showMessage("vehicleMessage", message, "error");
    showToast(message, "error");
  }
});

document.getElementById("fetchGpsBtn").addEventListener("click", fetchGpsDevice);
document.getElementById("cancelVehicleEditBtn").addEventListener("click", resetVehicleForm);
document.getElementById("imeiInput").addEventListener("blur", async () => {
  const imei = document.getElementById("imeiInput").value.trim();
  if (imei.length === 15) {
    await fetchGpsDevice();
  }
});

loadVehicles();
