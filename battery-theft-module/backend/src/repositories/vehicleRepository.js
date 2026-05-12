const { pool } = require("../config/db");

async function upsertVehicleTelemetry(payload) {
  const query = `
    INSERT INTO vehicles (
      id,
      number,
      driver_id,
      external_voltage,
      ignition,
      last_known_lat,
      last_known_lng,
      last_seen_at,
      status
    )
    VALUES (
      $1, COALESCE($2, $1), $3, $4, $5, $6, $7, $8, $9
    )
    ON CONFLICT (id) DO UPDATE
    SET
      number = COALESCE(EXCLUDED.number, vehicles.number),
      driver_id = COALESCE(EXCLUDED.driver_id, vehicles.driver_id),
      external_voltage = EXCLUDED.external_voltage,
      ignition = EXCLUDED.ignition,
      last_known_lat = EXCLUDED.last_known_lat,
      last_known_lng = EXCLUDED.last_known_lng,
      last_seen_at = EXCLUDED.last_seen_at,
      status = EXCLUDED.status
    RETURNING id, number, driver_id, external_voltage, ignition, last_known_lat, last_known_lng, last_seen_at, status
  `;

  const values = [
    payload.vehicleId,
    payload.vehicleNumber || null,
    payload.driverId || null,
    payload.externalVoltage,
    payload.ignition,
    payload.lat,
    payload.lng,
    payload.timestamp,
    payload.status,
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function findVehicleWithDriver(vehicleId) {
  const query = `
    SELECT
      v.id,
      v.number,
      v.driver_id AS "driverId",
      v.external_voltage AS "externalVoltage",
      v.ignition,
      v.last_known_lat AS lat,
      v.last_known_lng AS lng,
      v.last_seen_at AS "lastSeenAt",
      v.status,
      d.name AS "driverName",
      d.phone AS "driverPhone"
    FROM vehicles v
    LEFT JOIN drivers d ON d.id = v.driver_id
    WHERE v.id = $1
  `;
  const { rows } = await pool.query(query, [vehicleId]);
  return rows[0] || null;
}

async function listVehiclesWithDriver() {
  const query = `
    SELECT
      v.id,
      v.number,
      v.external_voltage AS "externalVoltage",
      v.ignition,
      v.last_known_lat AS lat,
      v.last_known_lng AS lng,
      v.last_seen_at AS "lastSeenAt",
      v.status,
      d.id AS "driverId",
      d.name AS "driverName",
      d.phone AS "driverPhone"
    FROM vehicles v
    LEFT JOIN drivers d ON d.id = v.driver_id
    ORDER BY v.number ASC
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function listOfflineCandidates(minutes) {
  const query = `
    SELECT
      v.id,
      v.number,
      v.last_known_lat AS lat,
      v.last_known_lng AS lng,
      v.last_seen_at AS "lastSeenAt",
      d.name AS "driverName",
      d.phone AS "driverPhone"
    FROM vehicles v
    LEFT JOIN drivers d ON d.id = v.driver_id
    WHERE v.last_seen_at IS NOT NULL
      AND v.last_seen_at < NOW() - ($1::text || ' minutes')::interval
  `;
  const { rows } = await pool.query(query, [String(minutes)]);
  return rows;
}

async function updateVehicleStatus(vehicleId, status) {
  const query = `
    UPDATE vehicles
    SET status = $2
    WHERE id = $1
    RETURNING id, number, status
  `;
  const { rows } = await pool.query(query, [vehicleId, status]);
  return rows[0] || null;
}

module.exports = {
  upsertVehicleTelemetry,
  findVehicleWithDriver,
  listVehiclesWithDriver,
  listOfflineCandidates,
  updateVehicleStatus,
};
