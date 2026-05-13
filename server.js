const mongoose = require("mongoose");
const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
mongoose.connect("mongodb+srv://pritambgr22_db_user:qv94gW2uuZcfdLpo@bdphtracking.bjyckah.mongodb.net/bdphtracking?retryWrites=true&w=majority")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json({ limit: "15mb" }));
app.use(express.static("public"));

const ACCESS_PAGES = [
  "dashboard",
  "live-tracker",
  "reports",
  "fuel",
  "adblue",
  "battery",
  "tyres",
  "inventory",
  "billing",
  "vehicles",
  "users",
  "access-level",
];
const STATUSES = ["moving", "idle", "parked", "stopped", "breakdown", "offline", "no-gps", "disconnected"];
const TYRE_CATALOG = ["MRF Milestar BS626", "Apollo EnduRace", "JK Jetsteel", "CEAT Winmile", "Bridgestone Duravis"];
const BATTERY_ALERT_TYPES = {
  DISCONNECTED: "BATTERY_DISCONNECTED",
  LOW_VOLTAGE: "LOW_VOLTAGE",
  OFFLINE: "DEVICE_OFFLINE",
};
const BATTERY_OFFLINE_MS = 5 * 60 * 1000;

let nextUserId = 3;
let nextVehicleId = 5;
let nextBreakdownReportId = 1;
let nextBatteryAlertId = 1;
let nextTyreInventoryId = 1;
let nextPunctureRequestId = 1;
let nextTripBillingId = 1;
let nextInventoryRecordId = 1;
let nextInventoryInwardId = 1;
const DATA_DIR = path.join(__dirname, "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const users = [
  {
    id: 1,
    name: "Administrator",
    username: "admin",
    password: "1234",
    role: "Admin",
    expiry: "2099-01-01",
    access: [...ACCESS_PAGES],
  },
  {
    id: 2,
    name: "Fleet Operator",
    username: "operator",
    password: "1234",
    role: "Operator",
    expiry: "2099-01-01",
    access: ["dashboard", "live-tracker", "reports", "fuel", "adblue", "battery"],
  },
];

const vehicleSeeds = [
  {
    id: 1,
    vehicle_no: "JH05AB1234",
    label: "BDPH-01",
    driver: "Rakesh Kumar",
    driverPhone: "8709479313",
    type: "School Bus",
    imei: "352094081234561",
    lat: 22.8042,
    lng: 86.2024,
    speed: 38,
    heading: 42,
    fuel: 74,
    ignition: true,
    status: "moving",
    adblue: 68,
    externalVoltage: 12.7,
    gps: true,
    network: true,
    lastFuelFillLiters: 38,
    lastFuelFillAt: "2026-04-15T08:20:00.000Z",
    lastAdblueFillLiters: 11,
    lastAdblueFillAt: "2026-04-14T09:40:00.000Z",
  },
  {
    id: 2,
    vehicle_no: "JH05CD5678",
    label: "BDPH-02",
    driver: "Anita Singh",
    driverPhone: "8637330747",
    type: "Mini Bus",
    imei: "352094081234578",
    lat: 22.847,
    lng: 86.2521,
    speed: 0,
    heading: 180,
    fuel: 49,
    ignition: false,
    status: "parked",
    adblue: 54,
    externalVoltage: 12.1,
    gps: true,
    network: true,
    lastFuelFillLiters: 26,
    lastFuelFillAt: "2026-04-15T05:10:00.000Z",
    lastAdblueFillLiters: 8,
    lastAdblueFillAt: "2026-04-13T11:15:00.000Z",
  },
  {
    id: 3,
    vehicle_no: "JH05EF9012",
    label: "BDPH-03",
    driver: "Sanjay Prasad",
    driverPhone: "9523940812",
    type: "Van",
    imei: "352094081234589",
    lat: 22.8275,
    lng: 86.2288,
    speed: 27,
    heading: 315,
    fuel: 62,
    ignition: true,
    status: "breakdown",
    adblue: 47,
    externalVoltage: 10.6,
    gps: true,
    network: true,
    lastFuelFillLiters: 33,
    lastFuelFillAt: "2026-04-14T13:30:00.000Z",
    lastAdblueFillLiters: 10,
    lastAdblueFillAt: "2026-04-12T14:05:00.000Z",
  },
  {
    id: 4,
    vehicle_no: "JH05GH3456",
    label: "BDPH-04",
    driver: "Puja Das",
    driverPhone: "9431128045",
    type: "Staff Bus",
    imei: "352094081234590",
    lat: 22.8198,
    lng: 86.2745,
    speed: 18,
    heading: 112,
    fuel: 31,
    ignition: true,
    status: "offline",
    adblue: 22,
    externalVoltage: 0,
    gps: false,
    network: false,
    lastFuelFillLiters: 24,
    lastFuelFillAt: "2026-04-13T10:55:00.000Z",
    lastAdblueFillLiters: 6,
    lastAdblueFillAt: "2026-04-11T16:30:00.000Z",
  },
];

const defaultIconRegistry = {
  "school bus": null,
  "mini bus": null,
  "staff bus": null,
  van: null,
  bus: null,
  car: null,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ensureDataStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function normalizeVehicleType(type) {
  return String(type || "").trim().toLowerCase();
}

const AXLE_PRESETS = {
  "4x2": {
    label: "4 Tyres | Bolero / Scorpio / Pickup",
    family: "light",
    layout: [
      { axle: "Front Axle", position: "Left Front (LF)", slot: "front-left" },
      { axle: "Front Axle", position: "Right Front (RF)", slot: "front-right" },
      { axle: "Rear Axle", position: "Left Rear (LR)", slot: "rear-left" },
      { axle: "Rear Axle", position: "Right Rear (RR)", slot: "rear-right" },
    ],
  },
  "6x4": {
    label: "10 Tyres | 6x4 Heavy Vehicle",
    family: "heavy",
    layout: [
      { axle: "Front Axle", position: "Left Front (LF)", slot: "front-left" },
      { axle: "Front Axle", position: "Right Front (RF)", slot: "front-right" },
      { axle: "Axle 2", position: "Left Inner 1", slot: "axle2-left-inner" },
      { axle: "Axle 2", position: "Left Outer 1", slot: "axle2-left-outer" },
      { axle: "Axle 2", position: "Right Inner 1", slot: "axle2-right-inner" },
      { axle: "Axle 2", position: "Right Outer 1", slot: "axle2-right-outer" },
      { axle: "Axle 3", position: "Left Inner 2", slot: "axle3-left-inner" },
      { axle: "Axle 3", position: "Left Outer 2", slot: "axle3-left-outer" },
      { axle: "Axle 3", position: "Right Inner 2", slot: "axle3-right-inner" },
      { axle: "Axle 3", position: "Right Outer 2", slot: "axle3-right-outer" },
    ],
  },
  "12-tyre": {
    label: "12 Tyres | Multi Axle",
    family: "heavy",
    layout: [
      { axle: "Front Axle", position: "Left Front (LF)", slot: "front-left" },
      { axle: "Front Axle", position: "Right Front (RF)", slot: "front-right" },
      { axle: "Axle 2", position: "Left Inner 1", slot: "axle2-left-inner" },
      { axle: "Axle 2", position: "Left Outer 1", slot: "axle2-left-outer" },
      { axle: "Axle 2", position: "Right Inner 1", slot: "axle2-right-inner" },
      { axle: "Axle 2", position: "Right Outer 1", slot: "axle2-right-outer" },
      { axle: "Axle 3", position: "Left Inner 2", slot: "axle3-left-inner" },
      { axle: "Axle 3", position: "Left Outer 2", slot: "axle3-left-outer" },
      { axle: "Axle 3", position: "Right Inner 2", slot: "axle3-right-inner" },
      { axle: "Axle 3", position: "Right Outer 2", slot: "axle3-right-outer" },
      { axle: "Lift Axle", position: "Left Lift", slot: "lift-left" },
      { axle: "Lift Axle", position: "Right Lift", slot: "lift-right" },
    ],
  },
  "14-tyre": {
    label: "14 Tyres | Trailer",
    family: "heavy",
    layout: [],
  },
  "16-tyre": {
    label: "16 Tyres | Long Haul",
    family: "heavy",
    layout: [],
  },
  "18-tyre": {
    label: "18 Tyres | Heavy Duty",
    family: "heavy",
    layout: [],
  },
  "22-tyre": {
    label: "22 Tyres | Oversize Carrier",
    family: "heavy",
    layout: [],
  },
};

function createDualAxleSlots(axleIndex, label) {
  return [
    { axle: label, position: `Left Inner ${axleIndex}`, slot: `axle${axleIndex}-left-inner` },
    { axle: label, position: `Left Outer ${axleIndex}`, slot: `axle${axleIndex}-left-outer` },
    { axle: label, position: `Right Inner ${axleIndex}`, slot: `axle${axleIndex}-right-inner` },
    { axle: label, position: `Right Outer ${axleIndex}`, slot: `axle${axleIndex}-right-outer` },
  ];
}

AXLE_PRESETS["14-tyre"].layout = [
  { axle: "Front Axle", position: "Left Front (LF)", slot: "front-left" },
  { axle: "Front Axle", position: "Right Front (RF)", slot: "front-right" },
  ...createDualAxleSlots(2, "Axle 2"),
  ...createDualAxleSlots(3, "Axle 3"),
  ...createDualAxleSlots(4, "Axle 4"),
];
AXLE_PRESETS["16-tyre"].layout = [
  { axle: "Front Axle", position: "Left Front (LF)", slot: "front-left" },
  { axle: "Front Axle", position: "Right Front (RF)", slot: "front-right" },
  { axle: "Auxiliary Axle", position: "Left Auxiliary", slot: "lift-left" },
  { axle: "Auxiliary Axle", position: "Right Auxiliary", slot: "lift-right" },
  ...createDualAxleSlots(3, "Drive Axle 1"),
  ...createDualAxleSlots(4, "Drive Axle 2"),
  ...createDualAxleSlots(5, "Tag Axle"),
];
AXLE_PRESETS["18-tyre"].layout = [
  { axle: "Front Axle", position: "Left Front (LF)", slot: "front-left" },
  { axle: "Front Axle", position: "Right Front (RF)", slot: "front-right" },
  ...createDualAxleSlots(2, "Axle 2"),
  ...createDualAxleSlots(3, "Axle 3"),
  ...createDualAxleSlots(4, "Axle 4"),
  ...createDualAxleSlots(5, "Axle 5"),
];
AXLE_PRESETS["22-tyre"].layout = [
  { axle: "Front Axle", position: "Left Front (LF)", slot: "front-left" },
  { axle: "Front Axle", position: "Right Front (RF)", slot: "front-right" },
  ...createDualAxleSlots(2, "Axle 2"),
  ...createDualAxleSlots(3, "Axle 3"),
  ...createDualAxleSlots(4, "Axle 4"),
  ...createDualAxleSlots(5, "Axle 5"),
  ...createDualAxleSlots(6, "Axle 6"),
];

function getDefaultAxleConfiguration(type) {
  const normalized = normalizeVehicleType(type);
  if (normalized.includes("bolero") || normalized.includes("scorpio") || normalized.includes("pickup") || normalized.includes("jeep")) {
    return "4x2";
  }
  if (normalized.includes("van")) {
    return "4x2";
  }
  if (normalized.includes("bus") || normalized.includes("tipper") || normalized.includes("truck")) {
    return "6x4";
  }
  return "6x4";
}

function validAccess(access) {
  return ACCESS_PAGES.filter((page) => Array.isArray(access) && access.includes(page));
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    expiry: user.expiry,
    access: validAccess(user.access),
  };
}

function deriveStatus(vehicle) {
  if (!vehicle.network) {
    return "disconnected";
  }

  if (!vehicle.gps) {
    return "no-gps";
  }

  if (vehicle.status === "breakdown") {
    return "breakdown";
  }

  if (vehicle.status === "offline") {
    return "offline";
  }

  if (vehicle.speed > 8) {
    return "moving";
  }

  if (vehicle.ignition && vehicle.speed > 0) {
    return "idle";
  }

  if (!vehicle.ignition && vehicle.speed === 0) {
    return "parked";
  }

  return "stopped";
}

function createHistory(lat, lng) {
  return Array.from({ length: 18 }, (_, index) => ({
    lat: Number((lat - (18 - index) * 0.00045).toFixed(6)),
    lng: Number((lng - (18 - index) * 0.00032).toFixed(6)),
    timestamp: new Date(Date.now() - (18 - index) * 300000).toISOString(),
  }));
}

function toDeviceSnapshot(imei) {
  const digits = String(imei || "").replace(/\D/g, "");
  if (digits.length !== 15) {
    return null;
  }

  const last = Number(digits.slice(-1));
  const offset = Number(digits.slice(-4)) / 10000;
  const lat = Number((22.79 + (offset % 0.08)).toFixed(6));
  const lng = Number((86.18 + ((offset * 1.8) % 0.1)).toFixed(6));
  const speed = last % 4 === 0 ? 0 : 18 + (last % 5) * 9;
  const ignition = last % 3 !== 0;
  const gps = last % 7 !== 0;
  const network = last % 9 !== 0;
  const presetStatus = !network
    ? "disconnected"
    : !gps
      ? "no-gps"
      : speed > 12
        ? "moving"
        : ignition
          ? "stopped"
          : "parked";

  return {
    imei: digits,
    deviceType: "AIS 140",
    lat,
    lng,
    speed,
    ignition,
    heading: (Number(digits.slice(-3)) * 3) % 360,
    status: presetStatus,
    gps,
    network,
    fuel: 35 + (last % 6) * 8,
    adblue: 28 + (last % 5) * 9,
    externalVoltage: !network ? 0 : ignition ? 12.6 : 11.9,
  };
}

function getDefaultDriverPhone(vehicleId) {
  const phoneSeed = String(8700000000 + Number(vehicleId || 0) * 13791);
  return phoneSeed.slice(0, 10);
}

function getDefaultBatterySerial(vehicleId, vehicleNo) {
  const compactVehicleNo = String(vehicleNo || "BDPH")
    .replace(/[^A-Z0-9]/gi, "")
    .slice(-6)
    .toUpperCase();
  return `BAT-${compactVehicleNo || "UNIT"}-${String(vehicleId || 0).padStart(3, "0")}`;
}

function createVehicleRecord(vehicle) {
  const deviceData = vehicle.imei ? toDeviceSnapshot(vehicle.imei) : null;
  const lat = Number(vehicle.lat ?? deviceData?.lat ?? 22.82);
  const lng = Number(vehicle.lng ?? deviceData?.lng ?? 86.23);
  const speed = Number(vehicle.speed ?? deviceData?.speed ?? 0);
  const ignition = vehicle.ignition ?? deviceData?.ignition ?? false;
  const heading = Number(vehicle.heading ?? deviceData?.heading ?? 0);
  const gps = vehicle.gps ?? deviceData?.gps ?? true;
  const network = vehicle.network ?? deviceData?.network ?? true;
  const baseVehicle = {
    ...vehicle,
    imei: String(vehicle.imei || deviceData?.imei || "").trim(),
    driverPhone: String(vehicle.driverPhone || getDefaultDriverPhone(vehicle.id)).trim(),
    batterySerialNumber: String(
      vehicle.batterySerialNumber || getDefaultBatterySerial(vehicle.id, vehicle.vehicle_no),
    ).trim(),
    batteryAssetStatus: String(vehicle.batteryAssetStatus || "healthy").trim().toLowerCase(),
    device_type: "AIS 140",
    lat,
    lng,
    speed,
    ignition,
    heading,
    odometer: Number((vehicle.odometer ?? 18000 + vehicle.id * 2431).toFixed(1)),
    fuel: Number((vehicle.fuel ?? deviceData?.fuel ?? 50).toFixed(1)),
    adblue: Number((vehicle.adblue ?? deviceData?.adblue ?? 40).toFixed(1)),
    gps,
    network,
    last_seen: new Date().toISOString(),
    history: vehicle.history ?? createHistory(lat, lng),
    fuelReading: Number((vehicle.fuelReading ?? vehicle.fuel ?? deviceData?.fuel ?? 50).toFixed(1)),
    adblueReading: Number((vehicle.adblueReading ?? vehicle.adblue ?? deviceData?.adblue ?? 40).toFixed(1)),
    externalVoltage: Number((vehicle.externalVoltage ?? (network ? 12.4 : 0)).toFixed(1)),
    batterySignalAt:
      vehicle.batterySignalAt ??
      (network ? new Date().toISOString() : new Date(Date.now() - BATTERY_OFFLINE_MS - 60000).toISOString()),
    lastFuelFillLiters: vehicle.lastFuelFillLiters ?? 22,
    lastFuelFillAt: vehicle.lastFuelFillAt ?? new Date(Date.now() - 86400000).toISOString(),
    lastAdblueFillLiters: vehicle.lastAdblueFillLiters ?? 7,
    lastAdblueFillAt: vehicle.lastAdblueFillAt ?? new Date(Date.now() - 172800000).toISOString(),
    geofences: Array.isArray(vehicle.geofences) ? vehicle.geofences : [],
    assignedRoutes: Array.isArray(vehicle.assignedRoutes) ? vehicle.assignedRoutes : [],
    breakdownActive: Boolean(vehicle.breakdownActive ?? vehicle.status === "breakdown"),
    breakdownReason: vehicle.breakdownReason ?? "",
    breakdownAt: vehicle.breakdownAt ?? (vehicle.status === "breakdown" ? new Date().toISOString() : null),
    fixedAt: vehicle.fixedAt ?? null,
    fixedReason: vehicle.fixedReason ?? "",
    axleConfiguration: vehicle.axleConfiguration ?? getDefaultAxleConfiguration(vehicle.type),
    tyreRecords: Array.isArray(vehicle.tyreRecords) ? vehicle.tyreRecords : [],
    tyreActivity: Array.isArray(vehicle.tyreActivity) ? vehicle.tyreActivity : [],
    tyreInventory: Array.isArray(vehicle.tyreInventory) ? vehicle.tyreInventory : [],
    punctureRequests: Array.isArray(vehicle.punctureRequests) ? vehicle.punctureRequests : [],
    inventoryRecords: Array.isArray(vehicle.inventoryRecords) ? vehicle.inventoryRecords : [],
  };

  return {
    ...baseVehicle,
    status: vehicle.status ?? deviceData?.status ?? deriveStatus(baseVehicle),
  };
}

function buildSeedState() {
  const seededVehicles = vehicleSeeds.map(createVehicleRecord);
  let reportId = 1;
  const seededBreakdownReports = seededVehicles
  .filter((vehicle) => vehicle.breakdownActive)
  .map((vehicle) => ({
    id: reportId++,
    vehicleId: vehicle.id,
    vehicle_no: vehicle.vehicle_no,
    driver: vehicle.driver,
    type: vehicle.type,
    imei: vehicle.imei,
    reason: vehicle.breakdownReason || "Active breakdown detected",
    startedAt: vehicle.breakdownAt || new Date().toISOString(),
    fixedAt: null,
    fixedReason: "",
    durationMinutes: null,
    status: "active",
  }));
  nextBreakdownReportId = Math.max(nextBreakdownReportId, reportId);
  return {
    vehicles: seededVehicles,
    breakdownReports: seededBreakdownReports,
    vehicleIcons: { ...defaultIconRegistry },
    batteryAlerts: [],
    batteryLogs: seededVehicles.map((vehicle, index) => ({
      id: index + 1,
      vehicleId: vehicle.id,
      voltage: vehicle.externalVoltage,
      timestamp: vehicle.batterySignalAt,
      location: { lat: vehicle.lat, lng: vehicle.lng },
    })),
  };
}

function saveStore() {
  ensureDataStore();
  fs.writeFileSync(
    STORE_PATH,
    JSON.stringify(
      {
        vehicles,
        breakdownReports,
        vehicleIcons,
        batteryAlerts,
        batteryLogs,
        tripBillingRecords,
        inventoryInwardRecords,
        nextUserId,
        nextVehicleId,
        nextBreakdownReportId,
        nextBatteryAlertId,
        nextTyreInventoryId,
        nextPunctureRequestId,
        nextTripBillingId,
        nextInventoryRecordId,
        nextInventoryInwardId,
      },
      null,
      2,
    ),
  );
}

function loadStore() {
  ensureDataStore();
  if (!fs.existsSync(STORE_PATH)) {
    return buildSeedState();
  }

  try {
    const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    nextUserId = Number(data.nextUserId || nextUserId);
    nextVehicleId = Number(data.nextVehicleId || nextVehicleId);
    nextBreakdownReportId = Number(data.nextBreakdownReportId || nextBreakdownReportId);
    nextBatteryAlertId = Number(data.nextBatteryAlertId || nextBatteryAlertId);
    nextTyreInventoryId = Number(data.nextTyreInventoryId || nextTyreInventoryId);
    nextPunctureRequestId = Number(data.nextPunctureRequestId || nextPunctureRequestId);
    nextTripBillingId = Number(data.nextTripBillingId || nextTripBillingId);
    nextInventoryRecordId = Number(data.nextInventoryRecordId || nextInventoryRecordId);
    nextInventoryInwardId = Number(data.nextInventoryInwardId || nextInventoryInwardId);
    return {
      vehicles: Array.isArray(data.vehicles) ? data.vehicles.map(createVehicleRecord) : buildSeedState().vehicles,
      breakdownReports: Array.isArray(data.breakdownReports) ? data.breakdownReports : [],
      vehicleIcons: { ...defaultIconRegistry, ...(data.vehicleIcons || {}) },
      batteryAlerts: Array.isArray(data.batteryAlerts) ? data.batteryAlerts : [],
      batteryLogs: Array.isArray(data.batteryLogs) ? data.batteryLogs : [],
      tripBillingRecords: Array.isArray(data.tripBillingRecords) ? data.tripBillingRecords : [],
      inventoryInwardRecords: Array.isArray(data.inventoryInwardRecords) ? data.inventoryInwardRecords : [],
    };
  } catch (_error) {
    return buildSeedState();
  }
}

const persistedState = loadStore();
let vehicles = persistedState.vehicles;
let breakdownReports = persistedState.breakdownReports.length ? persistedState.breakdownReports : [];
let vehicleIcons = persistedState.vehicleIcons;
let batteryAlerts = persistedState.batteryAlerts;
let batteryLogs = persistedState.batteryLogs;
let tripBillingRecords = Array.isArray(persistedState.tripBillingRecords) ? persistedState.tripBillingRecords : [];
let inventoryInwardRecords = Array.isArray(persistedState.inventoryInwardRecords)
  ? persistedState.inventoryInwardRecords
  : [];

if (!batteryLogs.length) {
  vehicles.forEach((vehicle) => recordBatteryLog(vehicle, vehicle.batterySignalAt));
}

if (!batteryAlerts.length) {
  vehicles.forEach((vehicle) => {
    syncBatteryWatch(vehicle, vehicle.batterySignalAt);
  });
  saveStore();
}

function getVehicleById(id) {
  return vehicles.find((vehicle) => vehicle.id === id);
}

function getVehicleByNumber(vehicleNo) {
  return vehicles.find(
    (vehicle) => vehicle.vehicle_no.toLowerCase() === String(vehicleNo || "").trim().toLowerCase(),
  );
}

function formatDurationMinutes(startedAt, fixedAt) {
  const started = new Date(startedAt).getTime();
  const ended = new Date(fixedAt).getTime();
  return Math.max(0, Math.round((ended - started) / 60000));
}

function createBreakdownReport(vehicle, reason, startedAt) {
  const report = {
    id: nextBreakdownReportId++,
    vehicleId: vehicle.id,
    vehicle_no: vehicle.vehicle_no,
    driver: vehicle.driver,
    type: vehicle.type,
    imei: vehicle.imei,
    reason,
    startedAt,
    fixedAt: null,
    fixedReason: "",
    durationMinutes: null,
    status: "active",
  };
  breakdownReports.unshift(report);
  saveStore();
  return report;
}

function getActiveBreakdownReport(vehicleId) {
  return breakdownReports.find((report) => report.vehicleId === vehicleId && report.status === "active");
}

function getFleetSummary() {
  const statusCounts = STATUSES.reduce((counts, status) => {
    counts[status] = vehicles.filter((vehicle) => vehicle.status === status).length;
    return counts;
  }, {});

  return {
    total: vehicles.length,
    ...statusCounts,
    batteryOpenAlerts: batteryAlerts.filter((alert) => alert.status === "open").length,
    averageSpeed:
      Math.round(
        vehicles.reduce((total, vehicle) => total + vehicle.speed, 0) /
          Math.max(vehicles.length, 1),
      ) || 0,
    lastUpdate: new Date().toISOString(),
  };
}

function getTyreLayout(configuration) {
  return AXLE_PRESETS[configuration]?.layout || AXLE_PRESETS["6x4"].layout;
}

function getTyrePresetOptions() {
  return Object.entries(AXLE_PRESETS).map(([key, preset]) => ({
    key,
    label: preset.label,
    positions: preset.layout.length,
  }));
}

function getTyreReports() {
  return vehicles
    .flatMap((vehicle) =>
      vehicle.tyreActivity.map((item) => ({
        vehicleId: vehicle.id,
        vehicle_no: vehicle.vehicle_no,
        label: vehicle.label,
        type: vehicle.type,
        axleConfiguration: vehicle.axleConfiguration,
        ...item,
      })),
    )
    .sort((left, right) => new Date(right.installedAt).getTime() - new Date(left.installedAt).getTime())
    .map((item) => {
      const layout = getTyreLayout(item.axleConfiguration);
      const slotNowFilled = vehicles
        .find((vehicle) => vehicle.id === item.vehicleId)
        ?.tyreRecords.some((tyre) => tyre.slot === item.slot);
      return {
        ...item,
        theftRisk: item.action === "removed" && !slotNowFilled,
        side: item.position.toLowerCase().includes("left") ? "Left" : item.position.toLowerCase().includes("right") ? "Right" : "Center",
        totalPositions: layout.length,
      };
    });
}

function getInventoryReports() {
  return vehicles
    .flatMap((vehicle) =>
      vehicle.tyreInventory.map((item) => ({
        vehicleId: vehicle.id,
        vehicle_no: vehicle.vehicle_no,
        label: vehicle.label,
        type: vehicle.type,
        ...item,
      })),
    )
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

function getPunctureReports() {
  return vehicles
    .flatMap((vehicle) =>
      vehicle.punctureRequests.map((item) => ({
        vehicleId: vehicle.id,
        vehicle_no: vehicle.vehicle_no,
        label: vehicle.label,
        type: vehicle.type,
        ...item,
      })),
    )
    .sort((left, right) => new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime());
}

function getInventoryLedgerReports() {
  return vehicles
    .flatMap((vehicle) =>
      vehicle.inventoryRecords.map((item) => ({
        vehicleId: vehicle.id,
        vehicle_no: vehicle.vehicle_no,
        label: vehicle.label,
        type: vehicle.type,
        vehicleHealth: formatStatus(vehicle.status),
        ...item,
      })),
    )
    .sort((left, right) => new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime());
}

function getInventoryInwardReports() {
  return [...inventoryInwardRecords].sort(
    (left, right) => new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime(),
  );
}

function getBatteryLocation(vehicle) {
  return {
    lat: vehicle.lat,
    lng: vehicle.lng,
    timestamp: vehicle.batterySignalAt || vehicle.last_seen || new Date().toISOString(),
  };
}

function formatBatteryAlertMessage(type, vehicle) {
  if (type === BATTERY_ALERT_TYPES.DISCONNECTED) {
    return "External voltage dropped to 0V while ignition is OFF. Check battery disconnect or theft risk.";
  }
  if (type === BATTERY_ALERT_TYPES.LOW_VOLTAGE) {
    return "Battery voltage is below 11V and needs immediate attention.";
  }
  return "Device has not reported power telemetry for more than 5 minutes.";
}

function hasOpenBatteryAlert(vehicleId, type) {
  return batteryAlerts.some(
    (alert) => alert.vehicleId === vehicleId && alert.type === type && alert.status === "open",
  );
}

function hasAnyOpenBatteryAlert(vehicleId) {
  return batteryAlerts.some((alert) => alert.vehicleId === vehicleId && alert.status === "open");
}

function createBatteryAlert(vehicle, type, overrideTimestamp) {
  if (hasOpenBatteryAlert(vehicle.id, type)) {
    return null;
  }

  const alert = {
    id: nextBatteryAlertId++,
    vehicleId: vehicle.id,
    vehicle_no: vehicle.vehicle_no,
    label: vehicle.label,
    vehicleType: vehicle.type,
    driver: vehicle.driver,
    driverPhone: vehicle.driverPhone,
    batterySerialNumber: vehicle.batterySerialNumber,
    batteryAssetStatus: vehicle.batteryAssetStatus,
    type,
    status: "open",
    createdAt: overrideTimestamp || new Date().toISOString(),
    resolvedAt: null,
    externalVoltage: Number(vehicle.externalVoltage || 0),
    ignition: Boolean(vehicle.ignition),
    location: getBatteryLocation(vehicle),
    message: formatBatteryAlertMessage(type, vehicle),
  };

  batteryAlerts.unshift(alert);
  return alert;
}

function resolveBatteryAlert(alertId) {
  const alert = batteryAlerts.find((item) => item.id === alertId);
  if (!alert) {
    return null;
  }

  alert.status = "resolved";
  alert.resolvedAt = new Date().toISOString();
  return alert;
}

function recordBatteryLog(vehicle, timestamp) {
  batteryLogs.unshift({
    id: Date.now() + Math.floor(Math.random() * 1000),
    vehicleId: vehicle.id,
    voltage: Number(vehicle.externalVoltage || 0),
    timestamp: timestamp || vehicle.batterySignalAt || new Date().toISOString(),
    location: { lat: vehicle.lat, lng: vehicle.lng },
  });
  batteryLogs = batteryLogs.slice(0, 500);
}

function syncBatteryWatch(vehicle, overrideTimestamp) {
  const createdAlerts = [];
  const batterySignalTime = new Date(vehicle.batterySignalAt || vehicle.last_seen || Date.now()).getTime();

  if (Number(vehicle.externalVoltage || 0) === 0 && !vehicle.ignition) {
    const alert = createBatteryAlert(vehicle, BATTERY_ALERT_TYPES.DISCONNECTED, overrideTimestamp);
    if (alert) {
      createdAlerts.push(alert);
    }
  }

  if (Number(vehicle.externalVoltage || 0) < 11) {
    const alert = createBatteryAlert(vehicle, BATTERY_ALERT_TYPES.LOW_VOLTAGE, overrideTimestamp);
    if (alert) {
      createdAlerts.push(alert);
    }
  }

  if (Date.now() - batterySignalTime > BATTERY_OFFLINE_MS) {
    const alert = createBatteryAlert(vehicle, BATTERY_ALERT_TYPES.OFFLINE, overrideTimestamp);
    if (alert) {
      createdAlerts.push(alert);
    }
  }

  return createdAlerts;
}

function getBatteryVehicles() {
  return vehicles.map((vehicle) => ({
    id: vehicle.id,
    vehicle_no: vehicle.vehicle_no,
    label: vehicle.label,
    type: vehicle.type,
    driver: vehicle.driver,
    driverPhone: vehicle.driverPhone,
    batterySerialNumber: vehicle.batterySerialNumber,
    batteryAssetStatus: vehicle.batteryAssetStatus,
    lat: vehicle.lat,
    lng: vehicle.lng,
    ignition: vehicle.ignition,
    status: hasAnyOpenBatteryAlert(vehicle.id) ? "Alert" : "Normal",
    movementStatus: vehicle.status,
    externalVoltage: Number(vehicle.externalVoltage || 0),
    batterySignalAt: vehicle.batterySignalAt || vehicle.last_seen,
  }));
}

function getBatterySummary() {
  const openAlerts = batteryAlerts.filter((alert) => alert.status === "open");
  return {
    totalVehicles: vehicles.length,
    openAlerts: openAlerts.length,
    disconnected: openAlerts.filter((alert) => alert.type === BATTERY_ALERT_TYPES.DISCONNECTED).length,
    lowVoltage: openAlerts.filter((alert) => alert.type === BATTERY_ALERT_TYPES.LOW_VOLTAGE).length,
    offline: openAlerts.filter((alert) => alert.type === BATTERY_ALERT_TYPES.OFFLINE).length,
    healthyVehicles: vehicles.filter((vehicle) => !hasAnyOpenBatteryAlert(vehicle.id)).length,
    averageVoltage:
      vehicles.length > 0
        ? Number(
            (
              vehicles.reduce((total, vehicle) => total + Number(vehicle.externalVoltage || 0), 0) /
              vehicles.length
            ).toFixed(1),
          )
        : 0,
    lastUpdate: new Date().toISOString(),
  };
}

function getBatteryOverview() {
  return {
    summary: getBatterySummary(),
    alerts: batteryAlerts
      .map((alert) => {
        const vehicle = getVehicleById(alert.vehicleId);
        return {
          ...alert,
          batterySerialNumber: alert.batterySerialNumber || vehicle?.batterySerialNumber || "-",
          batteryAssetStatus: alert.batteryAssetStatus || vehicle?.batteryAssetStatus || "healthy",
          driverPhone: alert.driverPhone || vehicle?.driverPhone || "-",
        };
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    vehicles: getBatteryVehicles(),
    recentLogs: batteryLogs.slice(0, 40),
  };
}

function broadcastPositions() {
  io.emit("positions", { vehicles, summary: getFleetSummary() });
  io.emit("battery:updated", getBatteryOverview());
}

function updateVehicles() {
  vehicles = vehicles.map((vehicle) => {
    if (vehicle.breakdownActive) {
      const batterySignalAt = new Date().toISOString();
      const lockedVehicle = {
        ...vehicle,
        speed: 0,
        ignition: false,
        gps: true,
        network: true,
        status: "breakdown",
        last_seen: new Date().toISOString(),
        batterySignalAt,
        externalVoltage: Number(clamp((vehicle.externalVoltage || 10.8) - 0.02, 9.8, 11.2).toFixed(1)),
      };

      return {
        ...lockedVehicle,
        status: deriveStatus(lockedVehicle),
      };
    }

    const heading = (vehicle.heading + Math.round((Math.random() - 0.5) * 28) + 360) % 360;
    const statusRoll = Math.random();
    let status = vehicle.status;
    let ignition = vehicle.ignition;
    let speed = vehicle.speed;
    let gps = vehicle.gps;
    let network = vehicle.network;

    if (statusRoll > 0.97) {
      status = "disconnected";
      ignition = false;
      speed = 0;
      gps = false;
      network = false;
    } else if (statusRoll > 0.92) {
      status = "no-gps";
      ignition = vehicle.ignition;
      speed = 0;
      gps = false;
      network = true;
    } else if (statusRoll > 0.86) {
      status = "offline";
      ignition = false;
      speed = 0;
      gps = false;
      network = true;
    } else if (statusRoll > 0.76) {
      status = "breakdown";
      ignition = true;
      speed = 0;
      gps = true;
      network = true;
    } else if (statusRoll > 0.58) {
      status = "parked";
      ignition = false;
      speed = 0;
      gps = true;
      network = true;
    } else if (statusRoll > 0.38) {
      status = "stopped";
      ignition = true;
      speed = 0;
      gps = true;
      network = true;
    } else if (statusRoll > 0.22) {
      status = "idle";
      ignition = true;
      speed = clamp(Math.round(Math.random() * 6), 1, 6);
      gps = true;
      network = true;
    } else {
      status = "moving";
      ignition = true;
      speed = clamp(vehicle.speed + Math.round((Math.random() - 0.35) * 12), 18, 72);
      gps = true;
      network = true;
    }

    let fuel = clamp(vehicle.fuel - (speed > 0 ? 0.04 : 0.005), 8, 100);
    let adblue = clamp(vehicle.adblue - (speed > 0 ? 0.025 : 0.004), 5, 100);
    let externalVoltage = Number(vehicle.externalVoltage || 12.4);
    let lastFuelFillLiters = vehicle.lastFuelFillLiters;
    let lastFuelFillAt = vehicle.lastFuelFillAt;
    let lastAdblueFillLiters = vehicle.lastAdblueFillLiters;
    let lastAdblueFillAt = vehicle.lastAdblueFillAt;

    if (fuel < 15 && Math.random() > 0.92) {
      lastFuelFillLiters = 32;
      lastFuelFillAt = new Date().toISOString();
      fuel = clamp(fuel + 42, 8, 100);
    }

    if (adblue < 12 && Math.random() > 0.94) {
      lastAdblueFillLiters = 9;
      lastAdblueFillAt = new Date().toISOString();
      adblue = clamp(adblue + 36, 5, 100);
    }

    const distanceFactor = speed / 50000;
    const lat = vehicle.lat + Math.cos((heading * Math.PI) / 180) * distanceFactor;
    const lng = vehicle.lng + Math.sin((heading * Math.PI) / 180) * distanceFactor;
    const odometer = vehicle.odometer + speed / 3600;
    const shouldRefreshBatterySignal = network && status !== "offline" && status !== "disconnected";
    if (!shouldRefreshBatterySignal) {
      externalVoltage = 0;
    } else if (status === "parked" || status === "stopped") {
      externalVoltage = clamp(externalVoltage - 0.08 + Math.random() * 0.06, 11.1, 12.4);
    } else {
      externalVoltage = clamp(externalVoltage + (Math.random() - 0.35) * 0.18, 11.4, 13.2);
    }
    if (status === "breakdown" && Math.random() > 0.55) {
      externalVoltage = clamp(externalVoltage - 0.45, 9.6, 11.2);
    }
    const batterySignalAt = shouldRefreshBatterySignal
      ? new Date().toISOString()
      : vehicle.batterySignalAt || new Date(Date.now() - BATTERY_OFFLINE_MS - 30000).toISOString();
    const history = [
      ...vehicle.history,
      { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), timestamp: new Date().toISOString() },
    ].slice(-40);
    const baseVehicle = {
      ...vehicle,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      speed,
      fuel: Number(fuel.toFixed(1)),
      adblue: Number(adblue.toFixed(1)),
      fuelReading: Number(fuel.toFixed(1)),
      adblueReading: Number(adblue.toFixed(1)),
      ignition,
      heading,
      odometer: Number(odometer.toFixed(1)),
      gps,
      network,
      status,
      externalVoltage: Number(externalVoltage.toFixed(1)),
      batterySignalAt,
      last_seen: new Date().toISOString(),
      history,
      lastFuelFillLiters,
      lastFuelFillAt,
      lastAdblueFillLiters,
      lastAdblueFillAt,
    };

    return {
      ...baseVehicle,
      status: deriveStatus(baseVehicle),
    };
  });
  vehicles.forEach((vehicle) => {
    recordBatteryLog(vehicle, vehicle.batterySignalAt);
    syncBatteryWatch(vehicle, vehicle.batterySignalAt);
  });
  saveStore();
}

app.get("/config", (_req, res) => {
  res.send({ pages: ACCESS_PAGES });
});

app.post("/login", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const user = users.find(
    (candidate) => candidate.username === username && candidate.password === password,
  );

  if (!user) {
    return res.status(401).send({ success: false, message: "Invalid username or password" });
  }

  return res.send({ success: true, user: sanitizeUser(user) });
});

app.get("/gps-device/:imei", (req, res) => {
  const device = toDeviceSnapshot(req.params.imei);

  if (!device) {
    return res.status(400).send({ success: false, message: "Enter a valid 15-digit AIS 140 IMEI number" });
  }

  return res.send({ success: true, device });
});

app.get("/vehicles", (_req, res) => {
  res.send(vehicles);
});

app.get("/battery-overview", (_req, res) => {
  res.send(getBatteryOverview());
});

app.get("/battery-alerts", (_req, res) => {
  res.send(getBatteryOverview().alerts);
});

app.get("/alerts", (_req, res) => {
  res.send(getBatteryOverview().alerts);
});

app.post("/gps-data", (req, res) => {
  const vehicleId = Number(req.body.vehicleId);
  const vehicle = getVehicleById(vehicleId);

  if (!vehicle) {
    return res.status(404).send({ success: false, message: "Vehicle not found" });
  }

  const externalVoltage = Number(req.body.externalVoltage);
  const ignition = String(req.body.ignition).toLowerCase() === "on" || req.body.ignition === true;
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  const timestamp = req.body.timestamp ? new Date(req.body.timestamp).toISOString() : new Date().toISOString();

  if (!Number.isFinite(externalVoltage) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).send({
      success: false,
      message: "vehicleId, externalVoltage, lat, and lng are required with valid values",
    });
  }

  vehicle.externalVoltage = Number(externalVoltage.toFixed(1));
  vehicle.ignition = ignition;
  vehicle.lat = Number(lat.toFixed(6));
  vehicle.lng = Number(lng.toFixed(6));
  vehicle.batterySignalAt = timestamp;
  vehicle.last_seen = timestamp;
  vehicle.gps = true;
  vehicle.network = true;

  if (typeof req.body.speed !== "undefined" && Number.isFinite(Number(req.body.speed))) {
    vehicle.speed = Number(req.body.speed);
  }

  if (typeof req.body.heading !== "undefined" && Number.isFinite(Number(req.body.heading))) {
    vehicle.heading = Number(req.body.heading);
  }

  vehicle.history = [
    ...vehicle.history,
    { lat: vehicle.lat, lng: vehicle.lng, timestamp },
  ].slice(-40);
  vehicle.status = deriveStatus(vehicle);

  recordBatteryLog(vehicle, timestamp);
  const createdAlerts = syncBatteryWatch(vehicle, timestamp);
  saveStore();
  broadcastPositions();

  return res.status(201).send({
    success: true,
    vehicle,
    createdAlerts,
    message: "GPS data accepted",
  });
});

app.get("/vehicles/:id/tyres", (req, res) => {
  const vehicle = getVehicleById(Number(req.params.id));
  if (!vehicle) {
    return res.status(404).send({ success: false, message: "Vehicle not found" });
  }

  return res.send({
    vehicle: {
      id: vehicle.id,
      vehicle_no: vehicle.vehicle_no,
      label: vehicle.label,
      type: vehicle.type,
      driver: vehicle.driver,
      odometer: vehicle.odometer,
      axleConfiguration: vehicle.axleConfiguration,
    },
    layout: getTyreLayout(vehicle.axleConfiguration),
    tyres: vehicle.tyreRecords,
    activity: vehicle.tyreActivity,
    inventory: vehicle.tyreInventory,
    punctureRequests: vehicle.punctureRequests,
    presets: getTyrePresetOptions(),
    tyreCatalog: TYRE_CATALOG,
  });
});

app.get("/tyre-reports", (_req, res) => {
  res.send(getTyreReports());
});

app.get("/tyre-inventory-reports", (_req, res) => {
  res.send(getInventoryReports());
});

app.get("/puncture-reports", (_req, res) => {
  res.send(getPunctureReports());
});

app.get("/inventory-records", (_req, res) => {
  res.send(getInventoryLedgerReports());
});

app.get("/inventory-inwards", (_req, res) => {
  res.send(getInventoryInwardReports());
});

app.get("/trip-billing-records", (_req, res) => {
  res.send(
    [...tripBillingRecords].sort(
      (left, right) => new Date(right.tripDate).getTime() - new Date(left.tripDate).getTime(),
    ),
  );
});

app.get("/vehicle-icons", (_req, res) => {
  res.send(vehicleIcons);
});

app.get("/trip-history", (req, res) => {
  const ids = String(req.query.vehicleIds || "")
    .split(",")
    .map((item) => Number(item))
    .filter(Boolean);

  const result = vehicles
    .filter((vehicle) => ids.length === 0 || ids.includes(vehicle.id))
    .map((vehicle) => ({
      id: vehicle.id,
      vehicle_no: vehicle.vehicle_no,
      label: vehicle.label,
      status: vehicle.status,
      history: vehicle.history,
    }));

  res.send(result);
});

app.get("/breakdown-reports", (_req, res) => {
  res.send(
    breakdownReports.map((report) => ({
      ...report,
      durationMinutes:
        report.status === "active"
          ? formatDurationMinutes(report.startedAt, new Date().toISOString())
          : report.durationMinutes,
    })),
  );
});

app.post("/battery-alerts/:id/resolve", (req, res) => {
  const alert = resolveBatteryAlert(Number(req.params.id));
  if (!alert) {
    return res.status(404).send({ success: false, message: "Battery alert not found" });
  }

  saveStore();
  broadcastPositions();
  return res.send({ success: true, alert, message: "Battery alert resolved" });
});

app.post("/alerts/:id/resolve", (req, res) => {
  const alert = resolveBatteryAlert(Number(req.params.id));
  if (!alert) {
    return res.status(404).send({ success: false, message: "Alert not found" });
  }

  saveStore();
  broadcastPositions();
  return res.send({ success: true, alert, message: "Alert resolved" });
});

app.post("/vehicles", (req, res) => {
  const {
    vehicle_no,
    label,
    driver,
    driverPhone,
    type,
    lat,
    lng,
    speed,
    heading,
    fuel,
    ignition,
    status,
    adblue,
    imei,
    axleConfiguration,
    batterySerialNumber,
    batteryAssetStatus,
  } = req.body;

  if (!vehicle_no || !label || !driver || !type) {
    return res.status(400).send({ success: false, message: "All vehicle fields are required" });
  }

  const exists = vehicles.some(
    (vehicle) => vehicle.vehicle_no.toLowerCase() === String(vehicle_no).trim().toLowerCase(),
  );

  if (exists) {
    return res.status(409).send({ success: false, message: "Vehicle number already exists" });
  }

  const device = imei ? toDeviceSnapshot(imei) : null;
  if (imei && !device) {
    return res.status(400).send({ success: false, message: "Enter a valid 15-digit AIS 140 IMEI number" });
  }

  const vehicle = createVehicleRecord({
    id: nextVehicleId++,
    vehicle_no: String(vehicle_no).trim().toUpperCase(),
    label: String(label).trim(),
    driver: String(driver).trim(),
    driverPhone: String(driverPhone || "").trim() || undefined,
    type: String(type).trim(),
    imei: device?.imei || String(imei || "").trim(),
    lat: Number(lat) || device?.lat || 22.82,
    lng: Number(lng) || device?.lng || 86.23,
    speed: Number(speed) || device?.speed || 0,
    heading: Number(heading) || device?.heading || 0,
    fuel: Number(fuel) || device?.fuel || 50,
    adblue: Number(adblue) || device?.adblue || 40,
    externalVoltage: Number(req.body.externalVoltage) || device?.externalVoltage || undefined,
    ignition: device ? device.ignition : Boolean(ignition),
    status: status || device?.status || undefined,
    gps: device?.gps,
    network: device?.network,
    axleConfiguration: axleConfiguration || getDefaultAxleConfiguration(type),
    batterySerialNumber: String(batterySerialNumber || "").trim() || undefined,
    batteryAssetStatus: String(batteryAssetStatus || "healthy").trim().toLowerCase(),
  });

  vehicles.push(vehicle);
  recordBatteryLog(vehicle, vehicle.batterySignalAt);
  syncBatteryWatch(vehicle, vehicle.batterySignalAt);
  saveStore();
  broadcastPositions();
  return res.status(201).send({ success: true, vehicle, message: "Vehicle added successfully" });
});

app.put("/vehicles/:id", (req, res) => {
  const vehicle = getVehicleById(Number(req.params.id));
  if (!vehicle) {
    return res.status(404).send({ success: false, message: "Vehicle not found" });
  }

  const {
    vehicle_no,
    label,
    driver,
    driverPhone,
    type,
    imei,
    lat,
    lng,
    speed,
    heading,
    fuel,
    adblue,
    externalVoltage,
    ignition,
    status,
    axleConfiguration,
    batterySerialNumber,
    batteryAssetStatus,
  } = req.body;

  if (!vehicle_no || !label || !driver || !type) {
    return res.status(400).send({ success: false, message: "All vehicle fields are required" });
  }

  const duplicate = vehicles.some(
    (candidate) =>
      candidate.id !== vehicle.id &&
      candidate.vehicle_no.toLowerCase() === String(vehicle_no).trim().toLowerCase(),
  );

  if (duplicate) {
    return res.status(409).send({ success: false, message: "Vehicle number already exists" });
  }

  const nextType = String(type).trim();
  const nextAxleConfiguration = String(axleConfiguration || vehicle.axleConfiguration || getDefaultAxleConfiguration(nextType)).trim();
  const validSlots = new Set(getTyreLayout(nextAxleConfiguration).map((item) => item.slot));

  vehicle.vehicle_no = String(vehicle_no).trim().toUpperCase();
  vehicle.label = String(label).trim();
  vehicle.driver = String(driver).trim();
  vehicle.driverPhone = String(driverPhone || "").trim() || getDefaultDriverPhone(vehicle.id);
  vehicle.type = nextType;
  vehicle.imei = String(imei || "").trim();
  vehicle.lat = Number(lat) || vehicle.lat;
  vehicle.lng = Number(lng) || vehicle.lng;
  vehicle.speed = Number(speed) || 0;
  vehicle.heading = Number(heading) || 0;
  vehicle.fuel = Number(fuel) || vehicle.fuel;
  vehicle.adblue = Number(adblue) || vehicle.adblue;
  vehicle.fuelReading = Number(fuel) || vehicle.fuelReading;
  vehicle.adblueReading = Number(adblue) || vehicle.adblueReading;
  vehicle.externalVoltage = Number(externalVoltage) || vehicle.externalVoltage || 12.4;
  vehicle.ignition = Boolean(ignition);
  vehicle.gps = typeof req.body.gps === "boolean" ? req.body.gps : vehicle.gps;
  vehicle.network = typeof req.body.network === "boolean" ? req.body.network : vehicle.network;
  vehicle.status = status || deriveStatus(vehicle);
  vehicle.axleConfiguration = AXLE_PRESETS[nextAxleConfiguration] ? nextAxleConfiguration : vehicle.axleConfiguration;
  vehicle.tyreRecords = vehicle.tyreRecords.filter((item) => validSlots.has(item.slot));
  vehicle.batterySerialNumber =
    String(batterySerialNumber || "").trim() || getDefaultBatterySerial(vehicle.id, vehicle.vehicle_no);
  vehicle.batteryAssetStatus = String(batteryAssetStatus || "healthy").trim().toLowerCase();
  vehicle.batterySignalAt = new Date().toISOString();
  vehicle.last_seen = vehicle.batterySignalAt;

  recordBatteryLog(vehicle, vehicle.batterySignalAt);
  syncBatteryWatch(vehicle, vehicle.batterySignalAt);
  saveStore();
  broadcastPositions();
  return res.send({ success: true, vehicle, message: "Vehicle updated successfully" });
});

app.put("/vehicles/:id/axle-config", (req, res) => {
  const vehicle = getVehicleById(Number(req.params.id));
  const axleConfiguration = String(req.body.axleConfiguration || "").trim();
  if (!vehicle) {
    return res.status(404).send({ success: false, message: "Vehicle not found" });
  }
  if (!AXLE_PRESETS[axleConfiguration]) {
    return res.status(400).send({ success: false, message: "Select a valid axle configuration" });
  }

  vehicle.axleConfiguration = axleConfiguration;
  const validSlots = new Set(getTyreLayout(axleConfiguration).map((item) => item.slot));
  vehicle.tyreRecords = vehicle.tyreRecords.filter((item) => validSlots.has(item.slot));
  vehicle.tyreActivity.unshift({
    id: Date.now(),
    action: "axle-config-updated",
    slot: "",
    position: axleConfiguration,
    tyreType: "",
    installedAt: new Date().toISOString(),
    note: "Axle configuration changed to " + AXLE_PRESETS[axleConfiguration].label,
  });
  saveStore();
  return res.send({ success: true, message: "Axle configuration updated", axleConfiguration });
});

app.post("/vehicles/:id/tyres", (req, res) => {
  const vehicle = getVehicleById(Number(req.params.id));
  if (!vehicle) {
    return res.status(404).send({ success: false, message: "Vehicle not found" });
  }

  const tyreType = String(req.body.tyreType || "").trim();
  const tyreCondition = String(req.body.tyreCondition || "new").trim().toLowerCase();
  const tyreMeter = Number(req.body.tyreMeter || 0);
  const axle = String(req.body.axle || "").trim();
  const position = String(req.body.position || "").trim();
  const treadDepth = Number(req.body.treadDepth || 0);
  const pressure = Number(req.body.pressure || 0);
  const installedAt = req.body.installedAt || new Date().toISOString();
  const slot = String(req.body.slot || "").trim();
  const tyreSerialNumber = String(req.body.tyreSerialNumber || "").trim();

  if (!tyreType || !axle || !position || !slot || !treadDepth || !pressure) {
    return res.status(400).send({ success: false, message: "Fill tyre type, axle, position, tread depth, and pressure" });
  }

  vehicle.tyreRecords = vehicle.tyreRecords.filter((item) => item.slot !== slot);
  const tyre = {
    id: Date.now(),
    tyreType,
    tyreCondition,
    tyreMeter,
    tyreSerialNumber,
    axle,
    position,
    slot,
    treadDepth,
    pressure,
    installedAt,
    installedOdometer: vehicle.odometer,
  };
  vehicle.tyreRecords.push(tyre);
  vehicle.tyreActivity.unshift({
    id: Date.now() + 1,
    action: "installed",
    slot,
    axle,
    position,
    tyreType,
    tyreSerialNumber,
    installedAt,
    note:
      (tyreCondition === "used" ? "Used tyre installed" : "New tyre installed") +
      " at " +
      position +
      (tyreSerialNumber ? " | Serial " + tyreSerialNumber : ""),
  });
  saveStore();
  return res.send({ success: true, tyre, message: "Tyre installed successfully" });
});

app.post("/vehicles/:id/tyre-inventory", (req, res) => {
  const vehicle = getVehicleById(Number(req.params.id));
  if (!vehicle) {
    return res.status(404).send({ success: false, message: "Vehicle not found" });
  }

  const tyreType = String(req.body.tyreType || "").trim();
  const tyreSerialNumber = String(req.body.tyreSerialNumber || "").trim();
  const quantity = Number(req.body.quantity || 0);
  const condition = String(req.body.condition || "new").trim().toLowerCase();
  const location = String(req.body.location || "").trim();
  const note = String(req.body.note || "").trim();

  if (!tyreType || !tyreSerialNumber || quantity <= 0 || !location) {
    return res.status(400).send({ success: false, message: "Tyre type, serial number, quantity, and location are required" });
  }

  const item = {
    id: nextTyreInventoryId++,
    tyreType,
    tyreSerialNumber,
    quantity,
    condition,
    location,
    note,
    updatedAt: new Date().toISOString(),
  };

  vehicle.tyreInventory.unshift(item);
  vehicle.tyreActivity.unshift({
    id: Date.now() + 2,
    action: "inventory-added",
    slot: "",
    axle: "",
    position: "Inventory",
    tyreType,
    tyreSerialNumber,
    installedAt: item.updatedAt,
    note: `Inventory added at ${location} | Qty ${quantity}${note ? " | " + note : ""}`,
  });
  saveStore();
  return res.status(201).send({ success: true, item, message: "Tyre inventory added successfully" });
});

app.post("/inventory-inwards", (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [req.body];
  const normalizedItems = items
    .map((item) => ({
      itemName: String(item.itemName || "").trim(),
      serialNumber: String(item.serialNumber || "").trim(),
      recordedAt: item.recordedAt || new Date().toISOString(),
      vendor: String(item.vendor || "").trim(),
      brand: String(item.brand || "").trim(),
      cost: Number(item.cost || 0),
      quantity: Number(item.quantity || 1),
    }))
    .filter((item) => item.itemName && item.serialNumber && item.vendor && item.brand && item.cost >= 0);

  if (!normalizedItems.length) {
    return res.status(400).send({ success: false, message: "At least one valid inward item is required" });
  }

  const created = normalizedItems.map((item) => ({
    id: nextInventoryInwardId++,
    ...item,
  }));

  inventoryInwardRecords.unshift(...created);
  saveStore();
  return res.status(201).send({
    success: true,
    records: created,
    message: created.length > 1 ? "Inventory inward items added successfully" : "Inventory inward item added successfully",
  });
});

app.post("/inventory-records", (req, res) => {
  const itemName = String(req.body.itemName || "").trim();
  const addStock = Number(req.body.addStock || 0);
  const usedStock = Number(req.body.usedStock || 0);
  const allottedVehicleNo = String(req.body.allottedVehicleNo || "").trim().toUpperCase();
  const allottedPerson = String(req.body.allottedPerson || "").trim();
  const recordedAt = req.body.recordedAt || new Date().toISOString();

  if (!itemName) {
    return res.status(400).send({ success: false, message: "Item name is required" });
  }

  const vehicle = allottedVehicleNo ? getVehicleByNumber(allottedVehicleNo) : null;
  const targetVehicle = vehicle || vehicles[0];
  if (allottedVehicleNo && !vehicle) {
    return res.status(404).send({ success: false, message: "Allotted vehicle number not found" });
  }

  const previousBalance = targetVehicle.inventoryRecords
    .filter((record) => record.itemName.toLowerCase() === itemName.toLowerCase())
    .reduce((sum, record) => sum + Number(record.balance || 0), 0);
  const balance = previousBalance + addStock - usedStock;

  if (balance < 0) {
    return res.status(400).send({ success: false, message: "Used stock cannot exceed available balance" });
  }

  const record = {
    id: nextInventoryRecordId++,
    itemName,
    addStock,
    usedStock,
    balance,
    allottedVehicleNo: targetVehicle.vehicle_no,
    allottedPerson,
    recordedAt,
  };

  targetVehicle.inventoryRecords.unshift(record);
  saveStore();
  return res.status(201).send({ success: true, record, message: "Inventory record added successfully" });
});

app.post("/inventory-records/import", (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) {
    return res.status(400).send({ success: false, message: "No outward records found in uploaded sheet" });
  }

  const created = [];
  for (const item of items) {
    const itemName = String(item.itemName || "").trim();
    const addStock = Number(item.addStock || 0);
    const usedStock = Number(item.usedStock || 0);
    const allottedVehicleNo = String(item.allottedVehicleNo || "").trim().toUpperCase();
    const allottedPerson = String(item.allottedPerson || "").trim();
    const recordedAt = item.recordedAt || new Date().toISOString();
    if (!itemName) {
      continue;
    }

    const vehicle = allottedVehicleNo ? getVehicleByNumber(allottedVehicleNo) : null;
    const targetVehicle = vehicle || vehicles[0];
    if (allottedVehicleNo && !vehicle) {
      continue;
    }

    const previousBalance = targetVehicle.inventoryRecords
      .filter((record) => record.itemName.toLowerCase() === itemName.toLowerCase())
      .reduce((sum, record) => sum + Number(record.balance || 0), 0);
    const balance = previousBalance + addStock - usedStock;
    if (balance < 0) {
      continue;
    }

    const record = {
      id: nextInventoryRecordId++,
      itemName,
      addStock,
      usedStock,
      balance,
      allottedVehicleNo: targetVehicle.vehicle_no,
      allottedPerson,
      recordedAt,
    };

    targetVehicle.inventoryRecords.unshift(record);
    created.push(record);
  }

  if (!created.length) {
    return res.status(400).send({ success: false, message: "No valid outward records were imported" });
  }

  saveStore();
  return res.status(201).send({ success: true, records: created, message: "Outward ledger imported successfully" });
});

app.delete("/vehicles/:id/tyre-inventory/:itemId", (req, res) => {
  const vehicle = getVehicleById(Number(req.params.id));
  if (!vehicle) {
    return res.status(404).send({ success: false, message: "Vehicle not found" });
  }

  const itemId = Number(req.params.itemId);
  const item = vehicle.tyreInventory.find((entry) => entry.id === itemId);
  if (!item) {
    return res.status(404).send({ success: false, message: "Inventory item not found" });
  }

  vehicle.tyreInventory = vehicle.tyreInventory.filter((entry) => entry.id !== itemId);
  vehicle.tyreActivity.unshift({
    id: Date.now() + 3,
    action: "inventory-removed",
    slot: "",
    axle: "",
    position: "Inventory",
    tyreType: item.tyreType,
    tyreSerialNumber: item.tyreSerialNumber,
    installedAt: new Date().toISOString(),
    note: `Inventory removed from ${item.location}`,
  });
  saveStore();
  return res.send({ success: true, message: "Inventory item removed successfully" });
});

app.post("/vehicles/:id/puncture-requests", (req, res) => {
  const vehicle = getVehicleById(Number(req.params.id));
  if (!vehicle) {
    return res.status(404).send({ success: false, message: "Vehicle not found" });
  }

  const axle = String(req.body.axle || "").trim();
  const position = String(req.body.position || "").trim();
  const slot = String(req.body.slot || "").trim();
  const driverName = String(req.body.driverName || vehicle.driver || "").trim();
  const note = String(req.body.note || "").trim();
  const photo = String(req.body.photo || "").trim();
  const requestedAt = req.body.requestedAt || new Date().toISOString();

  if (!axle || !position || !slot || !photo) {
    return res.status(400).send({ success: false, message: "Select a tyre slot and upload a puncture photo" });
  }

  const request = {
    id: nextPunctureRequestId++,
    axle,
    position,
    slot,
    driverName,
    note,
    photo,
    status: "pending",
    requestedAt,
    reviewerNote: "",
    reviewedAt: null,
  };

  vehicle.punctureRequests.unshift(request);
  vehicle.tyreActivity.unshift({
    id: Date.now() + 4,
    action: "puncture-requested",
    slot,
    axle,
    position,
    tyreType: "Puncture Approval",
    tyreSerialNumber: "",
    installedAt: requestedAt,
    note: `Puncture approval requested by ${driverName || "driver"}${note ? " | " + note : ""}`,
  });
  saveStore();
  return res.status(201).send({ success: true, request, message: "Puncture approval request submitted" });
});

app.post("/trip-billing-records", (req, res) => {
  const serialNo = String(req.body.serialNo || "").trim();
  const vehicleNo = String(req.body.vehicleNo || "").trim().toUpperCase();
  const tripDate = req.body.tripDate || new Date().toISOString();
  const challanNo = String(req.body.challanNo || "").trim().toUpperCase();
  const tonnage = Number(req.body.tonnage || 0);
  const driver = String(req.body.driver || "").trim();
  const amount = Number(req.body.amount || 0);

  if (!serialNo || !vehicleNo || !challanNo || !driver || !tonnage || !amount) {
    return res.status(400).send({ success: false, message: "Serial no, vehicle no, challan no, tonnage, driver, and amount are required" });
  }

  const duplicateChallan = tripBillingRecords.some(
    (record) => String(record.challanNo || "").trim().toUpperCase() === challanNo,
  );

  if (duplicateChallan) {
    return res.status(409).send({ success: false, message: "Duplicate challan number detected" });
  }

  const vehicle = getVehicleByNumber(vehicleNo);
  if (!vehicle) {
    return res.status(404).send({ success: false, message: "Vehicle number not found" });
  }

  const record = {
    id: nextTripBillingId++,
    serialNo,
    vehicleNo: vehicle.vehicle_no,
    tripDate,
    challanNo,
    tonnage,
    driver,
    amount,
    vehicleType: vehicle.type,
    vehicleLabel: vehicle.label,
    createdAt: new Date().toISOString(),
  };

  tripBillingRecords.unshift(record);
  saveStore();
  return res.status(201).send({ success: true, record, message: "Trip billing record added successfully" });
});

app.post("/trip-billing-records/import", (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) {
    return res.status(400).send({ success: false, message: "No trip billing rows found in uploaded sheet" });
  }

  const created = [];
  for (const item of items) {
    const serialNo = String(item.serialNo || "").trim();
    const vehicleNo = String(item.vehicleNo || "").trim().toUpperCase();
    const tripDate = item.tripDate || new Date().toISOString();
    const challanNo = String(item.challanNo || "").trim().toUpperCase();
    const tonnage = Number(item.tonnage || 0);
    const driver = String(item.driver || "").trim();
    const amount = Number(item.amount || 0);

    if (!serialNo || !vehicleNo || !challanNo || !driver || !tonnage || !amount) {
      continue;
    }
    if (tripBillingRecords.some((record) => String(record.challanNo || "").trim().toUpperCase() === challanNo)) {
      continue;
    }

    const vehicle = getVehicleByNumber(vehicleNo);
    if (!vehicle) {
      continue;
    }

    const record = {
      id: nextTripBillingId++,
      serialNo,
      vehicleNo: vehicle.vehicle_no,
      tripDate,
      challanNo,
      tonnage,
      driver,
      amount,
      vehicleType: vehicle.type,
      vehicleLabel: vehicle.label,
      createdAt: new Date().toISOString(),
    };

    tripBillingRecords.unshift(record);
    created.push(record);
  }

  if (!created.length) {
    return res.status(400).send({ success: false, message: "No valid trip billing rows were imported" });
  }

  saveStore();
  return res.status(201).send({ success: true, records: created, message: "Trip billing sheet imported successfully" });
});

app.post("/vehicles/:id/puncture-requests/:requestId/status", (req, res) => {
  const vehicle = getVehicleById(Number(req.params.id));
  if (!vehicle) {
    return res.status(404).send({ success: false, message: "Vehicle not found" });
  }

  const requestId = Number(req.params.requestId);
  const request = vehicle.punctureRequests.find((item) => item.id === requestId);
  if (!request) {
    return res.status(404).send({ success: false, message: "Puncture request not found" });
  }

  const status = String(req.body.status || "").trim().toLowerCase();
  const reviewerNote = String(req.body.reviewerNote || "").trim();
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).send({ success: false, message: "Valid status is required" });
  }

  request.status = status;
  request.reviewerNote = reviewerNote;
  request.reviewedAt = new Date().toISOString();
  vehicle.tyreActivity.unshift({
    id: Date.now() + 5,
    action: `puncture-${status}`,
    slot: request.slot,
    axle: request.axle,
    position: request.position,
    tyreType: "Puncture Approval",
    tyreSerialNumber: "",
    installedAt: request.reviewedAt,
    note: `Puncture request ${status}${reviewerNote ? " | " + reviewerNote : ""}`,
  });
  saveStore();
  return res.send({ success: true, request, message: `Puncture request ${status}` });
});

app.delete("/vehicles/:id/tyres/:tyreId", (req, res) => {
  const vehicle = getVehicleById(Number(req.params.id));
  if (!vehicle) {
    return res.status(404).send({ success: false, message: "Vehicle not found" });
  }

  const tyreId = Number(req.params.tyreId);
  const tyre = vehicle.tyreRecords.find((item) => item.id === tyreId);
  if (!tyre) {
    return res.status(404).send({ success: false, message: "Tyre not found" });
  }

  vehicle.tyreRecords = vehicle.tyreRecords.filter((item) => item.id !== tyreId);
  vehicle.tyreActivity.unshift({
    id: Date.now(),
    action: "removed",
    slot: tyre.slot,
    axle: tyre.axle,
    position: tyre.position,
    tyreType: tyre.tyreType,
    tyreSerialNumber: tyre.tyreSerialNumber || "",
    installedAt: new Date().toISOString(),
    note: "Tyre removed from position" + (tyre.tyreSerialNumber ? " | Serial " + tyre.tyreSerialNumber : ""),
  });
  saveStore();
  return res.send({ success: true, message: "Tyre removed successfully" });
});

app.delete("/vehicles/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = vehicles.findIndex((vehicle) => vehicle.id === id);

  if (index === -1) {
    return res.status(404).send({ success: false, message: "Vehicle not found" });
  }

  const [vehicle] = vehicles.splice(index, 1);
  breakdownReports = breakdownReports.filter((report) => report.vehicleId !== vehicle.id);
  saveStore();
  broadcastPositions();
  return res.send({ success: true, message: `${vehicle.vehicle_no} deleted successfully` });
});

app.post("/vehicles/:id/geofence", (req, res) => {
  const vehicle = getVehicleById(Number(req.params.id));
  const points = Array.isArray(req.body.points) ? req.body.points : [];
  const name = String(req.body.name || "").trim();

  if (!vehicle) {
    return res.status(404).send({ success: false, message: "Vehicle not found" });
  }

  if (!name || points.length < 3) {
    return res.status(400).send({ success: false, message: "Geofence name and at least three points are required" });
  }

  const geofence = {
    id: Date.now(),
    name,
    points,
    createdAt: new Date().toISOString(),
  };

  vehicle.geofences = [...vehicle.geofences, geofence];
  saveStore();
  return res.send({ success: true, geofence, message: "Geofence saved successfully" });
});

app.post("/vehicles/:id/route", (req, res) => {
  const vehicle = getVehicleById(Number(req.params.id));
  const points = Array.isArray(req.body.points) ? req.body.points : [];
  const name = String(req.body.name || "").trim();

  if (!vehicle) {
    return res.status(404).send({ success: false, message: "Vehicle not found" });
  }

  if (!name || points.length < 2) {
    return res.status(400).send({ success: false, message: "Route name and at least two points are required" });
  }

  const route = {
    id: Date.now(),
    name,
    points,
    createdAt: new Date().toISOString(),
  };

  vehicle.assignedRoutes = [...vehicle.assignedRoutes, route];
  saveStore();
  return res.send({ success: true, route, message: "Route assigned successfully" });
});

app.post("/vehicles/:id/breakdown", (req, res) => {
  const vehicle = getVehicleById(Number(req.params.id));
  const reason = String(req.body.reason || "").trim();
  const startedAt = req.body.startedAt || new Date().toISOString();

  if (!vehicle) {
    return res.status(404).send({ success: false, message: "Vehicle not found" });
  }

  if (!reason) {
    return res.status(400).send({ success: false, message: "Breakdown reason is required" });
  }

  if (vehicle.breakdownActive) {
    return res.status(400).send({ success: false, message: "Vehicle is already marked as breakdown" });
  }

  vehicle.breakdownActive = true;
  vehicle.breakdownReason = reason;
  vehicle.breakdownAt = startedAt;
  vehicle.fixedAt = null;
  vehicle.fixedReason = "";
  vehicle.status = "breakdown";
  vehicle.speed = 0;
  vehicle.ignition = false;

  const report = createBreakdownReport(vehicle, reason, startedAt);
  saveStore();
  broadcastPositions();
  return res.send({ success: true, vehicle, report, message: "Vehicle marked as breakdown" });
});

app.post("/vehicles/:id/fix", (req, res) => {
  const vehicle = getVehicleById(Number(req.params.id));
  const fixedAt = req.body.fixedAt || new Date().toISOString();
  const fixedReason = String(req.body.fixedReason || "").trim();

  if (!vehicle) {
    return res.status(404).send({ success: false, message: "Vehicle not found" });
  }

  if (!vehicle.breakdownActive) {
    return res.status(400).send({ success: false, message: "Vehicle is not in breakdown state" });
  }

  vehicle.breakdownActive = false;
  vehicle.fixedAt = fixedAt;
  vehicle.fixedReason = fixedReason;
  vehicle.breakdownReason = vehicle.breakdownReason || fixedReason;
  vehicle.status = "stopped";
  vehicle.speed = 0;
  vehicle.ignition = false;

  const report = getActiveBreakdownReport(vehicle.id);
  if (report) {
    report.fixedAt = fixedAt;
    report.fixedReason = fixedReason;
    report.durationMinutes = formatDurationMinutes(report.startedAt, fixedAt);
    report.status = "fixed";
  }

  saveStore();
  broadcastPositions();
  return res.send({ success: true, vehicle, report, message: "Vehicle marked as fixed" });
});

app.post("/vehicle-icons/:type", (req, res) => {
  const type = normalizeVehicleType(req.params.type);
  const image = String(req.body.image || "").trim();

  if (!type || !image.startsWith("data:image/")) {
    return res.status(400).send({ success: false, message: "Valid vehicle type and image are required" });
  }

  vehicleIcons[type] = image;
  saveStore();
  return res.send({ success: true, icons: vehicleIcons, message: "Vehicle icon uploaded successfully" });
});

app.delete("/vehicle-icons/:type", (req, res) => {
  const type = normalizeVehicleType(req.params.type);
  if (!type) {
    return res.status(400).send({ success: false, message: "Vehicle type is required" });
  }

  vehicleIcons[type] = null;
  saveStore();
  return res.send({ success: true, icons: vehicleIcons, message: "Vehicle icon removed successfully" });
});

app.get("/users", (_req, res) => {
  res.send(users.map(sanitizeUser));
});

app.post("/users", (req, res) => {
  const { name, username, password, role, expiry, access } = req.body;

  if (!name || !username || !password) {
    return res.status(400).send({ success: false, message: "Name, username, and password are required" });
  }

  const exists = users.some(
    (user) => user.username.toLowerCase() === String(username).trim().toLowerCase(),
  );

  if (exists) {
    return res.status(409).send({ success: false, message: "Username already exists" });
  }

  const user = {
    id: nextUserId++,
    name: String(name).trim(),
    username: String(username).trim(),
    password: String(password),
    role: String(role || "Operator").trim(),
    expiry: expiry || "2099-12-31",
    access: validAccess(access).length ? validAccess(access) : ["dashboard", "live-tracker", "reports"],
  };

  users.push(user);
  return res.status(201).send({ success: true, user: sanitizeUser(user), message: "User added successfully" });
});

app.put("/users/:id/access", (req, res) => {
  const id = Number(req.params.id);
  const user = users.find((candidate) => candidate.id === id);

  if (!user) {
    return res.status(404).send({ success: false, message: "User not found" });
  }

  user.access = validAccess(req.body.access);
  return res.send({ success: true, user: sanitizeUser(user), message: "Access updated successfully" });
});

app.delete("/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = users.findIndex((user) => user.id === id);

  if (index === -1) {
    return res.status(404).send({ success: false, message: "User not found" });
  }

  if (users[index].username === "admin") {
    return res.status(400).send({ success: false, message: "Admin user cannot be deleted" });
  }

  const [user] = users.splice(index, 1);
  return res.send({ success: true, message: `${user.username} deleted successfully` });
});

app.get("/summary", (_req, res) => {
  res.send(getFleetSummary());
});

app.get("/billing", (req, res) => {
  const requestedId = Number(req.query.userId);
  const user = users.find((candidate) => candidate.id === requestedId) || users[0];

  res.send({
    user: sanitizeUser(user),
    status: new Date(user.expiry) >= new Date() ? "Active" : "Expired",
  });
});

app.get("/billing-overview", (_req, res) => {
  res.send(
    users.map((user) => ({
      user: sanitizeUser(user),
      status: new Date(user.expiry) >= new Date() ? "Active" : "Expired",
      accessCount: validAccess(user.access).length,
    })),
  );
});

app.post("/pay", (req, res) => {
  const requestedId = Number(req.body.userId);
  const user = users.find((candidate) => candidate.id === requestedId) || users[0];

  user.expiry = "2099-12-31";
  res.send({ success: true, message: "Payment success", user: sanitizeUser(user) });
});

app.get("/fuel-readings", (_req, res) => {
  res.send(
    vehicles.map((vehicle) => ({
      id: vehicle.id,
      vehicle_no: vehicle.vehicle_no,
      driver: vehicle.driver,
      status: vehicle.status,
      fuelReading: vehicle.fuelReading,
      lastFuelFillLiters: vehicle.lastFuelFillLiters,
      lastFuelFillAt: vehicle.lastFuelFillAt,
    })),
  );
});

app.get("/adblue-readings", (_req, res) => {
  res.send(
    vehicles.map((vehicle) => ({
      id: vehicle.id,
      vehicle_no: vehicle.vehicle_no,
      driver: vehicle.driver,
      status: vehicle.status,
      adblueReading: vehicle.adblueReading,
      lastAdblueFillLiters: vehicle.lastAdblueFillLiters,
      lastAdblueFillAt: vehicle.lastAdblueFillAt,
    })),
  );
});

io.on("connection", (socket) => {
  console.log("User connected");
  socket.emit("positions", { vehicles, summary: getFleetSummary() });
  socket.emit("battery:updated", getBatteryOverview());

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

setInterval(() => {
  updateVehicles();
  broadcastPositions();
}, 2000);

app.get("/", (_req, res) => {
  res.sendFile(`${__dirname}/public/login.html`);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
