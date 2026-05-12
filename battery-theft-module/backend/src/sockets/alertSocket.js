let ioInstance = null;

function registerAlertSocket(io) {
  ioInstance = io;
  io.on("connection", (socket) => {
    socket.emit("system.ready", { ok: true, message: "Battery alert socket connected" });
  });
}

function broadcastAlert(event, payload) {
  if (!ioInstance) {
    return;
  }
  ioInstance.emit(event, payload);
}

module.exports = {
  registerAlertSocket,
  broadcastAlert,
};
