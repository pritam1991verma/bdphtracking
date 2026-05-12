const { pool } = require("../config/db");

async function createBatteryLog(vehicleId, voltage, timestamp) {
  const query = `
    INSERT INTO battery_logs (vehicle_id, voltage, timestamp)
    VALUES ($1, $2, $3)
    RETURNING id, vehicle_id AS "vehicleId", voltage, timestamp
  `;
  const { rows } = await pool.query(query, [vehicleId, voltage, timestamp]);
  return rows[0];
}

module.exports = { createBatteryLog };
