export function StatusSummary({ vehicles, alerts }) {
  const openAlerts = alerts.filter((item) => item.status === "OPEN").length;
  const healthyVehicles = vehicles.filter((item) => item.status === "NORMAL").length;
  const alertVehicles = vehicles.filter((item) => item.status === "ALERT").length;

  const cards = [
    { label: "Fleet Coverage", value: vehicles.length, tone: "blue" },
    { label: "Open Alerts", value: openAlerts, tone: "red" },
    { label: "Normal Vehicles", value: healthyVehicles, tone: "green" },
    { label: "Alert Vehicles", value: alertVehicles, tone: "amber" },
  ];

  return (
    <section className="summary-grid">
      {cards.map((card) => (
        <article key={card.label} className={`summary-card ${card.tone}`}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}
