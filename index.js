import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import http from "http"; // ✅ Required for socket.io
import { Server } from "socket.io"; // ✅ Socket.IO server

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.js";

dotenv.config();

const app = express();
const server = http.createServer(app); // ✅ Wrap express in http server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // ✅ Your frontend origin
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/message", messageRoutes);

// Optional 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// 🧠 Keep track of online users
const onlineUsers = new Map();

// 🔄 Socket.io setup
io.on("connection", (socket) => {
  console.log("🔌 New client connected", socket.id);

  socket.on("addUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log("👤 User Online:", userId);
  });

  socket.on("sendMessage", ({ senderId, receiverId, text, image }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("getMessage", {
        senderId,
        text,
        image,
        createdAt: new Date(),
      });
    }
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    console.log("❌ Client disconnected", socket.id);
  });
});

// Start server after DB connects
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
