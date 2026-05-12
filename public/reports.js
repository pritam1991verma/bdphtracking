renderTopbar("reports");

function formatDuration(durationMinutes) {
  const total = Number(durationMinutes || 0);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

async function loadReports() {
  const [summary, vehicles, breakdownReports, batteryAlerts] = await Promise.all([
    fetchJson("/summary"),
    fetchJson("/vehicles"),
    fetchJson("/breakdown-reports"),
    fetchJson("/battery-alerts"),
  ]);
  const [tyreReports, inventoryReports, punctureReports] = await Promise.all([
    fetchJson("/tyre-reports"),
    fetchJson("/tyre-inventory-reports"),
    fetchJson("/puncture-reports"),
  ]);
  const critical = vehicles.filter((vehicle) =>
    ["breakdown", "offline", "no-gps", "disconnected"].includes(vehicle.status),
  );
  const activeBreakdowns = breakdownReports.filter((report) => report.status === "active");
  const fixedBreakdowns = breakdownReports.filter((report) => report.status === "fixed");
  const openBatteryAlerts = batteryAlerts.filter((alert) => alert.status === "open");

  document.getElementById("reportMetrics").innerHTML = `
    <div class="metric-row"><span>Total vehicles</span><strong>${summary.total || 0}</strong></div>
    <div class="metric-row"><span>Moving vehicles</span><strong>${summary.moving || 0}</strong></div>
    <div class="metric-row"><span>Average speed</span><strong>${summary.averageSpeed || 0} km/h</strong></div>
    <div class="metric-row"><span>Critical alerts</span><strong>${critical.length}</strong></div>
    <div class="metric-row"><span>Open battery alerts</span><strong>${openBatteryAlerts.length}</strong></div>
    <div class="metric-row"><span>Active breakdowns</span><strong>${activeBreakdowns.length}</strong></div>
    <div class="metric-row"><span>Fixed breakdowns</span><strong>${fixedBreakdowns.length}</strong></div>
  `;

  document.getElementById("reportNotes").innerHTML = `
    <div class="list-item">Moving fleet remains visible with enhanced status colors for faster scanning.</div>
    <div class="list-item">${summary.parked || 0} parked and ${summary.stopped || 0} stopped vehicles are waiting for the next movement cycle.</div>
    <div class="list-item">${summary.breakdown || 0} breakdown units need operational follow-up.</div>
    <div class="list-item">${(summary.offline || 0) + (summary["no-gps"] || 0) + (summary.disconnected || 0)} units need connectivity or GPS attention.</div>
    <div class="list-item">${openBatteryAlerts.length} battery protection alerts are open across disconnect, low-voltage, or device-offline watch.</div>
  `;

  document.getElementById("breakdownReportTable").innerHTML = breakdownReports.length
    ? breakdownReports
        .map(
          (report) => `
            <tr>
              <td>
                <strong>${report.vehicle_no}</strong>
                <div class="small">${report.driver} | ${report.type}</div>
              </td>
              <td><span class="status-pill ${report.status === "active" ? "breakdown" : "moving"}">${report.status === "active" ? "Breakdown" : "Fixed"}</span></td>
              <td>${report.reason || report.fixedReason || "-"}</td>
              <td>${new Date(report.startedAt).toLocaleString()}</td>
              <td>${report.fixedAt ? new Date(report.fixedAt).toLocaleString() : "Open"}</td>
              <td>${formatDuration(report.durationMinutes)}</td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="6" class="small">No breakdown history yet.</td></tr>';

  document.getElementById("batteryReportTable").innerHTML = batteryAlerts.length
    ? batteryAlerts
        .slice(0, 20)
        .map(
          (alert) => `
            <tr>
              <td><strong>${alert.vehicle_no}</strong><div class="small">${alert.label || "-"} | ${alert.typeName || alert.vehicleType || "-"}</div></td>
              <td>${alert.batterySerialNumber || "-"}</td>
              <td>${formatStatus(String(alert.type || "").toLowerCase().replaceAll("_", "-"))}</td>
              <td><span class="status-pill ${alert.status === "open" ? "breakdown" : "moving"}">${formatStatus(alert.status)}</span></td>
              <td>${Number.isFinite(Number(alert.externalVoltage)) ? Number(alert.externalVoltage).toFixed(1) + " V" : "-"}</td>
              <td>${alert.location ? `${Number(alert.location.lat).toFixed(4)}, ${Number(alert.location.lng).toFixed(4)}` : "-"}</td>
              <td>${new Date(alert.createdAt).toLocaleString()}</td>
              <td>${alert.driver || "-"}<div class="small">${alert.driverPhone || "-"}</div></td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="8" class="small">No battery alerts logged yet.</td></tr>';

  document.getElementById("tyreReportTable").innerHTML = tyreReports.length
    ? tyreReports
        .slice(0, 20)
        .map(
          (report) => `
            <tr>
              <td><strong>${report.vehicle_no}</strong><div class="small">${report.label} | ${report.type}</div></td>
              <td>${report.action}</td>
              <td>${report.axle || "-"}</td>
              <td>${report.side}</td>
              <td>${report.position || "-"}</td>
              <td>${report.tyreSerialNumber || "-"}</td>
              <td>${report.tyreType || "-"}</td>
              <td>${new Date(report.installedAt).toLocaleString()}</td>
              <td>${report.theftRisk ? '<span class="status-pill breakdown">Theft Watch</span>' : '<span class="status-pill moving">Normal</span>'}</td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="9" class="small">No tyre report activity yet.</td></tr>';

  document.getElementById("inventoryReportTable").innerHTML = inventoryReports.length
    ? inventoryReports
        .slice(0, 20)
        .map(
          (report) => `
            <tr>
              <td><strong>${report.vehicle_no}</strong><div class="small">${report.label} | ${report.type}</div></td>
              <td>${report.tyreSerialNumber}</td>
              <td>${report.tyreType}</td>
              <td>${report.quantity}</td>
              <td>${formatStatus(report.condition)}</td>
              <td>${report.location}</td>
              <td>${new Date(report.updatedAt).toLocaleString()}</td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="7" class="small">No tyre inventory movement yet.</td></tr>';

  document.getElementById("punctureReportTable").innerHTML = punctureReports.length
    ? punctureReports
        .slice(0, 20)
        .map((report) => {
          const side = report.position?.toLowerCase().includes("left")
            ? "Left"
            : report.position?.toLowerCase().includes("right")
              ? "Right"
              : "Center";
          return `
            <tr>
              <td><strong>${report.vehicle_no}</strong><div class="small">${report.label} | ${report.type}</div></td>
              <td>${report.axle || "-"}</td>
              <td>${side}</td>
              <td>${report.position || "-"}</td>
              <td><span class="status-pill ${report.status === "approved" ? "moving" : report.status === "rejected" ? "breakdown" : "idle"}">${formatStatus(report.status)}</span></td>
              <td>${report.driverName || "-"}</td>
              <td>${new Date(report.requestedAt).toLocaleString()}</td>
              <td>${report.reviewedAt ? new Date(report.reviewedAt).toLocaleString() : "Pending"}</td>
            </tr>
          `;
        })
        .join("")
    : '<tr><td colspan="8" class="small">No puncture approvals logged yet.</td></tr>';
}

loadReports();
