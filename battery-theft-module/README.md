# Battery Theft Prevention Module

Standalone Node.js + Express + PostgreSQL + React module for GPS fleet tracking systems.

## Folder Structure

```text
battery-theft-module/
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── sql/
│   │   └── schema.sql
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       │   ├── db.js
│       │   └── env.js
│       ├── constants/
│       │   └── alertTypes.js
│       ├── repositories/
│       │   ├── alertRepository.js
│       │   ├── batteryLogRepository.js
│       │   └── vehicleRepository.js
│       ├── routes/
│       │   ├── alerts.js
│       │   └── gps.js
│       ├── services/
│       │   ├── alertEngine.js
│       │   ├── deviceTracker.js
│       │   └── gpsIngestionService.js
│       ├── sockets/
│       │   └── alertSocket.js
│       └── tcp/
│           └── tcpServer.js
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── api.js
        ├── main.jsx
        ├── socket.js
        ├── styles.css
        └── components/
            ├── AlertList.jsx
            ├── StatusSummary.jsx
            └── VehicleMap.jsx
```

## Backend Setup

1. Copy `backend/.env.example` to `backend/.env`
2. Create the PostgreSQL schema using `backend/sql/schema.sql`
3. Install dependencies:

```bash
cd battery-theft-module/backend
npm install
```

4. Start the backend:

```bash
npm run dev
```

## Frontend Setup

1. Install dependencies:

```bash
cd battery-theft-module/frontend
npm install
```

2. Start the React dashboard:

```bash
npm run dev
```

## Core Features

- HTTP GPS ingest via `POST /gps-data`
- TCP GPS ingest for JSON-line device payloads
- Battery disconnect, low voltage, and device offline alert logic
- PostgreSQL persistence for vehicles, battery logs, and alerts
- Socket.IO realtime alert broadcasting
- React dashboard with live alerts, vehicle status, and map plotting
- Driver details attached to alerts
- Last known location stored for each vehicle
