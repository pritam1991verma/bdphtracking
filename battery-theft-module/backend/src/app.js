const express = require("express");
const cors = require("cors");
const { env } = require("./config/env");
const { gpsRouter } = require("./routes/gps");
const { alertsRouter } = require("./routes/alerts");

const app = express();

app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "battery-theft-backend" });
});

app.use(gpsRouter);
app.use(alertsRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(400).json({
    ok: false,
    message: error.message || "Unexpected error",
  });
});

module.exports = { app };
