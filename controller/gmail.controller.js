const pool = require("../config/db");
const {
  sendOtpService,
  verifyOtpService,
  submitVote
} = require("../services/gmail.services");

// ======================================
// SEND OTP
// ======================================
// ======================================
// SEND OTP
// ======================================
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required."
      });
    }

    const message = await sendOtpService(email);

    return res.json({
      success: true,
      requiresOtp: true, 
      message
    });

  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
// ======================================
// VERIFY OTP
// ======================================
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required."
      });
    }

    const result = await verifyOtpService(email, otp);

    if (result) {
      // 1. Check if user has already voted in the database
      const userCheck = await pool.query(
        `SELECT has_voted FROM voted_users WHERE LOWER(email) = LOWER($1)`,
        [email.trim()]
      );

      const hasVoted = userCheck.rows.length > 0 && userCheck.rows[0].has_voted === true;

      // 2. Save session data used by your route guard
      req.session.email = email;
      req.session.isAuthenticated = !hasVoted; // True if they can still vote
      req.session.hasVoted = hasVoted;         // True if they already voted (view-only)

      // 3. Register them in the database as logged in if they aren't there yet
      await pool.query(
        `INSERT INTO voted_users (email, has_voted) 
         VALUES ($1, FALSE) 
         ON CONFLICT (email) DO NOTHING`,
        [email]
      );

      return res.json({
        success: true,
        message: "OTP verified successfully.",
        redirectUrl: "/votingpage"
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP."
      });
    }

  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Invalid or expired OTP."
    });
  }
};
// ======================================
// SUBMIT VOTE
// ======================================

exports.submitVote = async (req, res) => {
  try {
    const {
      kingId,
      queenId,
      mrSmartId,
      msStyleId,
      mrPopularId,
      msPopularId
    } = req.body;

    const email = req.session.email;

    if (!email) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email first."
      });
    }

    const result = await submitVote({
      email,
      kingId,
      queenId,
      mrSmartId,
      msStyleId,
      mrPopularId,
      msPopularId
    });

    return res.json(result);

  } catch (error) {
    console.error("Submit Vote Error:", error);
    // CHANGE THIS: Send error.message instead of a generic string
    return res.status(400).json({
      success: false,
      message: error.message || "Vote failed."
    });
  }
};