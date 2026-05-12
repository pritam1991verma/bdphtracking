const http = require("http");
const { Server } = require("socket.io");
const { app } = require("./app");
const { env } = require("./config/env");
const { pool } = require("./config/db");
const { registerAlertSocket } = require("./sockets/alertSocket");
const { startTcpServer } = require("./tcp/tcpServer");
const { startOfflineWatcher } = require("./services/deviceTracker");

async function bootstrap() {
  await pool.query("SELECT 1");

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: env.frontendOrigin,
      credentials: true,
    },
  });

  registerAlertSocket(io);
  startTcpServer(env.tcpPort);
  startOfflineWatcher();

  httpServer.listen(env.port, () => {
    console.log(`Battery theft backend running on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start battery theft backend:", error);
  process.exit(1);
});
