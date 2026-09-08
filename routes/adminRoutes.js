const express = require("express");
const router = express.Router();

router.get(
  "/dashboard",
  isAuthenticated,
  isAdmin,
  participantController.renderAdminDashboard,
  participantController.renderSettings,
);

router.post(
  "/create",
  isAuthenticated,
  isAdmin,
  upload.single("photo"),
  participantController.createParticipant,
);
router.post(
  "/update/:id",
  isAuthenticated,
  isAdmin,
  upload.single("photo"),
  participantController.updateParticipant,
);
router.get(
  "/delete/:id",
  isAuthenticated,
  isAdmin,
  participantController.deleteParticipant,
);

router.get("/results", participantController.renderResultsPage);
router.get("/settings", participantController.renderSettings);
router.post("/settings", participantController.updateSettings);

module.exports = router;
