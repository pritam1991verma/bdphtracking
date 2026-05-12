renderTopbar("adblue");

async function loadAdbluePage() {
  const readings = await fetchJson("/adblue-readings");
  const sorted = [...readings].sort((a, b) => a.adblueReading - b.adblueReading);
  const lowAdblue = sorted.filter((vehicle) => vehicle.adblueReading <= 35);
  const avgAdblue = Math.round(
    sorted.reduce((total, vehicle) => total + vehicle.adblueReading, 0) / Math.max(sorted.length, 1),
  );

  document.getElementById("adblueMetrics").innerHTML = `
    <div class="metric-row"><span>Average AdBlue</span><strong>${avgAdblue}%</strong></div>
    <div class="metric-row"><span>Low AdBlue vehicles</span><strong>${lowAdblue.length}</strong></div>
    <div class="metric-row"><span>Refill urgent</span><strong>${sorted.filter((vehicle) => vehicle.adblueReading <= 20).length}</strong></div>
    <div class="metric-row"><span>Total last refill</span><strong>${sorted.reduce((total, vehicle) => total + vehicle.lastAdblueFillLiters, 0)} L</strong></div>
  `;

  document.getElementById("adblueList").innerHTML = lowAdblue.length
    ? lowAdblue
        .map(
          (vehicle) => `
            <div class="table-row">
              <div>
                <strong>${vehicle.vehicle_no}</strong>
                <div class="small">${vehicle.driver} | ${formatStatus(vehicle.status)}</div>
                <div class="small">Last refill: ${vehicle.lastAdblueFillLiters} L on ${formatDateTime(vehicle.lastAdblueFillAt)}</div>
              </div>
              <div class="table-row-side">
                <span class="status-pill ${vehicle.adblueReading <= 20 ? "offline" : "parked"}">${vehicle.adblueReading}%</span>
              </div>
            </div>
          `,
        )
        .join("")
    : '<div class="empty-state">No vehicles currently need AdBlue attention.</div>';
}

loadAdbluePage();
