const net = require("net");
const { ingestGpsData } = require("../services/gpsIngestionService");

function startTcpServer(port) {
  const server = net.createServer((socket) => {
    let buffer = "";

    socket.on("data", async (chunk) => {
      buffer += chunk.toString();
      const messages = buffer.split("\n");
      buffer = messages.pop() || "";

      for (const rawMessage of messages) {
        const line = rawMessage.trim();
        if (!line) {
          continue;
        }

        try {
          const payload = JSON.parse(line);
          await ingestGpsData(payload);
          socket.write(JSON.stringify({ ok: true }) + "\n");
        } catch (error) {
          socket.write(JSON.stringify({ ok: false, message: error.message }) + "\n");
        }
      }
    });
  });

  server.listen(port, () => {
    console.log(`TCP GPS listener running on port ${port}`);
  });

  return server;
}

module.exports = { startTcpServer };
