export function AlertList({ alerts, onResolve }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Live Alerts</p>
          <h2>Battery security queue</h2>
        </div>
      </div>

      <div className="alert-list">
        {alerts.length === 0 ? (
          <div className="empty-state">No alerts yet. Incoming device anomalies will appear here.</div>
        ) : null}

        {alerts.map((alert) => (
          <article key={alert.id} className={`alert-card ${alert.status === "OPEN" ? "open" : "resolved"}`}>
            <div className="alert-row">
              <div>
                <p className="alert-type">{alert.type.replaceAll("_", " ")}</p>
                <h3>{alert.vehicleNumber}</h3>
                <p className="alert-meta">
                  Driver: {alert.driverName || "Unassigned"} {alert.driverPhone ? `| ${alert.driverPhone}` : ""}
                </p>
              </div>
              <span className={`status-pill ${alert.status === "OPEN" ? "danger" : "neutral"}`}>
                {alert.status}
              </span>
            </div>

            <p className="alert-message">{alert.meta?.message || "Alert received from telemetry rule engine."}</p>

            <div className="alert-row alert-footer">
              <span>{new Date(alert.createdAt).toLocaleString()}</span>
              {alert.status === "OPEN" ? (
                <button className="primary-button small" onClick={() => onResolve(alert.id)}>
                  Resolve
                </button>
              ) : (
                <span className="resolved-at">
                  Resolved {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString() : ""}
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
