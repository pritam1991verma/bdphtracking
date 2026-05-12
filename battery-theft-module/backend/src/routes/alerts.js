const express = require("express");
const { listAlerts, resolveAlert, hasOpenAlertsForVehicle } = require("../repositories/alertRepository");
const { listVehiclesWithDriver, updateVehicleStatus } = require("../repositories/vehicleRepository");
const { broadcastAlert } = require("../sockets/alertSocket");

const router = express.Router();

router.get("/alerts", async (_req, res, next) => {
  try {
    const alerts = await listAlerts();
    res.json({ ok: true, alerts });
  } catch (error) {
    next(error);
  }
});

router.get("/vehicles", async (_req, res, next) => {
  try {
    const vehicles = await listVehiclesWithDriver();
    res.json({ ok: true, vehicles });
  } catch (error) {
    next(error);
  }
});

router.post("/alerts/:id/resolve", async (req, res, next) => {
  try {
    const alert = await resolveAlert(req.params.id);
    if (!alert) {
      return res.status(404).json({ ok: false, message: "Alert not found" });
    }

    const stillOpen = await hasOpenAlertsForVehicle(alert.vehicleId);
    await updateVehicleStatus(alert.vehicleId, stillOpen ? "ALERT" : "NORMAL");
    broadcastAlert("alert.resolved", alert);

    res.json({
      ok: true,
      message: "Alert resolved",
      alert,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = { alertsRouter: router };
