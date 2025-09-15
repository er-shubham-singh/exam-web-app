import dotenv from "dotenv";
import "dotenv/config";
dotenv.config();

import http from "http";
import { Server } from "socket.io";
import app from "./src/index.js";
import connectDb from "./src/Config/db.js";
import config from "./src/Config/app.config.js";
import socketController from "./src/Controller/examLog.socket.controller.js";

const server = http.createServer(app);

// ✅ Setup Socket.IO with CORS config
const io = new Server(server, {
  cors: {
    origin: config.frontendUrl, // e.g. http://localhost:5174
    methods: ["GET", "POST"],
  },
});

// ✅ Listen for client connections
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);
  socketController(io, socket); // pass both io + socket here
});

server.listen(config.port, async () => {
  await connectDb();
  console.log("✅ Server running on:", config.port);
});
