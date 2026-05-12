renderTopbar("tyres");

const tyreState = {
  vehicles: [],
  selectedVehicleId: null,
  detail: null,
  axlePresets: [],
  selectedSlot: null,
  puncturePhotoData: "",
  syncingSelection: false,
};

const DEFAULT_AXLE_PRESETS = [
  { key: "4x2", label: "4 Tyres | Bolero / Scorpio / Pickup" },
  { key: "6x4", label: "10 Tyres | 6x4 Heavy Vehicle" },
  { key: "12-tyre", label: "12 Tyres | Multi Axle" },
  { key: "14-tyre", label: "14 Tyres | Trailer" },
  { key: "16-tyre", label: "16 Tyres | Long Haul" },
  { key: "18-tyre", label: "18 Tyres | Heavy Duty" },
  { key: "22-tyre", label: "22 Tyres | Oversize Carrier" },
];

function getVehicleIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("vehicleId");
}

function toDatetimeLocalValue(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function setDefaultTyreDates() {
  const installInput = document.querySelector('#tyreInstallForm [name="installedAt"]');
  const punctureInput = document.getElementById("punctureRequestedAt");
  if (installInput && !installInput.value) {
    installInput.value = toDatetimeLocalValue();
  }
  if (punctureInput && !punctureInput.value) {
    punctureInput.value = toDatetimeLocalValue();
  }
}

function getCompactLayoutClass(layout) {
  if (layout.length >= 18) {
    return "layout-compact-xl";
  }
  if (layout.length >= 16) {
    return "layout-compact-lg";
  }
  return "layout-standard";
}

function groupSlotsBySide(slots) {
  return {
    left: slots.filter((slot) => slot.position.toLowerCase().includes("left")),
    right: slots.filter((slot) => slot.position.toLowerCase().includes("right")),
    center: slots.filter(
      (slot) =>
        !slot.position.toLowerCase().includes("left") &&
        !slot.position.toLowerCase().includes("right"),
    ),
  };
}

function setSelectedSlot(slotMeta, vehicleNo) {
  tyreState.syncingSelection = true;
  tyreState.selectedSlot = slotMeta ? { ...slotMeta } : null;
  const axleSelect = document.getElementById("tyreAxleSelect");
  const positionSelect = document.getElementById("tyrePositionSelect");
  const slotInput = document.getElementById("tyreSlotInput");
  const selectedSlotText = document.getElementById("tyreSelectedSlot");
  const selectedSlotCard = document.getElementById("tyreSelectedSlotCard");
  const punctureSlotPreview = document.getElementById("punctureSlotPreview");

  if (!slotMeta) {
    axleSelect.value = "";
    axleSelect.dispatchEvent(new Event("change"));
    positionSelect.innerHTML = '<option value="">Select position</option>';
    slotInput.value = "";
    selectedSlotText.textContent = "Select a tyre slot from the axle layout or dropdown.";
    selectedSlotCard.textContent =
      "Click a tyre box like Left Front, Right Front, Left Rear, or Right Rear to target that slot.";
    punctureSlotPreview.textContent = "Select a tyre slot first, then upload the puncture photo.";
  } else {
    axleSelect.value = slotMeta.axle || "";
    axleSelect.dispatchEvent(new Event("change"));
    positionSelect.value = slotMeta.position || "";
    positionSelect.dispatchEvent(new Event("change"));
    slotInput.value = slotMeta.slot || "";
    selectedSlotText.textContent = `${slotMeta.axle} | ${slotMeta.position} selected for ${vehicleNo}.`;
    selectedSlotCard.textContent = `${slotMeta.axle} | ${slotMeta.position} is now active for install, inspection, and puncture approval.`;
    punctureSlotPreview.textContent = `${slotMeta.axle} | ${slotMeta.position} selected for puncture approval on ${vehicleNo}.`;
  }

  document.querySelectorAll(".tyre-slot").forEach((button) => {
    const isSelected = slotMeta && button.dataset.slot === slotMeta.slot;
    button.classList.toggle("selected", Boolean(isSelected));
  });
  tyreState.syncingSelection = false;
}

function renderVehicleOptions() {
  const select = document.getElementById("tyreVehicleSelect");
  if (!tyreState.vehicles.length) {
    select.innerHTML = '<option value="">No vehicles available</option>';
    return;
  }

  select.innerHTML =
    '<option value="">Select vehicle</option>' +
    tyreState.vehicles
    .map(
      (vehicle) =>
        `<option value="${vehicle.id}" ${String(vehicle.id) === String(tyreState.selectedVehicleId) ? "selected" : ""}>${vehicle.vehicle_no} | ${vehicle.label}</option>`,
    )
    .join("");
}

function renderAxlePresetOptions(detail) {
  tyreState.axlePresets = detail?.presets?.length ? detail.presets : DEFAULT_AXLE_PRESETS;
  document.getElementById("axlePresetSelect").innerHTML = tyreState.axlePresets
    .map(
      (preset) =>
        `<option value="${preset.key}" ${preset.key === detail.vehicle.axleConfiguration ? "selected" : ""}>${preset.label}</option>`,
    )
    .join("");
}

function renderTyreCatalog(detail) {
  const options =
    '<option value="">Select tyre type</option>' +
    (detail.tyreCatalog || []).map((item) => `<option value="${item}">${item}</option>`).join("");
  document.getElementById("tyreTypeSelect").innerHTML = options;
  document.getElementById("inventoryTyreTypeSelect").innerHTML = options;
}

function renderAxleSelectors(layout) {
  const axleSelect = document.getElementById("tyreAxleSelect");
  const positionSelect = document.getElementById("tyrePositionSelect");
  axleSelect.innerHTML =
    '<option value="">Select axle</option>' +
    [...new Set(layout.map((item) => item.axle))]
    .map((axle) => `<option value="${axle}">${axle}</option>`)
    .join("");

  function updatePositions() {
    const selectedAxle = axleSelect.value;
    const positions = layout.filter((item) => item.axle === selectedAxle);
    positionSelect.innerHTML =
      '<option value="">Select position</option>' +
      positions
      .map((item) => `<option value="${item.position}" data-slot="${item.slot}">${item.position}</option>`)
      .join("");
    if (!tyreState.selectedSlot || tyreState.selectedSlot.axle !== selectedAxle) {
      document.getElementById("tyreSlotInput").value = "";
    }
    document.querySelectorAll(".tyre-axle-group").forEach((group) => {
      group.classList.toggle("selected", group.dataset.axle === selectedAxle && Boolean(selectedAxle));
    });
  }

  axleSelect.onchange = updatePositions;
  positionSelect.onchange = () => {
    if (tyreState.syncingSelection) {
      return;
    }
    const option = positionSelect.options[positionSelect.selectedIndex];
    document.getElementById("tyreSlotInput").value = option?.dataset.slot || "";
    const selectedLayout = layout.find((item) => item.slot === (option?.dataset.slot || ""));
    if (selectedLayout) {
      setSelectedSlot(selectedLayout, tyreState.detail?.vehicle?.vehicle_no || "vehicle");
    }
  };
  updatePositions();
}

function renderTyreLayout(detail) {
  const installedBySlot = new Map(detail.tyres.map((tyre) => [tyre.slot, tyre]));
  document.getElementById("axleConfigLabel").textContent = detail.vehicle.axleConfiguration;
  document.getElementById("axleConfigMeta").textContent =
    detail.layout.length + " wheel positions mapped for " + detail.vehicle.vehicle_no + ".";
  document.getElementById("tyreVehicleMeta").textContent =
    detail.vehicle.vehicle_no + " | " + detail.vehicle.type + " | Odometer " + detail.vehicle.odometer + " km";

  const grouped = detail.layout.reduce((acc, slot) => {
    acc[slot.axle] = acc[slot.axle] || [];
    acc[slot.axle].push(slot);
    return acc;
  }, {});

  const layoutClass = getCompactLayoutClass(detail.layout);
  const axleSections = Object.entries(grouped)
    .map(([axle, slots], index, entries) => {
      const sides = groupSlotsBySide(slots);
      const renderSlotButton = (slot) => {
        const tyre = installedBySlot.get(slot.slot);
        const hoverDetails = tyre
          ? `
              <div><span>Tyre</span><strong>${tyre.tyreType}</strong></div>
              <div><span>Serial</span><strong>${tyre.tyreSerialNumber || "-"}</strong></div>
              <div><span>Condition</span><strong>${formatStatus(tyre.tyreCondition)}</strong></div>
              <div><span>Pressure</span><strong>${tyre.pressure} PSI</strong></div>
              <div><span>Tread</span><strong>${tyre.treadDepth} mm</strong></div>
              <div><span>Installed</span><strong>${new Date(tyre.installedAt).toLocaleString()}</strong></div>
            `
          : `
              <div><span>Status</span><strong>Empty Slot</strong></div>
              <div><span>Axle</span><strong>${slot.axle}</strong></div>
              <div><span>Position</span><strong>${slot.position}</strong></div>
              <div><span>Action</span><strong>Click to install tyre</strong></div>
            `;
        return `
          <button class="tyre-slot tyre-shape ${tyre ? "filled" : ""}" type="button" data-slot="${slot.slot}" data-axle="${slot.axle}" data-position="${slot.position}">
            <span>${slot.position}</span>
            <strong>${tyre ? tyre.tyreType : "+"}</strong>
            <div class="small">${tyre ? tyre.pressure + " PSI | " + tyre.treadDepth + " mm" : "Install tyre"}</div>
            <div class="tyre-hover-card">
              <div class="tyre-hover-title">${slot.axle} | ${slot.position}</div>
              <div class="tyre-hover-grid">${hoverDetails}</div>
            </div>
          </button>
        `;
      };

      const leftHtml = sides.left.map(renderSlotButton).join("");
      const rightHtml = sides.right.map(renderSlotButton).join("");
      const centerHtml = sides.center.map(renderSlotButton).join("");
      const positionHint =
        index === 0 ? "Front Section" : index === entries.length - 1 ? "Rear Section" : `Axle Line ${index + 1}`;
      return `
        <section class="tyre-axle-group ${layoutClass}" data-axle="${axle}">
          <div class="tyre-axle-head">
            <div class="tyre-axle-title">${axle}</div>
            <div class="tyre-axle-position">${positionHint}</div>
          </div>
          <div class="tyre-axle-row">
            <div class="tyre-side-lane">${leftHtml}</div>
            <div class="tyre-axle-core">
              <div class="tyre-axle-spine"></div>
              <div class="tyre-axle-badge">${slots.length} Slots</div>
            </div>
            <div class="tyre-side-lane">${rightHtml}</div>
          </div>
          ${centerHtml ? `<div class="tyre-center-lane">${centerHtml}</div>` : ""}
        </section>
      `;
    })
    .join("");

  document.getElementById("tyreLayout").innerHTML = `
    <section class="oem-tyre-board">
      <div class="oem-board-head">
        <div>
          <span class="oem-board-kicker">OEM Maintenance View</span>
          <strong>${detail.vehicle.vehicle_no} Chassis Layout</strong>
        </div>
        <div class="oem-board-legend">
          <span><i class="legend-dot normal"></i>Empty</span>
          <span><i class="legend-dot filled"></i>Installed</span>
          <span><i class="legend-dot selected"></i>Selected</span>
        </div>
      </div>
      <div class="oem-orientation oem-orientation-top">
        <span>Left Side</span>
        <span>Front</span>
        <span>Right Side</span>
      </div>
      <div class="oem-chassis-shell">
        <div class="oem-chassis-line"></div>
        <div class="oem-cabin-tag">Cabin</div>
        ${axleSections}
      </div>
      <div class="oem-orientation oem-orientation-bottom">
        <span>Service Side A</span>
        <span>Rear</span>
        <span>Service Side B</span>
      </div>
    </section>
  `;

  document.querySelectorAll(".tyre-slot").forEach((button) => {
    button.addEventListener("click", () => {
      setSelectedSlot(
        {
          slot: button.dataset.slot,
          axle: button.dataset.axle,
          position: button.dataset.position,
        },
        detail.vehicle.vehicle_no,
      );
    });
  });

  if (tyreState.selectedSlot) {
    const selectedLayout = detail.layout.find((slot) => slot.slot === tyreState.selectedSlot.slot);
    setSelectedSlot(selectedLayout || null, detail.vehicle.vehicle_no);
  }
}

function renderInstalledTyres(detail) {
  document.getElementById("installedTyreTable").innerHTML = detail.tyres.length
    ? detail.tyres
        .map(
          (tyre) => `
            <tr>
              <td>${tyre.axle || "-"}</td>
              <td>${tyre.position}</td>
              <td>${tyre.tyreSerialNumber || "-"}</td>
              <td>${tyre.tyreType}</td>
              <td>${tyre.tyreCondition}</td>
              <td>${tyre.treadDepth} mm</td>
              <td>${tyre.pressure} PSI</td>
              <td>${new Date(tyre.installedAt).toLocaleString()}</td>
              <td><button class="btn btn-danger tyre-remove-btn" type="button" data-id="${tyre.id}">Remove</button></td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="9" class="small">No tyres installed yet.</td></tr>';

  document.querySelectorAll(".tyre-remove-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const result = await fetchJson("/vehicles/" + tyreState.selectedVehicleId + "/tyres/" + button.dataset.id, {
          method: "DELETE",
        });
        showToast(result.message, "success");
        await loadTyreDetail(tyreState.selectedVehicleId);
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

function renderTyreActivity(detail) {
  document.getElementById("tyreActivityList").innerHTML = detail.activity.length
    ? detail.activity
        .slice(0, 8)
        .map(
          (item) => `
            <div class="list-item tyre-activity-item">
              <strong>${item.axle || "-"} | ${item.position} | ${item.tyreType}</strong>
              <div class="small">${item.action} at ${new Date(item.installedAt).toLocaleString()}</div>
              <div class="small">${item.note}</div>
            </div>
          `,
        )
        .join("")
    : '<div class="empty-state">No tyre activity yet.</div>';
}

function renderInventory(detail) {
  const table = document.getElementById("tyreInventoryTable");
  const inventory = detail.inventory || [];
  table.innerHTML = inventory.length
    ? inventory
        .map(
          (item) => `
            <tr>
              <td>${item.tyreSerialNumber}</td>
              <td>${item.tyreType}</td>
              <td>${item.quantity}</td>
              <td>${formatStatus(item.condition)}</td>
              <td>${item.location}</td>
              <td>${new Date(item.updatedAt).toLocaleString()}</td>
              <td><button class="btn btn-danger inventory-remove-btn" type="button" data-id="${item.id}">Remove</button></td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="7" class="small">No spare inventory added yet.</td></tr>';

  document.querySelectorAll(".inventory-remove-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const result = await fetchJson(`/vehicles/${tyreState.selectedVehicleId}/tyre-inventory/${button.dataset.id}`, {
          method: "DELETE",
        });
        showToast(result.message, "success");
        await loadTyreDetail(tyreState.selectedVehicleId);
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

function renderPunctureRequests(detail) {
  const list = document.getElementById("punctureRequestList");
  const punctureRequests = detail.punctureRequests || [];
  list.innerHTML = punctureRequests.length
    ? punctureRequests
        .slice(0, 8)
        .map(
          (item) => `
            <div class="list-item puncture-card puncture-${item.status}">
              <div class="puncture-card-head">
                <strong>${item.axle} | ${item.position}</strong>
                <span class="status-pill ${item.status === "approved" ? "moving" : item.status === "rejected" ? "breakdown" : "idle"}">${formatStatus(item.status)}</span>
              </div>
              <div class="small">${item.driverName || detail.vehicle.driver} | ${new Date(item.requestedAt).toLocaleString()}</div>
              <div class="small">${item.note || "No puncture note provided."}</div>
              ${item.photo ? `<img class="puncture-thumb" src="${item.photo}" alt="Puncture evidence" />` : ""}
              <div class="small">${item.reviewerNote || "Awaiting review."}</div>
              ${
                item.status === "pending"
                  ? `<div class="toolbar">
                      <button class="btn btn-secondary puncture-status-btn" type="button" data-id="${item.id}" data-status="approved">Approve</button>
                      <button class="btn btn-danger puncture-status-btn" type="button" data-id="${item.id}" data-status="rejected">Reject</button>
                    </div>`
                  : ""
              }
            </div>
          `,
        )
        .join("")
    : '<div class="empty-state">No puncture approvals submitted yet.</div>';

  document.querySelectorAll(".puncture-status-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const reviewerNote = window.prompt(`Add ${button.dataset.status} note`, "");
      try {
        const result = await fetchJson(
          `/vehicles/${tyreState.selectedVehicleId}/puncture-requests/${button.dataset.id}/status`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: button.dataset.status, reviewerNote: reviewerNote || "" }),
          },
        );
        showToast(result.message, "success");
        await loadTyreDetail(tyreState.selectedVehicleId);
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

function renderTyreHealth(detail) {
  const totalSlots = detail.layout.length;
  const installed = detail.tyres.length;
  const healthy = detail.tyres.filter((tyre) => tyre.pressure >= 90 && tyre.pressure <= 125 && tyre.treadDepth >= 8).length;
  const maintenance = detail.tyres.filter((tyre) => tyre.pressure < 90 || tyre.pressure > 125 || tyre.treadDepth < 8).length;
  const theftWatch = totalSlots - installed;
  document.getElementById("tyreInstalledCount").textContent = installed;
  document.getElementById("tyreHealthyCount").textContent = healthy;
  document.getElementById("tyreMaintenanceCount").textContent = maintenance;
  document.getElementById("tyreTheftWatchCount").textContent = theftWatch;
}

async function loadTyreDetail(vehicleId) {
  try {
    document.getElementById("tyreVehicleMeta").textContent = "Loading vehicle tyre details...";
    const detail = await fetchJson("/vehicles/" + vehicleId + "/tyres");
    tyreState.selectedVehicleId = String(vehicleId);
    tyreState.detail = detail;
    renderVehicleOptions();
    renderAxlePresetOptions(detail);
    renderTyreCatalog(detail);
    renderAxleSelectors(detail.layout);
    renderTyreLayout(detail);
    renderInstalledTyres(detail);
    renderTyreActivity(detail);
    renderInventory(detail);
    renderPunctureRequests(detail);
    renderTyreHealth(detail);
    setDefaultTyreDates();
  } catch (error) {
    document.getElementById("tyreVehicleMeta").textContent = error.message;
    showToast(error.message, "error");
  }
}

document.getElementById("tyreVehicleSelect").addEventListener("change", async (event) => {
  if (!event.target.value) {
    return;
  }
  await loadTyreDetail(event.target.value);
});

document.getElementById("saveAxleConfigBtn").addEventListener("click", async () => {
  try {
    if (!tyreState.selectedVehicleId) {
      showToast("Select a vehicle first", "error");
      return;
    }
    const axleConfiguration = document.getElementById("axlePresetSelect").value;
    if (!axleConfiguration) {
      showToast("Select an axle setup first", "error");
      return;
    }
    const result = await fetchJson("/vehicles/" + tyreState.selectedVehicleId + "/axle-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ axleConfiguration }),
    });
    showToast(result.message, "success");
    await loadTyreDetail(tyreState.selectedVehicleId);
  } catch (error) {
    showToast(error.message, "error");
  }
});

document.getElementById("tyreInstallForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = document.getElementById("tyreInstallForm");
  const form = new FormData(formElement);
  try {
    if (!tyreState.selectedVehicleId) {
      showToast("Select a vehicle first", "error");
      return;
    }
    const installedAtValue = form.get("installedAt");
    const result = await fetchJson("/vehicles/" + tyreState.selectedVehicleId + "/tyres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tyreType: form.get("tyreType"),
        tyreCondition: form.get("tyreCondition"),
        tyreMeter: form.get("tyreMeter"),
        tyreSerialNumber: form.get("tyreSerialNumber"),
        axle: form.get("axle"),
        position: form.get("position"),
        slot: form.get("slot"),
        treadDepth: form.get("treadDepth"),
        pressure: form.get("pressure"),
        installedAt: installedAtValue ? new Date(installedAtValue).toISOString() : new Date().toISOString(),
      }),
    });
    showMessage("tyreInstallMessage", result.message, "success");
    showToast(result.message, "success");
    if (formElement) {
      formElement.reset();
    }
    setSelectedSlot(null, tyreState.detail?.vehicle?.vehicle_no || "vehicle");
    setDefaultTyreDates();
    await loadTyreDetail(tyreState.selectedVehicleId);
  } catch (error) {
    showMessage("tyreInstallMessage", error.message, "error");
    showToast(error.message, "error");
  }
});

document.getElementById("tyreInventoryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = document.getElementById("tyreInventoryForm");
  const form = new FormData(formElement);
  try {
    if (!tyreState.selectedVehicleId) {
      showToast("Select a vehicle first", "error");
      return;
    }
    const result = await fetchJson(`/vehicles/${tyreState.selectedVehicleId}/tyre-inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tyreType: form.get("tyreType"),
        tyreSerialNumber: form.get("tyreSerialNumber"),
        quantity: form.get("quantity"),
        condition: form.get("condition"),
        location: form.get("location"),
        note: form.get("note"),
      }),
    });
    showMessage("tyreInventoryMessage", result.message, "success");
    showToast(result.message, "success");
    formElement.reset();
    await loadTyreDetail(tyreState.selectedVehicleId);
  } catch (error) {
    showMessage("tyreInventoryMessage", error.message, "error");
    showToast(error.message, "error");
  }
});

document.getElementById("puncturePhotoFile").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  tyreState.puncturePhotoData = "";
  if (!file) {
    return;
  }
  tyreState.puncturePhotoData = await fileToDataUrl(file);
});

document.getElementById("punctureApprovalForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = document.getElementById("punctureApprovalForm");
  const form = new FormData(formElement);
  try {
    if (!tyreState.selectedVehicleId) {
      showToast("Select a vehicle first", "error");
      return;
    }
    if (!tyreState.selectedSlot) {
      showToast("Select a tyre slot first", "error");
      return;
    }
    if (!tyreState.puncturePhotoData) {
      showToast("Upload a puncture photo first", "error");
      return;
    }
    const requestedAtValue = form.get("requestedAt");
    const result = await fetchJson(`/vehicles/${tyreState.selectedVehicleId}/puncture-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        axle: tyreState.selectedSlot.axle,
        position: tyreState.selectedSlot.position,
        slot: tyreState.selectedSlot.slot,
        driverName: form.get("driverName") || tyreState.detail?.vehicle?.driver || "",
        note: form.get("note"),
        requestedAt: requestedAtValue ? new Date(requestedAtValue).toISOString() : new Date().toISOString(),
        photo: tyreState.puncturePhotoData,
      }),
    });
    showMessage("punctureApprovalMessage", result.message, "success");
    showToast(result.message, "success");
    formElement.reset();
    tyreState.puncturePhotoData = "";
    setDefaultTyreDates();
    await loadTyreDetail(tyreState.selectedVehicleId);
  } catch (error) {
    showMessage("punctureApprovalMessage", error.message, "error");
    showToast(error.message, "error");
  }
});

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read uploaded image"));
    reader.readAsDataURL(file);
  });
}

async function initTyres() {
  renderAxlePresetOptions({
    presets: DEFAULT_AXLE_PRESETS,
    vehicle: { axleConfiguration: "6x4" },
  });
  try {
    tyreState.vehicles = await fetchJson("/vehicles");
    const requestedId = getVehicleIdFromQuery();
    const targetId = requestedId || tyreState.vehicles[0]?.id;
    renderVehicleOptions();
    if (!targetId) {
      document.getElementById("tyreVehicleMeta").textContent = "No vehicles available. Add a vehicle first from the Vehicles page.";
      setDefaultTyreDates();
      return;
    }
    await loadTyreDetail(targetId);
  } catch (error) {
    document.getElementById("tyreVehicleMeta").textContent = error.message;
    showToast(error.message, "error");
  }
}

setDefaultTyreDates();
initTyres();
