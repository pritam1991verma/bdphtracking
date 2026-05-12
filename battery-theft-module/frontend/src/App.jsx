import { useEffect, useMemo, useState } from "react";
import { fetchAlerts, fetchVehicles, resolveAlert } from "./api";
import { socket } from "./socket";
import { AlertList } from "./components/AlertList";
import { StatusSummary } from "./components/StatusSummary";
import { VehicleMap } from "./components/VehicleMap";

export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [alertsData, vehiclesData] = await Promise.all([fetchAlerts(), fetchVehicles()]);
        setAlerts(alertsData);
        setVehicles(vehiclesData);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    function handleCreated(alert) {
      setAlerts((current) => [alert, ...current]);
    }

    function handleResolved(resolvedAlert) {
      setAlerts((current) =>
        current.map((item) => (item.id === resolvedAlert.id ? { ...item, ...resolvedAlert } : item)),
      );
    }

    function handleVehicles(updatedVehicles) {
      setVehicles(updatedVehicles);
    }

    socket.on("alert.created", handleCreated);
    socket.on("alert.resolved", handleResolved);
    socket.on("vehicle.updated", handleVehicles);

    return () => {
      socket.off("alert.created", handleCreated);
      socket.off("alert.resolved", handleResolved);
      socket.off("vehicle.updated", handleVehicles);
    };
  }, []);

  async function handleResolve(alertId) {
    try {
      const resolved = await resolveAlert(alertId);
      setAlerts((current) => current.map((item) => (item.id === resolved.id ? { ...item, ...resolved } : item)));
    } catch (resolveError) {
      setError(resolveError.message);
    }
  }

  const sortedAlerts = useMemo(
    () =>
      [...alerts].sort((first, second) => {
        if (first.status !== second.status) {
          return first.status === "OPEN" ? -1 : 1;
        }
        return new Date(second.createdAt) - new Date(first.createdAt);
      }),
    [alerts],
  );

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Battery Theft Prevention</p>
          <h1>Live power integrity monitoring for connected fleets.</h1>
          <p className="hero-copy">
            Detect battery disconnects, low voltage, and silent device drop-offs in one realtime control room.
          </p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <div className="loading-banner">Loading battery security dashboard...</div> : null}

      <StatusSummary vehicles={vehicles} alerts={sortedAlerts} />

      <section className="dashboard-grid">
        <VehicleMap vehicles={vehicles} />
        <AlertList alerts={sortedAlerts} onResolve={handleResolve} />
      </section>
    </main>
  );
}
