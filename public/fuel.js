renderTopbar("fuel");

async function loadFuelPage() {
  const readings = await fetchJson("/fuel-readings");
  const sorted = [...readings].sort((a, b) => a.fuelReading - b.fuelReading);
  const lowFuel = sorted.filter((vehicle) => vehicle.fuelReading <= 35);
  const avgFuel = Math.round(
    sorted.reduce((total, vehicle) => total + vehicle.fuelReading, 0) / Math.max(sorted.length, 1),
  );

  document.getElementById("fuelMetrics").innerHTML = `
    <div class="metric-row"><span>Average fuel</span><strong>${avgFuel}%</strong></div>
    <div class="metric-row"><span>Low fuel vehicles</span><strong>${lowFuel.length}</strong></div>
    <div class="metric-row"><span>Refuel soon</span><strong>${sorted.filter((vehicle) => vehicle.fuelReading <= 20).length}</strong></div>
    <div class="metric-row"><span>Total last fill</span><strong>${sorted.reduce((total, vehicle) => total + vehicle.lastFuelFillLiters, 0)} L</strong></div>
  `;

  document.getElementById("fuelList").innerHTML = lowFuel.length
    ? lowFuel
        .map(
          (vehicle) => `
            <div class="table-row">
              <div>
                <strong>${vehicle.vehicle_no}</strong>
                <div class="small">${vehicle.driver} | ${formatStatus(vehicle.status)}</div>
                <div class="small">Last fill: ${vehicle.lastFuelFillLiters} L on ${formatDateTime(vehicle.lastFuelFillAt)}</div>
              </div>
              <div class="table-row-side">
                <span class="status-pill ${vehicle.fuelReading <= 20 ? "breakdown" : "idle"}">${vehicle.fuelReading}%</span>
              </div>
            </div>
          `,
        )
        .join("")
    : '<div class="empty-state">No vehicles currently need fuel attention.</div>';
}

loadFuelPage();
