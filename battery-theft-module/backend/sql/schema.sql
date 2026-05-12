CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(64) PRIMARY KEY,
  number VARCHAR(30) NOT NULL UNIQUE,
  driver_id INTEGER REFERENCES drivers(id),
  external_voltage NUMERIC(6,2),
  ignition BOOLEAN DEFAULT FALSE,
  last_known_lat NUMERIC(10,6),
  last_known_lng NUMERIC(10,6),
  last_seen_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'NORMAL'
);

CREATE TABLE IF NOT EXISTS battery_logs (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id VARCHAR(64) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  voltage NUMERIC(6,2) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id VARCHAR(64) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  location JSONB NOT NULL DEFAULT '{}'::jsonb,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_alerts_vehicle_status ON alerts(vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_battery_logs_vehicle_time ON battery_logs(vehicle_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_last_seen ON vehicles(last_seen_at DESC);
