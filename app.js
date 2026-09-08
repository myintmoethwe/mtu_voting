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
app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: "session",
      createTableIfMissing: true, // Creates session table automatically
    }),
    secret: process.env.SESSION_SECRET || "fallback_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
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
