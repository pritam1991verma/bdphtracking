function getCurrentUser() {
  const raw = localStorage.getItem("bdph-current-user");
  if (!raw) {
    return null;
  }

  const user = JSON.parse(raw);
  if (user?.role === "Admin") {
    user.access = getDefaultAccess();
  } else if (Array.isArray(user?.access) && !user.access.includes("battery") && user.access.includes("fuel")) {
    user.access = [...user.access, "battery"];
  }

  return user;
}

function setCurrentUser(user) {
  localStorage.setItem("bdph-current-user", JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem("bdph-current-user");
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "/login.html";
    throw new Error("Authentication required");
  }
  return user;
}

const PAGE_META = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard.html" },
  { key: "live-tracker", label: "Live Tracker", href: "/live-monitor.html" },
  { key: "reports", label: "Reports", href: "/reports.html" },
  { key: "fuel", label: "Fuel", href: "/fuel.html" },
  { key: "adblue", label: "AdBlue", href: "/adblue.html" },
  { key: "battery", label: "Battery", href: "/battery.html" },
  { key: "tyres", label: "Tyres", href: "/tyres.html" },
  { key: "inventory", label: "Inventory", href: "/inventory.html" },
  { key: "billing", label: "Billing", href: "/billing.html" },
  { key: "vehicles", label: "Vehicles", href: "/vehicles.html" },
  { key: "users", label: "Users", href: "/users.html" },
  { key: "access-level", label: "Access Level", href: "/access-level.html" },
];

function getDefaultAccess() {
  return PAGE_META.map((page) => page.key);
}

function hasPageAccess(user, pageKey) {
  const access = Array.isArray(user?.access) && user.access.length ? user.access : getDefaultAccess();
  if (pageKey === "tyres" && access.includes("vehicles")) {
    return true;
  }
  if (pageKey === "inventory" && (access.includes("tyres") || access.includes("vehicles"))) {
    return true;
  }
  return access.includes(pageKey);
}

function getFirstAllowedPage(user) {
  const page = PAGE_META.find((item) => hasPageAccess(user, item.key));
  return page ? page.href : "/dashboard.html";
}

function requirePageAccess(pageKey) {
  const user = requireAuth();
  if (!hasPageAccess(user, pageKey)) {
    window.location.href = getFirstAllowedPage(user);
    throw new Error("Access denied");
  }
  return user;
}

function renderTopbar(activePage) {
  const user = requirePageAccess(activePage);
  const nav = document.getElementById("topbarMount");

  if (!nav) {
    return user;
  }

  const links = PAGE_META.filter((page) => hasPageAccess(user, page.key))
    .map((page) => {
      const target = page.key === "live-tracker" ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a class="nav-link ${activePage === page.key ? "active" : ""}" href="${page.href}"${target}>${page.label}</a>`;
    })
    .join("");

  nav.innerHTML = `
    <section class="topbar">
      <div class="title">
        <h1>BDPH Tracking</h1>
        <p>Premium fleet monitoring, live tracking, and operations control.</p>
      </div>
      <div class="nav-links">
        ${links}
        <a class="nav-link" href="#" id="logoutLink">Logout (${user.username})</a>
      </div>
    </section>
  `;

  document.getElementById("logoutLink").addEventListener("click", (event) => {
    event.preventDefault();
    clearCurrentUser();
    window.location.href = "/login.html";
  });

  return user;
}

function showMessage(id, text, kind) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  element.textContent = text || "";
  element.className = "message" + (kind ? " " + kind : "");
}

function showToast(text, kind) {
  let root = document.getElementById("toastRoot");
  if (!root) {
    root = document.createElement("div");
    root.id = "toastRoot";
    root.className = "toast-root";
    document.body.appendChild(root);
  }

  const toast = document.createElement("div");
  toast.className = "toast toast-" + (kind || "info");
  toast.textContent = text;
  root.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 260);
  }, 2400);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch (_error) {
    if (!response.ok) {
      throw new Error("Request failed: " + response.status + " " + response.statusText);
    }
    throw new Error("Server returned non-JSON response for " + url);
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : "-";
}

function formatStatus(status) {
  return String(status || "")
    .split("-")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ""))
    .join(" ");
}

function getStatusTone(status) {
  const tones = {
    moving: "moving",
    idle: "idle",
    parked: "parked",
    stopped: "stopped",
    breakdown: "breakdown",
    offline: "offline",
    "no-gps": "no-gps",
    disconnected: "disconnected",
  };

  return tones[status] || "stopped";
}
