const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4200";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || "Request failed");
  }
  return payload;
}

export async function fetchAlerts() {
  const payload = await request("/alerts");
  return payload.alerts;
}

export async function fetchVehicles() {
  const payload = await request("/vehicles");
  return payload.vehicles;
}

export async function resolveAlert(alertId) {
  const payload = await request(`/alerts/${alertId}/resolve`, {
    method: "POST",
  });
  return payload.alert;
}

export { API_BASE_URL };
