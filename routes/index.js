const express = require("express");
const router = express.Router();
const adminRoutes = require("./admin.routes");
const userRoutes = require("./user.routes");
const authRoutes = require("./auth.routes");
const gmailRoutes = require("./gmail.routes");

// Route Middlewares 
router.use("/auth", authRoutes);
router.use("/api/admin", adminRoutes);
router.use("/admin", adminRoutes);
router.use("/", gmailRoutes);
router.use("/", userRoutes);

module.exports = router;