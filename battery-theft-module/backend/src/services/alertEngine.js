const { ALERT_TYPES } = require("../constants/alertTypes");
const { env } = require("../config/env");
const { createAlert, findOpenAlert } = require("../repositories/alertRepository");
const { updateVehicleStatus } = require("../repositories/vehicleRepository");
const { broadcastAlert } = require("../sockets/alertSocket");

async function openAlertIfNeeded({ vehicle, type, location, meta }) {
  const existing = await findOpenAlert(vehicle.id, type);
  if (existing) {
    return existing;
  }

  const created = await createAlert({
    vehicleId: vehicle.id,
    type,
    location,
    meta: {
      vehicleNumber: vehicle.number,
      driverName: vehicle.driverName || null,
      driverPhone: vehicle.driverPhone || null,
      ...meta,
    },
  });

  await updateVehicleStatus(vehicle.id, "ALERT");

  const payload = {
    ...created,
    vehicleNumber: vehicle.number,
    driverId: vehicle.driverId || null,
    driverName: vehicle.driverName || null,
    driverPhone: vehicle.driverPhone || null,
  };

  broadcastAlert("alert.created", payload);
  return payload;
}

async function evaluateVoltageAlerts(vehicle) {
  const location = {
    lat: vehicle.lat,
    lng: vehicle.lng,
    timestamp: vehicle.lastSeenAt,
  };

  if (Number(vehicle.externalVoltage) === 0 && vehicle.ignition === false) {
    await openAlertIfNeeded({
      vehicle,
      type: ALERT_TYPES.BATTERY_DISCONNECTED,
      location,
      meta: {
        message: "External battery supply is disconnected while ignition is off.",
        measuredVoltage: Number(vehicle.externalVoltage),
      },
    });
    return;
  }

  if (Number(vehicle.externalVoltage) < env.lowVoltageThreshold) {
    await openAlertIfNeeded({
      vehicle,
      type: ALERT_TYPES.LOW_VOLTAGE,
      location,
      meta: {
        message: `Vehicle voltage dropped below ${env.lowVoltageThreshold}V.`,
        measuredVoltage: Number(vehicle.externalVoltage),
      },
    });
  }
}

async function evaluateOfflineAlerts(vehicles) {
  for (const vehicle of vehicles) {
    await openAlertIfNeeded({
      vehicle,
      type: ALERT_TYPES.DEVICE_OFFLINE,
      location: {
        lat: vehicle.lat,
        lng: vehicle.lng,
        timestamp: vehicle.lastSeenAt,
      },
      meta: {
        message: `Device has been offline for more than ${env.offlineThresholdMinutes} minutes.`,
      },
    });
  }
}

module.exports = {
  evaluateVoltageAlerts,
  evaluateOfflineAlerts,
};
