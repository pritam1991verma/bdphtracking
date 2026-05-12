const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const env = {
  port: Number(process.env.PORT || 4200),
  tcpPort: Number(process.env.TCP_PORT || 5001),
  databaseUrl: process.env.DATABASE_URL,
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  offlineThresholdMinutes: Number(process.env.OFFLINE_THRESHOLD_MINUTES || 5),
  lowVoltageThreshold: Number(process.env.LOW_VOLTAGE_THRESHOLD || 11),
};

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

module.exports = { env };
