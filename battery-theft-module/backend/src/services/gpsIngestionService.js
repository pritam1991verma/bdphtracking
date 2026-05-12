const { createBatteryLog } = require("../repositories/batteryLogRepository");
const {
  upsertVehicleTelemetry,
  findVehicleWithDriver,
  listVehiclesWithDriver,
} = require("../repositories/vehicleRepository");
const { evaluateVoltageAlerts } = require("./alertEngine");
const { broadcastAlert } = require("../sockets/alertSocket");

function normalizePayload(payload) {
  return {
    vehicleId: String(payload.vehicleId || "").trim(),
    vehicleNumber: payload.vehicleNumber ? String(payload.vehicleNumber).trim() : null,
    driverId: payload.driverId ? Number(payload.driverId) : null,
    externalVoltage: Number(payload.externalVoltage),
    ignition: String(payload.ignition).toUpperCase() === "ON" || payload.ignition === true,
    timestamp: payload.timestamp ? new Date(payload.timestamp).toISOString() : new Date().toISOString(),
    lat: Number(payload.lat),
    lng: Number(payload.lng),
    status: "NORMAL",
  };
}

function validatePayload(payload) {
  if (!payload.vehicleId) {
    throw new Error("vehicleId is required");
  }
  if (!Number.isFinite(payload.externalVoltage)) {
    throw new Error("externalVoltage must be a valid number");
  }
  if (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) {
    throw new Error("lat and lng must be valid numbers");
  }
}

async function ingestGpsData(input) {
  const payload = normalizePayload(input);
  validatePayload(payload);

  await upsertVehicleTelemetry(payload);
  await createBatteryLog(payload.vehicleId, payload.externalVoltage, payload.timestamp);

  const vehicle = await findVehicleWithDriver(payload.vehicleId);
  if (!vehicle) {
    throw new Error("Vehicle telemetry saved but vehicle lookup failed");
  }

  await evaluateVoltageAlerts(vehicle);

  const liveVehicles = await listVehiclesWithDriver();
  broadcastAlert("vehicle.updated", liveVehicles);

  return vehicle;
}

module.exports = { ingestGpsData };
