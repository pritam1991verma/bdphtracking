import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

const markerIcon = L.divIcon({
  className: "vehicle-marker",
  html: `<div class="vehicle-marker-core"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function getMapCenter(vehicles) {
  const valid = vehicles.filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
  if (!valid.length) {
    return [22.57, 88.36];
  }
  return [valid[0].lat, valid[0].lng];
}

export function VehicleMap({ vehicles }) {
  const center = getMapCenter(vehicles);

  return (
    <section className="panel map-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Map View</p>
          <h2>Live vehicle footprint</h2>
        </div>
      </div>

      <div className="map-shell">
        <MapContainer center={center} zoom={8} scrollWheelZoom className="map-canvas">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {vehicles
            .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
            .map((vehicle) => (
              <Marker key={vehicle.id} position={[vehicle.lat, vehicle.lng]} icon={markerIcon}>
                <Popup autoPan={false}>
                  <strong>{vehicle.number}</strong>
                  <div>Status: {vehicle.status}</div>
                  <div>Voltage: {vehicle.externalVoltage ?? "--"} V</div>
                  <div>Ignition: {vehicle.ignition ? "ON" : "OFF"}</div>
                  <div>Driver: {vehicle.driverName || "Unassigned"}</div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </section>
  );
}
