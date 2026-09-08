const express = require("express");
const router = express.Router();
const gmailController = require("../controller/gmail.controller");
const { getAllParticipants } = require("../services/gmail.services");
const db = require("../config/db");

// Middleware to block unauthorized access to the voting page and vote submission
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.email) {
    return next();
  }
  res.redirect("/authentication");
}

// Authentication Page View
router.get("/authentication", (req, res) => {
  res.render("authentication");
});

// Protected Voting Page View
router.get("/votingpage", ensureAuthenticated, async (req, res) => {
  try {
    const email = req.session.email;

    const userCheck = await db.query(
      "SELECT has_voted FROM voted_users WHERE LOWER(email) = LOWER($1)",
      [email],
    );

    let hasVoted = false;
    if (userCheck.rows.length > 0 && userCheck.rows[0].has_voted === true) {
      hasVoted = true;
    }

    const participants = await getAllParticipants();
    res.render("votingpage", { participants, hasVoted, viewOnly: hasVoted });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading the page");
  }
});

// SECURED: Relies strictly on the authenticated session rather than raw body input
router.post(
  "/api/view-ballot-session",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const email = req.session.email;

      const userCheck = await db.query(
        "SELECT has_voted FROM voted_users WHERE LOWER(email) = LOWER($1)",
        [email],
      );

      if (userCheck.rows.length > 0 && userCheck.rows[0].has_voted === true) {
        return res.json({ success: true, redirectUrl: "/votingpage" });
      }

      res
        .status(403)
        .json({ success: false, message: "Unauthorized ballot access" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);
router.get(
  "/api/user-ballot",
  ensureAuthenticated,
  gmailController.getUserBallot,
);
// Voted Confirmation Page View
router.get("/votedpage", ensureAuthenticated, (req, res) => {
  res.render("votedpage");
});

// SEND OTP API
router.post("/api/send-otp", gmailController.sendOtp);

// VERIFY OTP API
router.post("/api/verify-otp", gmailController.verifyOtp);

// SUBMIT VOTE API (Protected with middleware)
router.post("/api/vote", ensureAuthenticated, gmailController.submitVote);

module.exports = router;
