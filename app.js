require("dotenv").config();

const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
const cors = require("cors");
const { pool } = require("./config/db");
const routes = require("./routes");
const pgSession = require("connect-pg-simple")(session);

const { SESSION_SECRET } = require("./config/config");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Catch unhandled application crashes
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION:", reason);
});

// Trust Render's proxy (MUST be set before session middleware)
app.set("trust proxy", 1);

app.set("io", io);

// Socket.io connection listener
io.on("connection", (socket) => {
  socket.on("phone-scanned", () => {
    io.emit("redirect-laptop");
  });
});

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/qr_codes", express.static(path.join(__dirname, "qr_codes")));
app.use("/uploads", express.static(path.join(__dirname, "middleware/uploads")));

// Persistent Session Middleware Configuration
app.use(
  session({
    store: new pgSession({
      pool: pool, // Uses your PostgreSQL pool to persist sessions
      tableName: "session", // Automatically creates/uses "session" table
      createTableIfMissing: true, // Automatically creates table if not existing
    }),
    secret: SESSION_SECRET || process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  }),
);

app.use("/", routes);

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = server;
