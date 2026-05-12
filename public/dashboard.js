const currentUser = renderTopbar("dashboard");
let analyticsModel = {};
let activeAnalyticsTab = "fuel";
const dashboardState = {
  vehicles: [],
  billing: null,
  selectedVehicleId: "all",
};

function getSelectedVehicle(vehicles = dashboardState.vehicles) {
  if (dashboardState.selectedVehicleId === "all") {
    return null;
  }
  return vehicles.find((vehicle) => String(vehicle.id) === String(dashboardState.selectedVehicleId)) || null;
}

function getScopedVehicles() {
  const selectedVehicle = getSelectedVehicle();
  return selectedVehicle ? [selectedVehicle] : dashboardState.vehicles;
}

function summarizeVehicles(vehicles) {
  return vehicles.reduce(
    (summary, vehicle) => {
      summary.total += 1;
      summary[vehicle.status] = (summary[vehicle.status] || 0) + 1;
      summary.averageSpeedTotal += Number(vehicle.speed || 0);
      summary.lowFuel += (vehicle.fuel || 0) <= 35 ? 1 : 0;
      summary.lowAdblue += (vehicle.adblue || 0) <= 30 ? 1 : 0;
      summary.lastUpdate = Math.max(summary.lastUpdate, new Date(vehicle.last_seen || vehicle.updated_at || Date.now()).getTime());
      return summary;
    },
    {
      total: 0,
      moving: 0,
      idle: 0,
      parked: 0,
      stopped: 0,
      breakdown: 0,
      offline: 0,
      "no-gps": 0,
      disconnected: 0,
      lowFuel: 0,
      lowAdblue: 0,
      averageSpeedTotal: 0,
      lastUpdate: 0,
    },
  );
}

function getHealthLabel(summary, selectedVehicle) {
  if (selectedVehicle) {
    if (["breakdown", "offline", "no-gps", "disconnected"].includes(selectedVehicle.status)) {
      return "Critical";
    }
    if ((selectedVehicle.fuel || 0) <= 35 || (selectedVehicle.adblue || 0) <= 30) {
      return "Low Consumables";
    }
    if (selectedVehicle.status === "moving") {
      return "In Operation";
    }
    return "Stable";
  }

  const critical = summary.breakdown + summary.offline + summary["no-gps"] + summary.disconnected;
  if (critical > 0) {
    return "Attention Needed";
  }
  if (summary.lowFuel > 0 || summary.lowAdblue > 0) {
    return "Service Watch";
  }
  return "Stable";
}

function populateVehicleFilter(vehicles) {
  const select = document.getElementById("dashboardVehicleFilter");
  select.innerHTML =
    '<option value="all">All Vehicles</option>' +
    vehicles
      .map(
        (vehicle) =>
          `<option value="${vehicle.id}" ${String(vehicle.id) === String(dashboardState.selectedVehicleId) ? "selected" : ""}>${vehicle.vehicle_no} | ${vehicle.driver}</option>`,
      )
      .join("");
}

function createLastSevenDayLabels() {
  const labels = [];
  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    labels.push(
      date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
    );
  }
  return labels;
}

function buildSeries(baseValue, offsets, minimum) {
  return offsets.map((offset) => Math.max(minimum, Math.round(baseValue + offset)));
}

function buildAnalyticsModel(summary, vehicles) {
  const labels = createLastSevenDayLabels();
  const totalVehicles = Math.max(vehicles.length, 1);
  const selectedVehicle = vehicles.length === 1 ? vehicles[0] : null;
  const avgFuel = Math.round(vehicles.reduce((sum, vehicle) => sum + (vehicle.fuel || 0), 0) / totalVehicles);
  const avgAdblue = Math.round(vehicles.reduce((sum, vehicle) => sum + (vehicle.adblue || 0), 0) / totalVehicles);
  const movingVehicles = summary.moving || 0;
  const activeTripsBase = movingVehicles * 18 + (summary.idle || 0) * 7 + (summary.parked || 0) * 3;
  const breakdownBase = Math.max(summary.breakdown || 0, 1);
  const lowFuelCount = vehicles.filter((vehicle) => (vehicle.fuel || 0) <= 35).length;
  const lowAdblueCount = vehicles.filter((vehicle) => (vehicle.adblue || 0) <= 30).length;
  const criticalVehicles = vehicles.filter((vehicle) =>
    ["breakdown", "offline", "no-gps", "disconnected"].includes(vehicle.status),
  ).length;
  const scopeName = selectedVehicle ? selectedVehicle.vehicle_no : "Fleet";

  return {
    fuel: {
      metricLabel: selectedVehicle ? scopeName + " Fuel Level" : "Average Fleet Fuel",
      metricValue: avgFuel + "%",
      metricMeta: selectedVehicle
        ? scopeName + ((selectedVehicle.fuel || 0) <= 35 ? " is in low-fuel watch and should be planned for refill." : " fuel level is currently healthy.")
        : lowFuelCount + " vehicles are in low-fuel watch and need closer planning.",
      chartTitle: selectedVehicle ? "Selected Vehicle Fuel Pattern" : "Fuel Balance And Risk Trend",
      chartSubtitle: selectedVehicle
        ? "A focused view for refill readiness and recent operational drawdown."
        : "A dashboard blend of live fuel level and operational drawdown.",
      barLegend: "Fuel Balance %",
      lineLegend: selectedVehicle ? "Risk Signal" : "Low Fuel Units",
      barColor: "#22c55e",
      lineColor: "#f59e0b",
      labels,
      bars: buildSeries(avgFuel, [6, 4, 2, 1, -2, -4, -6], 10),
      line: buildSeries(Math.max(selectedVehicle ? ((selectedVehicle.fuel || 0) <= 35 ? 2 : 1) : lowFuelCount, 1), [0, 1, 1, 2, 1, 2, 3], 0),
      badges: [
        { label: selectedVehicle ? "Current Fuel" : "Lowest Fuel", value: Math.min(...vehicles.map((vehicle) => vehicle.fuel || 0), avgFuel) + "%" },
        { label: selectedVehicle ? "Vehicle Status" : "Refuel Focus", value: selectedVehicle ? formatStatus(selectedVehicle.status) : lowFuelCount + " vehicles" },
      ],
      insights: [
        ["Consumption Pattern", selectedVehicle ? scopeName + " shows a tighter fuel window, so dispatch decisions should consider refill proximity." : "Fuel balance softens toward the end of the week, which usually signals route-heavy usage."],
        ["Dispatch Priority", selectedVehicle ? (((selectedVehicle.fuel || 0) <= 35) ? scopeName + " should be reviewed before assigning a longer route." : scopeName + " is not in the low-fuel bucket right now.") : (lowFuelCount ? lowFuelCount + " vehicles should be reviewed before assigning longer routes." : "No vehicle is currently in the immediate low-fuel bucket.")],
        ["Operational Signal", selectedVehicle ? "Current speed, route load, and halt duration will directly influence the next refill decision for this vehicle." : movingVehicles + " vehicles moving right now is the biggest driver behind recent fuel drawdown."],
      ],
    },
    adblue: {
      metricLabel: selectedVehicle ? scopeName + " AdBlue Level" : "Average AdBlue Health",
      metricValue: avgAdblue + "%",
      metricMeta: selectedVehicle
        ? scopeName + ((selectedVehicle.adblue || 0) <= 30 ? " needs AdBlue refill attention soon." : " has stable AdBlue coverage.")
        : lowAdblueCount + " vehicles are nearing refill threshold for emission fluid.",
      chartTitle: selectedVehicle ? "Selected Vehicle AdBlue Stability" : "AdBlue Stability And Refill Demand",
      chartSubtitle: selectedVehicle
        ? "A vehicle-specific view for refill readiness and emission continuity."
        : "A maintenance-facing view for fluid health and refill timing.",
      barLegend: "AdBlue Level %",
      lineLegend: selectedVehicle ? "Refill Risk" : "Refill Candidates",
      barColor: "#38bdf8",
      lineColor: "#8b5cf6",
      labels,
      bars: buildSeries(avgAdblue, [5, 4, 3, 1, -1, -2, -4], 10),
      line: buildSeries(Math.max(selectedVehicle ? ((selectedVehicle.adblue || 0) <= 30 ? 2 : 1) : lowAdblueCount, 1), [0, 0, 1, 1, 1, 2, 2], 0),
      badges: [
        { label: selectedVehicle ? "Current AdBlue" : "Lowest AdBlue", value: Math.min(...vehicles.map((vehicle) => vehicle.adblue || 0), avgAdblue) + "%" },
        { label: selectedVehicle ? "Emission State" : "Refill Queue", value: selectedVehicle ? (((selectedVehicle.adblue || 0) <= 30) ? "Needs refill" : "Healthy") : lowAdblueCount + " vehicles" },
      ],
      insights: [
        ["Emission Readiness", selectedVehicle ? scopeName + " should stay above refill threshold to avoid compliance interruptions." : "AdBlue is generally steadier than fuel, but later-day pressure suggests refill planning should stay active."],
        ["Maintenance Cue", selectedVehicle ? (((selectedVehicle.adblue || 0) <= 30) ? scopeName + " should be paired with service planning for refill." : scopeName + " does not need immediate AdBlue intervention.") : (lowAdblueCount ? lowAdblueCount + " vehicles should be paired with workshop visits for refill." : "Emission fluid coverage is currently stable across the active fleet.")],
        ["Best Use", selectedVehicle ? "This focused view helps pair AdBlue planning with this vehicle's next workshop or route pause." : "This view is strongest when refill planning and preventive service are aligned together."],
      ],
    },
    trips: {
      metricLabel: selectedVehicle ? scopeName + " Trip Signal" : "Projected Weekly Trips",
      metricValue: activeTripsBase.toLocaleString("en-IN"),
      metricMeta: selectedVehicle
        ? "Trip projection is based on this vehicle's current movement state and operating condition."
        : "Trip pressure is strongest where moving and idle vehicles overlap across dispatch windows.",
      chartTitle: selectedVehicle ? "Selected Vehicle Trip Output" : "Trip Volume And Distance Output",
      chartSubtitle: selectedVehicle
        ? "A focused productivity view for route distance and movement quality."
        : "A productivity view for route output and distance quality.",
      barLegend: "Distance (km)",
      lineLegend: "Trips",
      barColor: "#14b8a6",
      lineColor: "#f97316",
      labels,
      bars: buildSeries(activeTripsBase * 7, [220, 180, 210, 260, 120, 160, 190], 60),
      line: buildSeries(activeTripsBase, [4, 2, 5, 6, -1, 1, 3], 1),
      badges: [
        { label: selectedVehicle ? "Vehicle State" : "Moving Fleet", value: selectedVehicle ? formatStatus(selectedVehicle.status) : movingVehicles + " units" },
        { label: "Avg Speed", value: (summary.averageSpeed || 0) + " km/h" },
      ],
      insights: [
        ["Trip Rhythm", selectedVehicle ? scopeName + " can be reviewed against route quality, speed, and halt windows for better trip planning." : "Distance and trip count are moving together, which shows healthy route execution rather than idle mileage."],
        ["Fleet Loading", selectedVehicle ? "Use this single-vehicle view to judge whether the unit is underused, overused, or route-blocked." : (summary.parked || 0) + (summary.stopped || 0) + " vehicles are currently not moving, so dispatch balancing can raise trip output."],
        ["Operational Focus", selectedVehicle ? "This graph helps decide whether this vehicle should be reassigned, rotated, or kept on the same duty pattern." : "Use this graph to compare whether trip count is driving real productivity or only short-hop congestion."],
      ],
    },
    breakdowns: {
      metricLabel: selectedVehicle ? scopeName + " Reliability State" : "Critical Fleet Exposure",
      metricValue: criticalVehicles.toString(),
      metricMeta: selectedVehicle
        ? "This view follows the selected vehicle's current status and reliability risk."
        : "This combines breakdown, offline, no GPS, and disconnected conditions into one risk picture.",
      chartTitle: selectedVehicle ? "Selected Vehicle Breakdown Risk" : "Breakdown Events And Downtime Hours",
      chartSubtitle: selectedVehicle
        ? "A focused reliability view for intervention and workshop planning."
        : "A reliability view for response speed and workshop planning.",
      barLegend: "Incident Count",
      lineLegend: selectedVehicle ? "Risk Hours" : "Downtime Hours",
      barColor: "#fb7185",
      lineColor: "#fbbf24",
      labels,
      bars: buildSeries(breakdownBase, [1, 0, 2, 1, 2, 1, 3], 0),
      line: buildSeries(Math.max(breakdownBase * 3, 2), [1, 2, 3, 1, 4, 2, 5], 1),
      badges: [
        { label: selectedVehicle ? "Current Status" : "Breakdowns", value: selectedVehicle ? formatStatus(selectedVehicle.status) : (summary.breakdown || 0) + " live" },
        { label: selectedVehicle ? "Signal State" : "Signal Risks", value: selectedVehicle ? (["offline", "no-gps", "disconnected"].includes(selectedVehicle.status) ? "Signal issue" : "Connected") : ((summary.offline || 0) + (summary["no-gps"] || 0) + (summary.disconnected || 0)) + " units" },
      ],
      insights: [
        ["Reliability Signal", selectedVehicle ? (["breakdown", "offline", "no-gps", "disconnected"].includes(selectedVehicle.status) ? scopeName + " needs immediate operational attention." : scopeName + " is not in a critical reliability state right now.") : (criticalVehicles ? criticalVehicles + " vehicles need active attention across failure and signal-loss categories." : "Critical risk is currently low across the monitored fleet.")],
        ["Downtime View", selectedVehicle ? "This graph helps estimate whether the vehicle risk is temporary, repeated, or service-linked." : "Downtime hours show operational impact better than incident count alone."],
        ["Action Path", selectedVehicle ? "Use this focused view to decide whether the next action is workshop, device check, or route intervention." : "Use this trend to separate maintenance issues from device or connectivity issues."],
      ],
    },
  };
}

function createAnalyticsChartMarkup(config) {
  const width = 760;
  const height = 280;
  const left = 56;
  const right = 56;
  const top = 24;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const barMax = Math.max(...config.bars, 1);
  const lineMax = Math.max(...config.line, 1);
  const step = plotWidth / config.labels.length;
  const barWidth = Math.min(48, step * 0.56);

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const y = top + plotHeight - ratio * plotHeight;
      return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="rgba(148,163,184,0.18)" stroke-width="1" />`;
    })
    .join("");

  const bars = config.bars
    .map((value, index) => {
      const x = left + index * step + (step - barWidth) / 2;
      const barHeight = (value / barMax) * plotHeight;
      const y = top + plotHeight - barHeight;
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="10" fill="${config.barColor}" opacity="0.78" />
        <text x="${x + barWidth / 2}" y="${height - 14}" text-anchor="middle" fill="rgba(190,210,230,0.86)" font-size="12">${config.labels[index]}</text>
      `;
    })
    .join("");

  const linePoints = config.line.map((value, index) => {
    const x = left + index * step + step / 2;
    const y = top + plotHeight - (value / lineMax) * plotHeight;
    return [x, y];
  });
  const linePath = linePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point[0]} ${point[1]}`).join(" ");
  const dots = linePoints
    .map(
      (point) =>
        `<circle cx="${point[0]}" cy="${point[1]}" r="4.5" fill="${config.lineColor}" stroke="rgba(255,255,255,0.9)" stroke-width="2" />`,
    )
    .join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" class="analytics-chart-svg" role="img" aria-label="${config.chartTitle}">
      ${gridLines}
      <text x="${left - 14}" y="${top + 8}" text-anchor="end" fill="rgba(190,210,230,0.72)" font-size="12">${barMax}</text>
      <text x="${left - 14}" y="${top + plotHeight + 4}" text-anchor="end" fill="rgba(190,210,230,0.72)" font-size="12">0</text>
      <text x="${width - right + 14}" y="${top + 8}" fill="rgba(190,210,230,0.72)" font-size="12">${lineMax}</text>
      <text x="${width - right + 14}" y="${top + plotHeight + 4}" fill="rgba(190,210,230,0.72)" font-size="12">0</text>
      ${bars}
      <path d="${linePath}" fill="none" stroke="${config.lineColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${dots}
    </svg>
  `;
}

function renderAnalyticsTab(tabKey) {
  activeAnalyticsTab = tabKey;
  const config = analyticsModel[tabKey];
  if (!config) {
    return;
  }

  document.querySelectorAll(".analytics-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabKey);
  });

  document.getElementById("analyticsMetricLabel").textContent = config.metricLabel;
  document.getElementById("analyticsMetricValue").textContent = config.metricValue;
  document.getElementById("analyticsMetricMeta").textContent = config.metricMeta;
  document.getElementById("analyticsChartTitle").textContent = config.chartTitle;
  document.getElementById("analyticsChartSubtitle").textContent = config.chartSubtitle;
  document.getElementById("analyticsBarLegend").textContent = config.barLegend;
  document.getElementById("analyticsLineLegend").textContent = config.lineLegend;
  document.getElementById("analyticsShell").style.setProperty("--analytics-bar", config.barColor);
  document.getElementById("analyticsShell").style.setProperty("--analytics-line", config.lineColor);
  document.getElementById("analyticsChart").innerHTML = createAnalyticsChartMarkup(config);
  document.getElementById("analyticsBadges").innerHTML = config.badges
    .map(
      (badge) => `
        <div class="analytics-badge">
          <span>${badge.label}</span>
          <strong>${badge.value}</strong>
        </div>
      `,
    )
    .join("");
  document.getElementById("analyticsInsights").innerHTML = config.insights
    .map(
      ([title, text]) => `
        <div class="analytics-insight-card">
          <strong>${title}</strong>
          <p class="small">${text}</p>
        </div>
      `,
    )
    .join("");
}

function bindAnalyticsTabs() {
  document.querySelectorAll(".analytics-tab").forEach((button) => {
    button.addEventListener("click", () => renderAnalyticsTab(button.dataset.tab));
  });
}

function renderStatusShowcase(summary) {
  const statuses = [
    ["moving", summary.moving],
    ["idle", summary.idle],
    ["parked", summary.parked],
    ["stopped", summary.stopped],
    ["breakdown", summary.breakdown],
    ["offline", summary.offline],
    ["no-gps", summary["no-gps"]],
    ["disconnected", summary.disconnected],
  ];

  document.getElementById("statusShowcase").innerHTML = statuses
    .map(
      ([status, value]) => `
        <div class="status-showcase-card ${getStatusTone(status)}">
          <span>${formatStatus(status)}</span>
          <strong>${value || 0}</strong>
        </div>
      `,
    )
    .join("");
}

function renderPriorityVehicles(vehicles) {
  const selectedVehicle = getSelectedVehicle();
  const priority = [...vehicles]
    .map((vehicle) => ({
      ...vehicle,
      priorityScore:
        (["breakdown", "offline", "no-gps", "disconnected"].includes(vehicle.status) ? 4 : 0) +
        ((vehicle.fuel || 0) <= 35 ? 2 : 0) +
        ((vehicle.adblue || 0) <= 30 ? 2 : 0) +
        (vehicle.status === "stopped" || vehicle.status === "parked" ? 1 : 0),
    }))
    .filter((vehicle) => selectedVehicle || vehicle.priorityScore > 0)
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, selectedVehicle ? 1 : 6);

  document.getElementById("priorityTitle").textContent = selectedVehicle ? "Selected Vehicle Alerts" : "Priority Vehicles";
  document.getElementById("prioritySubtitle").textContent = selectedVehicle
    ? "Status, fuel, and AdBlue attention for the selected vehicle."
    : "Units needing immediate operational attention.";

  document.getElementById("priorityVehicles").innerHTML = priority.length
    ? priority
        .map(
          (vehicle) => `
            <div class="table-row">
              <div>
                <strong>${vehicle.vehicle_no}</strong>
                <div class="small">${vehicle.driver} | ${vehicle.type}</div>
                <div class="small">AdBlue ${vehicle.adblue}% | Speed ${vehicle.speed || 0} km/h</div>
              </div>
              <div class="table-row-side">
                <span class="status-pill ${getStatusTone(vehicle.status)}">${formatStatus(vehicle.status)}</span>
                <span class="small">Fuel ${vehicle.fuel}%</span>
                <span class="small">${(vehicle.fuel || 0) <= 35 ? "Low Fuel" : "Fuel OK"} | ${(vehicle.adblue || 0) <= 30 ? "Low AdBlue" : "AdBlue OK"}</span>
              </div>
            </div>
          `,
        )
        .join("")
    : '<div class="empty-state">No critical or low-consumable vehicles at the moment.</div>';
}

function renderAccountSnapshot(billing) {
  const selectedVehicle = getSelectedVehicle();
  document.getElementById("accountSnapshot").innerHTML = `
    <div class="metric-row"><span>Logged in user</span><strong>${currentUser.name}</strong></div>
    <div class="metric-row"><span>Role</span><strong>${currentUser.role}</strong></div>
    <div class="metric-row"><span>Dashboard scope</span><strong>${selectedVehicle ? selectedVehicle.vehicle_no : "All vehicles"}</strong></div>
    <div class="metric-row"><span>Billing status</span><strong>${billing.status}</strong></div>
    <div class="metric-row"><span>Expiry</span><strong>${billing.user.expiry}</strong></div>
  `;
}

function renderDashboardScope() {
  const scopedVehicles = getScopedVehicles();
  const summary = summarizeVehicles(scopedVehicles);
  const selectedVehicle = scopedVehicles.length === 1 ? scopedVehicles[0] : null;
  const parkedStopped = (summary.parked || 0) + (summary.stopped || 0);
  const critical = (summary.breakdown || 0) + (summary.offline || 0) + (summary["no-gps"] || 0) + (summary.disconnected || 0);
  const averageSpeed = summary.total ? Math.round(summary.averageSpeedTotal / summary.total) : 0;

  document.getElementById("dashboardFilterNote").textContent = selectedVehicle
    ? selectedVehicle.vehicle_no + " selected. Dashboard cards and charts now reflect this vehicle."
    : "Fleet-wide dashboard view is active.";
  document.getElementById("heroMetricOneLabel").textContent = selectedVehicle ? "Vehicle Health" : "Fleet Health";
  document.getElementById("heroMetricTwoLabel").textContent = selectedVehicle ? "Fuel / AdBlue" : "Average Speed";
  document.getElementById("heroMetricThreeLabel").textContent = selectedVehicle ? "Last Sync" : "Last Sync";
  document.getElementById("heroFleetHealth").textContent = getHealthLabel(summary, selectedVehicle);
  document.getElementById("heroAverageSpeed").textContent = selectedVehicle
    ? (selectedVehicle.fuel || 0) + "% / " + (selectedVehicle.adblue || 0) + "%"
    : averageSpeed + " km/h";
  document.getElementById("heroLastSync").textContent = summary.lastUpdate
    ? new Date(summary.lastUpdate).toLocaleTimeString()
    : "Waiting...";

  document.getElementById("totalVehicles").textContent = summary.total || 0;
  document.getElementById("movingVehicles").textContent = summary.moving || 0;
  document.getElementById("parkedStoppedVehicles").textContent = parkedStopped;
  document.getElementById("criticalVehicles").textContent = critical + summary.lowFuel + summary.lowAdblue;

  analyticsModel = buildAnalyticsModel(
    {
      ...summary,
      averageSpeed,
    },
    scopedVehicles,
  );
  renderAnalyticsTab(activeAnalyticsTab);
  renderStatusShowcase(summary);
  renderPriorityVehicles(scopedVehicles);
  renderAccountSnapshot(dashboardState.billing);
}

function bindVehicleFilter() {
  document.getElementById("dashboardVehicleFilter").addEventListener("change", (event) => {
    dashboardState.selectedVehicleId = event.target.value;
    renderDashboardScope();
  });
}

async function loadOverview() {
  const [, vehicles, billing] = await Promise.all([
    fetchJson("/summary"),
    fetchJson("/vehicles"),
    fetchJson("/billing?userId=" + currentUser.id),
  ]);
  dashboardState.vehicles = vehicles;
  dashboardState.billing = billing;
  populateVehicleFilter(vehicles);
  renderDashboardScope();
}

bindAnalyticsTabs();
bindVehicleFilter();
loadOverview();
