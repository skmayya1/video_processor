import { Server } from "socket.io";
import http from "http";
import { ClientToServerEvents, ServerToClientEvents, TypedSocket } from "./types";

export const initSocket = (server: http.Server) => {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: "*", // Replace with your frontend URL in production
    },
  });

  io.on("connection", (socket: TypedSocket) => {
    console.log("⚡ Client connected:", socket.id);

    socket.on("joinRoom", (roomId) => {
      socket.join(roomId);
      console.log(`Joined room: ${roomId}`);
    });

    socket.on("startJob", (videoId) => {
      console.log(`Start processing video: ${videoId}`);
      io.to(socket.id).emit("status", "queued");

      setTimeout(() => {
        io.to(socket.id).emit("status", "processing");
      }, 1000);

      setTimeout(() => {
        io.to(socket.id).emit("status", "done");
        io.to(socket.id).emit("update", `Video ${videoId} processed.`);
      }, 3000);
    });

    socket.on("disconnect", () => {
      console.log("🚫 Client disconnected:", socket.id);
    });
  });
};
