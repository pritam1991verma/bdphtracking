renderTopbar("inventory");

let inwardRowCounter = 0;
let cachedOutwardLedger = [];

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(",").map((item) => item.trim());
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const values = line.split(",").map((item) => item.trim());
      return headers.reduce((row, header, index) => {
        row[header] = values[index] || "";
        return row;
      }, {});
    });
}

function fileToText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read uploaded file"));
    reader.readAsText(file);
  });
}

async function importInventoryInwardRows(rows) {
  try {
    return await fetchJson("/inventory-inwards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: rows }),
    });
  } catch (error) {
    if (!String(error.message || "").includes("404")) {
      throw error;
    }
    throw new Error("Inventory inward upload needs server restart to enable bulk save.");
  }
}

async function importInventoryOutwardRows(rows) {
  try {
    return await fetchJson("/inventory-records/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: rows }),
    });
  } catch (error) {
    if (!String(error.message || "").includes("404")) {
      throw error;
    }

    let successCount = 0;
    for (const row of rows) {
      try {
        await fetchJson("/inventory-records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        });
        successCount += 1;
      } catch (_rowError) {
        continue;
      }
    }

    if (!successCount) {
      throw new Error("Outward CSV upload could not be saved. Please restart server and try again.");
    }

    return { message: `${successCount} outward ledger rows imported successfully` };
  }
}

function toDatetimeLocalValue(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function setDefaultInventoryDate() {
  const input = document.getElementById("inventoryRecordedAt");
  if (input) {
    input.value = toDatetimeLocalValue();
  }
}

function addInwardRow(values = {}) {
  inwardRowCounter += 1;
  const row = document.createElement("div");
  row.className = "inventory-multi-row";
  row.dataset.rowId = String(inwardRowCounter);
  row.innerHTML = `
    <div class="form-grid">
      <input class="field" name="itemName" placeholder="Item name" value="${values.itemName || ""}" required />
      <input class="field" name="serialNumber" placeholder="Serial number" value="${values.serialNumber || ""}" required />
      <input class="field" name="vendor" placeholder="Vendor" value="${values.vendor || ""}" required />
      <input class="field" name="brand" placeholder="Brand" value="${values.brand || ""}" required />
      <input class="field" name="cost" type="number" min="0" step="0.01" placeholder="Cost" value="${values.cost || ""}" required />
      <input class="field" name="quantity" type="number" min="1" step="1" placeholder="Quantity" value="${values.quantity || 1}" required />
      <input class="field" name="recordedAt" type="datetime-local" value="${values.recordedAt || toDatetimeLocalValue()}" required />
    </div>
    <div class="toolbar compact-toolbar">
      <button class="btn btn-danger remove-inward-row-btn" type="button">Remove</button>
    </div>
  `;
  document.getElementById("inventoryInwardRows").appendChild(row);

  row.querySelector(".remove-inward-row-btn").addEventListener("click", () => {
    if (document.querySelectorAll(".inventory-multi-row").length === 1) {
      showToast("Keep at least one inward row", "error");
      return;
    }
    row.remove();
  });
}

function collectInwardRows() {
  return [...document.querySelectorAll(".inventory-multi-row")].map((row) => ({
    itemName: row.querySelector('[name="itemName"]').value,
    serialNumber: row.querySelector('[name="serialNumber"]').value,
    vendor: row.querySelector('[name="vendor"]').value,
    brand: row.querySelector('[name="brand"]').value,
    cost: row.querySelector('[name="cost"]').value,
    quantity: row.querySelector('[name="quantity"]').value,
    recordedAt: new Date(row.querySelector('[name="recordedAt"]').value).toISOString(),
  }));
}

function downloadOutwardCsv() {
  const header = ["Item", "Add Stock", "Used Stock", "Balance", "Vehicle No", "Allotted Person", "Date", "Vehicle Health"];
  const rows = cachedOutwardLedger.map((record) => [
    record.itemName,
    record.addStock,
    record.usedStock,
    record.balance,
    record.allottedVehicleNo,
    record.allottedPerson,
    new Date(record.recordedAt).toLocaleString(),
    record.vehicleHealth,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "inventory-outwards.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

async function loadInventoryPage() {
  const [inventoryReports, punctureReports, inventoryLedger, inventoryInwards] = await Promise.all([
    fetchJson("/tyre-inventory-reports"),
    fetchJson("/puncture-reports"),
    fetchJson("/inventory-records"),
    fetchJson("/inventory-inwards"),
  ]);

  cachedOutwardLedger = inventoryLedger;
  const totalQuantity = inventoryReports.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const pending = punctureReports.filter((item) => item.status === "pending");
  const rejected = punctureReports.filter((item) => item.status === "rejected");

  document.getElementById("inventoryItemCount").textContent = inventoryReports.length;
  document.getElementById("inventoryQtyCount").textContent = totalQuantity;
  document.getElementById("pendingPunctureCount").textContent = pending.length;
  document.getElementById("rejectedPunctureCount").textContent = rejected.length;

  document.getElementById("inventoryInwardTable").innerHTML = inventoryInwards.length
    ? inventoryInwards
        .map(
          (item) => `
            <tr>
              <td>${item.itemName}</td>
              <td>${item.serialNumber}</td>
              <td>${item.vendor}</td>
              <td>${item.brand}</td>
              <td>${item.quantity}</td>
              <td>${Number(item.cost).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
              <td>${new Date(item.recordedAt).toLocaleString()}</td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="7" class="small">No inward records yet.</td></tr>';

  document.getElementById("inventoryTable").innerHTML = inventoryReports.length
    ? inventoryReports
        .map(
          (item) => `
            <tr>
              <td><strong>${item.vehicle_no}</strong><div class="small">${item.label} | ${item.type}</div></td>
              <td>${item.tyreSerialNumber}</td>
              <td>${item.tyreType}</td>
              <td>${item.quantity}</td>
              <td>${formatStatus(item.condition)}</td>
              <td>${item.location}</td>
              <td>${new Date(item.updatedAt).toLocaleString()}</td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="7" class="small">No inventory records yet.</td></tr>';

  document.getElementById("inventoryLedgerTable").innerHTML = inventoryLedger.length
    ? inventoryLedger
        .map(
          (item) => `
            <tr>
              <td>${item.itemName}</td>
              <td>${item.addStock}</td>
              <td>${item.usedStock}</td>
              <td>${item.balance}</td>
              <td><strong>${item.allottedVehicleNo || "-"}</strong><div class="small">${item.label || ""}</div></td>
              <td>${item.allottedPerson || "-"}</td>
              <td>${new Date(item.recordedAt).toLocaleString()}</td>
              <td><span class="status-pill ${getStatusTone(String(item.vehicleHealth || "").toLowerCase().replaceAll(" ", "-"))}">${item.vehicleHealth || "-"}</span></td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="8" class="small">No inventory ledger records yet.</td></tr>';

  document.getElementById("inventoryPunctureList").innerHTML = punctureReports.length
    ? punctureReports
        .slice(0, 12)
        .map(
          (item) => `
            <div class="list-item puncture-card puncture-${item.status}">
              <div class="puncture-card-head">
                <strong>${item.vehicle_no} | ${item.axle || "-"} | ${item.position || "-"}</strong>
                <span class="status-pill ${item.status === "approved" ? "moving" : item.status === "rejected" ? "breakdown" : "idle"}">${formatStatus(item.status)}</span>
              </div>
              <div class="small">${item.driverName || "-"} | ${new Date(item.requestedAt).toLocaleString()}</div>
              <div class="small">${item.note || "No puncture note provided."}</div>
              ${item.photo ? `<img class="puncture-thumb" src="${item.photo}" alt="Puncture evidence" />` : ""}
            </div>
          `,
        )
        .join("")
    : '<div class="empty-state">No puncture requests in the queue.</div>';
}

document.getElementById("addInwardRowBtn").addEventListener("click", () => addInwardRow());

document.getElementById("inventoryInwardForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const result = await fetchJson("/inventory-inwards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: collectInwardRows() }),
    });
    document.getElementById("inventoryInwardRows").innerHTML = "";
    addInwardRow();
    showMessage("inventoryInwardMessage", result.message, "success");
    showToast(result.message, "success");
    await loadInventoryPage();
  } catch (error) {
    showMessage("inventoryInwardMessage", error.message, "error");
    showToast(error.message, "error");
  }
});

document.getElementById("inventoryRecordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = document.getElementById("inventoryRecordForm");
  const form = new FormData(formElement);

  try {
    const result = await fetchJson("/inventory-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemName: form.get("itemName"),
        addStock: form.get("addStock"),
        usedStock: form.get("usedStock"),
        allottedVehicleNo: form.get("allottedVehicleNo"),
        allottedPerson: form.get("allottedPerson"),
        recordedAt: new Date(form.get("recordedAt")).toISOString(),
      }),
    });
    formElement.reset();
    setDefaultInventoryDate();
    showMessage("inventoryRecordMessage", result.message, "success");
    showToast(result.message, "success");
    await loadInventoryPage();
  } catch (error) {
    showMessage("inventoryRecordMessage", error.message, "error");
    showToast(error.message, "error");
  }
});

document.getElementById("inventoryInwardUploadFile").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  try {
    const text = await fileToText(file);
    const rows = parseCsv(text).map((row) => ({
      itemName: row.itemName || row["Item"] || "",
      serialNumber: row.serialNumber || row["Serial Number"] || row.serial || "",
      vendor: row.vendor || row["Vendor"] || "",
      brand: row.brand || row["Brand"] || "",
      cost: row.cost || row["Cost"] || 0,
      quantity: row.quantity || row["Quantity"] || 1,
      recordedAt: row.recordedAt || row["Date"] || row["Date Time"] || new Date().toISOString(),
    }));
    const result = await importInventoryInwardRows(rows);
    showMessage("inventoryInwardMessage", result.message, "success");
    showToast(result.message, "success");
    event.target.value = "";
    await loadInventoryPage();
  } catch (error) {
    showMessage("inventoryInwardMessage", error.message, "error");
    showToast(error.message, "error");
  }
});

document.getElementById("inventoryOutwardUploadFile").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  try {
    const text = await fileToText(file);
    const rows = parseCsv(text).map((row) => ({
      itemName: row.itemName || row["Item"] || "",
      addStock: row.addStock || row["Add Stock"] || 0,
      usedStock: row.usedStock || row["Used Stock"] || 0,
      allottedVehicleNo: row.allottedVehicleNo || row["Vehicle No"] || row.vehicle || "",
      allottedPerson: row.allottedPerson || row["Allotted Person"] || row.person || "",
      recordedAt: row.recordedAt || row["Date"] || row["Date Time"] || new Date().toISOString(),
    }));
    const result = await importInventoryOutwardRows(rows);
    showMessage("inventoryRecordMessage", result.message, "success");
    showToast(result.message, "success");
    event.target.value = "";
    await loadInventoryPage();
  } catch (error) {
    showMessage("inventoryRecordMessage", error.message, "error");
    showToast(error.message, "error");
  }
});

document.getElementById("downloadOutwardBtn").addEventListener("click", downloadOutwardCsv);

addInwardRow();
setDefaultInventoryDate();
loadInventoryPage();
