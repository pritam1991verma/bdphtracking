const { env } = require("../config/env");
const { listOfflineCandidates } = require("../repositories/vehicleRepository");
const { evaluateOfflineAlerts } = require("./alertEngine");

function startOfflineWatcher() {
  const intervalMs = 60 * 1000;

  const run = async () => {
    try {
      const vehicles = await listOfflineCandidates(env.offlineThresholdMinutes);
      if (vehicles.length) {
        await evaluateOfflineAlerts(vehicles);
      }
    } catch (error) {
      console.error("Offline watcher error:", error);
    }
  };

  run();
  return setInterval(run, intervalMs);
}

module.exports = { startOfflineWatcher };
