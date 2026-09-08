require("dotenv").config();

const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
const { pool } = require("./config/db");
const routes = require("./routes");
const pgSession = require("connect-pg-simple")(session);

const { SESSION_SECRET } = require("./config/config");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION:", reason);
});

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/qr_codes", express.static(path.join(__dirname, "qr_codes")));
app.use("/uploads", express.static(path.join(__dirname, "middleware/uploads")));

// Session Configuration
const express = require("express");
const session = require("express-session");
const cors = require("cors");

// 1. CRITICAL: Must be at the very top before session setup on Render
app.set("trust proxy", 1);

// 2. CORS setup (If frontend and backend are separate or using credentials)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || true, // Allow your domain
    credentials: true, // Crucial for passing cookies
  }),
);

// 3. Robust Session Middleware Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: true, // Forces session to saved back to session store
    saveUninitialized: false, // Don't save empty sessions
    proxy: true, // Tells express-session to trust Render's reverse proxy
    cookie: {
      secure: process.env.NODE_ENV === "production", // True on HTTPS
      sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax", // Change "none" to "lax"
      httpOnly: true, // Prevents client-side JS from stealing the cookie
      maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
    },
  }),
);
app.use("/", routes);

// Start the HTTP server on Render's assigned port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = server;
