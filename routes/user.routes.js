const express = require("express");
const router = express.Router();
const QRCode = require("qrcode");
const pool = require("../config/db");
const { renderResultsPage } = require("../controller/admin.controller");

// Helper function to pull the latest countdown settings from DB
async function getCountdownSettings() {
  const result = await pool.query(
    "SELECT target_time, duration, countdown_status FROM settings ORDER BY id DESC LIMIT 1",
  );
  return result.rows.length > 0
    ? result.rows[0]
    : {
        target_time: null,
        duration: "00:00:00",
        countdown_status: "stopped",
      };
}

// --------------------------------------
// QR Code Display Route
// --------------------------------------
router.get("/", async (req, res) => {
  try {
    const countdown = await getCountdownSettings();

    // Dynamically build target URL based on request host
    const targetUrl = `${req.protocol}://${req.get("host")}/home`;

    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      width: 250,
      margin: 2,
      color: { dark: "#0066ff", light: "#ffffff" },
    });

    res.render("qr_view", { qrCode: qrDataUrl, countdown });
  } catch (err) {
    console.error("QR Generation Error:", err);
    res.status(500).send("Error generating QR code");
  }
});

// --------------------------------------
// Index Route
// --------------------------------------
router.get("/index", async (req, res) => {
  try {
    const countdown = await getCountdownSettings();
    res.render("index", { countdown });
  } catch (err) {
    console.error(err);
    res.render("index", {
      countdown: {
        target_time: null,
        duration: "00:00:00",
        countdown_status: "stopped",
      },
    });
  }
});

// --------------------------------------
// Home Route
// --------------------------------------
router.get("/home", async (req, res) => {
  try {
    const countdown = await getCountdownSettings();
    res.render("home", { countdown });
  } catch (err) {
    console.error(err);
    res.render("home", {
      countdown: {
        target_time: null,
        duration: "00:00:00",
        countdown_status: "stopped",
      },
    });
  }
});

// --------------------------------------
// Countdown API Endpoint
// --------------------------------------
router.get("/api/countdown", async (req, res) => {
  try {
    const countdown = await getCountdownSettings();
    res.json(countdown);
  } catch (err) {
    console.error("Error fetching countdown API:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --------------------------------------
// Results Page Route
// --------------------------------------
router.get("/results", renderResultsPage);

module.exports = router;
