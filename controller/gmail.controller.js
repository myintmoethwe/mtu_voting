const pool = require("../config/db");
const {
  sendOtpService,
  verifyOtpService,
  submitVote,
} = require("../services/gmail.services");

// ======================================
// SEND OTP
// ======================================
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const message = await sendOtpService(email);

    return res.json({
      success: true,
      requiresOtp: true,
      message,
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
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
        message: "Email and OTP are required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await verifyOtpService(cleanEmail, otp);

    if (result) {
      // 1. Check if user has already voted in the database
      const userCheck = await pool.query(
        `SELECT has_voted FROM voted_users WHERE LOWER(email) = $1`,
        [cleanEmail],
      );

      const hasVoted =
        userCheck.rows.length > 0 && userCheck.rows[0].has_voted === true;

      // 2. Save session data used by your route guard
      req.session.email = cleanEmail;
      req.session.isAuthenticated = !hasVoted;
      req.session.hasVoted = hasVoted;

      // 3. Register user entry if not already present
      if (userCheck.rows.length === 0) {
        await pool.query(
          `INSERT INTO voted_users (email, has_voted) VALUES ($1, FALSE)`,
          [cleanEmail],
        );
      }

      return res.json({
        success: true,
        message: "OTP verified successfully.",
        redirectUrl: "/votingpage",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP.",
      });
    }
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Invalid or expired OTP.",
    });
  }
};

// ======================================
// SUBMIT VOTE
// ======================================
exports.submitVote = async (req, res) => {
  try {
    const { kingId, queenId, mrSmartId, msStyleId, mrPopularId, msPopularId } =
      req.body;

    const email = req.session.email;

    if (!email) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email first.",
      });
    }

    const result = await submitVote({
      email,
      kingId,
      queenId,
      mrSmartId,
      msStyleId,
      mrPopularId,
      msPopularId,
    });

    return res.json(result);
  } catch (error) {
    console.error("Submit Vote Error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Vote failed.",
    });
  }
};
