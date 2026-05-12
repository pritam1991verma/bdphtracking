const express = require("express");
const { ingestGpsData } = require("../services/gpsIngestionService");

const router = express.Router();

router.post("/gps-data", async (req, res, next) => {
  try {
    const vehicle = await ingestGpsData(req.body);
    res.status(201).json({
      ok: true,
      message: "GPS payload processed successfully",
      vehicle,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = { gpsRouter: router };
