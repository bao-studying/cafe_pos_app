const { Server } = require("socket.io");

let io = null;

// Gọi 1 lần duy nhất trong app.js sau khi tạo httpServer
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket kết nối: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`🔌 Socket ngắt kết nối: ${socket.id}`);
    });
  });

  return io;
}

// Dùng ở controller: const { getIO } = require("../socket");
function getIO() {
  if (!io) {
    throw new Error(
      "Socket.io chưa được khởi tạo. Gọi initSocket(httpServer) trước.",
    );
  }
  return io;
}

module.exports = { initSocket, getIO };
