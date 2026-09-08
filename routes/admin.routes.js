// routes/admin.routes.js
const express = require("express");
const { getCandidatesApi } = require("../controller/admin.controller");
const router = express.Router();
const {
  renderAdminDashboard,
  renderResultsPage,
  renderSettings,
  updateSettings,
  updateParticipant,
  deleteParticipant,
  createParticipant,
  updateCountdown,
  pauseCountdown,
  resumeCountdown,
  resetCountdown,
  getCountdownStatusApi,
} = require("../controller/admin.controller");
const isAdmin = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

// router.get("/candidates", isAdmin, getCandidatesApi);
router.get("/api/admin/candidates", isAdmin, getCandidatesApi);
router.post("/api/admin/candidates", isAdmin, upload.single("photo"), createParticipant); // Add this line
router.get("/", isAdmin, renderAdminDashboard);
router.get("/dashboard", isAdmin, renderAdminDashboard);
router.get("/results", renderResultsPage);
router.get("/settings", isAdmin, renderSettings);
router.post("/settings", isAdmin, updateSettings);

// API endpoints matching your frontend fetch calls
router.post("/update-countdown", isAdmin, updateCountdown);
router.post("/pause", isAdmin, pauseCountdown);
router.post("/resume", isAdmin, resumeCountdown);
router.post("/reset", isAdmin, resetCountdown);
router.get("/api/countdown-status", isAdmin, getCountdownStatusApi);

router.post("/update/:id", isAdmin, upload.single("photo"), updateParticipant);
router.get("/delete/:id", isAdmin, deleteParticipant);
router.post("/create", isAdmin, upload.single("photo"), createParticipant);

module.exports = router;