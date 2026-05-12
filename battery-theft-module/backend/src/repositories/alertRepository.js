const { pool } = require("../config/db");

async function findOpenAlert(vehicleId, type) {
  const query = `
    SELECT *
    FROM alerts
    WHERE vehicle_id = $1
      AND type = $2
      AND status = 'OPEN'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [vehicleId, type]);
  return rows[0] || null;
}

async function createAlert({ vehicleId, type, location, meta }) {
  const query = `
    INSERT INTO alerts (vehicle_id, type, status, location, meta)
    VALUES ($1, $2, 'OPEN', $3::jsonb, $4::jsonb)
    RETURNING
      id,
      vehicle_id AS "vehicleId",
      type,
      status,
      created_at AS "createdAt",
      location,
      meta
  `;
  const { rows } = await pool.query(query, [
    vehicleId,
    type,
    JSON.stringify(location || {}),
    JSON.stringify(meta || {}),
  ]);
  return rows[0];
}

async function resolveAlert(id) {
  const query = `
    UPDATE alerts
    SET status = 'RESOLVED', resolved_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      vehicle_id AS "vehicleId",
      type,
      status,
      created_at AS "createdAt",
      resolved_at AS "resolvedAt",
      location,
      meta
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function listAlerts() {
  const query = `
    SELECT
      a.id,
      a.vehicle_id AS "vehicleId",
      v.number AS "vehicleNumber",
      a.type,
      a.status,
      a.created_at AS "createdAt",
      a.resolved_at AS "resolvedAt",
      a.location,
      a.meta,
      d.id AS "driverId",
      d.name AS "driverName",
      d.phone AS "driverPhone"
    FROM alerts a
    JOIN vehicles v ON v.id = a.vehicle_id
    LEFT JOIN drivers d ON d.id = v.driver_id
    ORDER BY
      CASE WHEN a.status = 'OPEN' THEN 0 ELSE 1 END,
      a.created_at DESC
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function hasOpenAlertsForVehicle(vehicleId) {
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM alerts
      WHERE vehicle_id = $1
        AND status = 'OPEN'
    ) AS "hasOpenAlerts"
  `;
  const { rows } = await pool.query(query, [vehicleId]);
  return Boolean(rows[0]?.hasOpenAlerts);
}

module.exports = {
  findOpenAlert,
  createAlert,
  resolveAlert,
  listAlerts,
  hasOpenAlertsForVehicle,
};
