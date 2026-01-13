const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const gigRoutes = require("./routes/gigs");
const bidRoutes = require("./routes/bids");
const errorHandler = require("./middleware/errorHandler");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL, // must match your frontend Render URL
    credentials: true, // allow cookies
  })
);

// ---------- HTTP + Socket.io ----------
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});

// store connected users { userId: socketId }
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("registerUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log("✅ Registered user:", userId, "→", socket.id);
    console.log("📦 All onlineUsers:", Array.from(onlineUsers.entries()));
  });

  socket.on("disconnect", () => {
    for (const [id, sId] of onlineUsers.entries()) {
      if (sId === socket.id) onlineUsers.delete(id);
    }
    console.log("❌ Socket disconnected:", socket.id);
  });
});

app.set("io", io);
app.set("onlineUsers", onlineUsers);

// ---------- API Routes ----------
app.use("/api/auth", authRoutes);

// add debugging middleware here
app.use("/api/gigs", (req, res, next) => {
  console.log("➡️ Incoming GIGS route:", req.method, req.originalUrl);
  next();
}, gigRoutes);

app.use("/api/bids", bidRoutes);

// ✅ Catch-all for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});



app.use(errorHandler);

// ---------- Start Server ----------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
