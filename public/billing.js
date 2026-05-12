const billingCurrentUser = renderTopbar("billing");
let cachedTripBillingRecords = [];

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

async function importTripBillingRows(rows) {
  try {
    return await fetchJson("/trip-billing-records/import", {
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
        await fetchJson("/trip-billing-records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serialNo: row.serialNo,
            vehicleNo: row.vehicleNo,
            tripDate: row.tripDate,
            challanNo: row.challanNo,
            tonnage: row.tonnage,
            driver: row.driver,
            amount: row.amount,
          }),
        });
        successCount += 1;
      } catch (_rowError) {
        continue;
      }
    }

    if (!successCount) {
      throw new Error("CSV upload could not be saved. Please restart server and try again.");
    }

    return { message: `${successCount} trip billing rows imported successfully` };
  }
}

function getExpiryBucket(expiry) {
  const today = new Date();
  const expiryDate = new Date(expiry);
  const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) {
    return "expired";
  }
  if (diffDays <= 15) {
    return "expiring";
  }
  return "active";
}

function setDefaultBillingDate() {
  const input = document.getElementById("tripBillingDate");
  if (!input) {
    return;
  }
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  input.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

async function renewUser(userId) {
  const result = await fetchJson("/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  if (result.user.id === billingCurrentUser.id) {
    setCurrentUser(result.user);
  }
  return result;
}

function downloadTripBillingCsv() {
  const header = ["Serial No", "Vehicle No", "Date", "Challan No", "Tonnage", "Driver", "Amount"];
  const rows = cachedTripBillingRecords.map((record) => [
    record.serialNo,
    record.vehicleNo,
    new Date(record.tripDate).toLocaleString(),
    record.challanNo,
    record.tonnage,
    record.driver,
    record.amount,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "trip-billing-records.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function renderTripBillingTable(records) {
  cachedTripBillingRecords = records;
  document.getElementById("tripBillingTable").innerHTML = records.length
    ? records
        .map(
          (record) => `
            <tr>
              <td>${record.serialNo}</td>
              <td><strong>${record.vehicleNo}</strong><div class="small">${record.vehicleLabel || "-"} | ${record.vehicleType || "-"}</div></td>
              <td>${new Date(record.tripDate).toLocaleString()}</td>
              <td>${record.challanNo}</td>
              <td>${record.tonnage}</td>
              <td>${record.driver}</td>
              <td>${Number(record.amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="7" class="small">No trip billing records yet.</td></tr>';
}

async function loadBillingPage() {
  const [accounts, tripBillingRecords] = await Promise.all([
    fetchJson("/billing-overview"),
    fetchJson("/trip-billing-records"),
  ]);
  const active = accounts.filter((item) => getExpiryBucket(item.user.expiry) === "active");
  const expiring = accounts.filter((item) => getExpiryBucket(item.user.expiry) === "expiring");
  const expired = accounts.filter((item) => getExpiryBucket(item.user.expiry) === "expired");

  document.getElementById("billingUserCount").textContent = accounts.length;
  document.getElementById("billingActiveCount").textContent = active.length;
  document.getElementById("billingExpiringCount").textContent = expiring.length;
  document.getElementById("billingExpiredCount").textContent = expired.length;

  renderTripBillingTable(tripBillingRecords);

  document.getElementById("billingTable").innerHTML = accounts.length
    ? accounts
        .map((item) => {
          const bucket = getExpiryBucket(item.user.expiry);
          const tone = bucket === "expired" ? "breakdown" : bucket === "expiring" ? "idle" : "moving";
          return `
            <tr>
              <td><strong>${item.user.name}</strong><div class="small">${item.user.username} | ${item.user.role}</div></td>
              <td><span class="status-pill ${tone}">${formatStatus(item.status)}</span></td>
              <td>${item.user.expiry}</td>
              <td>${item.accessCount}</td>
              <td><button class="btn btn-secondary billing-renew-btn" type="button" data-id="${item.user.id}">Renew</button></td>
            </tr>
          `;
        })
        .join("")
    : '<tr><td colspan="5" class="small">No billing accounts available.</td></tr>';

  const totalPayable = tripBillingRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  document.getElementById("billingSnapshot").innerHTML = `
    <div class="metric-row"><span>Renewal Focus</span><strong>${expiring.length + expired.length} accounts</strong></div>
    <div class="metric-row"><span>Trip Billing Entries</span><strong>${tripBillingRecords.length}</strong></div>
    <div class="metric-row"><span>Total Payable</span><strong>${totalPayable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong></div>
    <div class="metric-row"><span>Current Login</span><strong>${billingCurrentUser.name}</strong></div>
  `;

  document.querySelectorAll(".billing-renew-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const result = await renewUser(Number(button.dataset.id));
        showToast(result.message, "success");
        await loadBillingPage();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

document.getElementById("tripBillingForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = document.getElementById("tripBillingForm");
  const form = new FormData(formElement);

  try {
    const result = await fetchJson("/trip-billing-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serialNo: form.get("serialNo"),
        vehicleNo: form.get("vehicleNo"),
        tripDate: new Date(form.get("tripDate")).toISOString(),
        challanNo: form.get("challanNo"),
        tonnage: form.get("tonnage"),
        driver: form.get("driver"),
        amount: form.get("amount"),
      }),
    });
    formElement.reset();
    setDefaultBillingDate();
    showMessage("tripBillingMessage", result.message, "success");
    showToast(result.message, "success");
    await loadBillingPage();
  } catch (error) {
    showMessage("tripBillingMessage", error.message, "error");
    showToast(error.message, "error");
  }
});

document.getElementById("downloadBillingBtn").addEventListener("click", downloadTripBillingCsv);

document.getElementById("challanNoInput").addEventListener("blur", () => {
  const challanNo = String(document.getElementById("challanNoInput").value || "").trim().toUpperCase();
  if (!challanNo) {
    return;
  }
  const duplicate = cachedTripBillingRecords.some(
    (record) => String(record.challanNo || "").trim().toUpperCase() === challanNo,
  );
  if (duplicate) {
    showMessage("tripBillingMessage", "Duplicate challan number detected", "error");
    showToast("Duplicate challan number detected", "error");
  }
});

document.getElementById("billingUploadFile").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await fileToText(file);
    const rows = parseCsv(text).map((row) => ({
      serialNo: row.serialNo || row["Serial No"] || row.serial || "",
      vehicleNo: row.vehicleNo || row["Vehicle No"] || row.vehicle || "",
      tripDate: row.tripDate || row["Date"] || row.date || new Date().toISOString(),
      challanNo: row.challanNo || row["Challan No"] || row.challan || "",
      tonnage: row.tonnage || row["Tonnage"] || 0,
      driver: row.driver || row["Driver"] || "",
      amount: row.amount || row["Amount"] || 0,
    }));
    const result = await importTripBillingRows(rows);
    showMessage("tripBillingMessage", result.message, "success");
    showToast(result.message, "success");
    event.target.value = "";
    await loadBillingPage();
  } catch (error) {
    showMessage("tripBillingMessage", error.message, "error");
    showToast(error.message, "error");
  }
});

setDefaultBillingDate();
loadBillingPage();
