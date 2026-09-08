const gmailServices = require("../services/gmail.services");

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
    }

    const message = await gmailServices.sendOtpService(email);

    return res.status(200).json({
      success: true,
      requiresOtp: true,
      message: message,
    });
  } catch (error) {
    console.error("Send OTP Controller Error:", error.message);

    if (error.message.includes("already voted")) {
      return res.status(400).json({
        success: false,
        alreadyVoted: true,
        message: "This email address has already cast its vote.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send verification code.",
    });
  }
};
// VERIFY OTP CONTROLLER
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP code are required.",
      });
    }

    await gmailServices.verifyOtpService(email, otp);

    // Establish Express Session upon successful verification
    req.session.email = email.trim().toLowerCase();

    return res.status(200).json({
      success: true,
      redirectUrl: "/votingpage",
      message: "Authentication successful.",
    });
  } catch (error) {
    console.error("Verify OTP Controller Error:", error.message);
    return res.status(400).json({
      success: false,
      message: error.message || "Invalid or expired OTP code.",
    });
  }
};

// SUBMIT VOTE CONTROLLER
exports.submitVote = async (req, res) => {
  try {
    const email = req.session.email;
    const { kingId, queenId, mrSmartId, msStyleId, mrPopularId, msPopularId } =
      req.body;

    const result = await gmailServices.submitVote({
      email,
      kingId,
      queenId,
      mrSmartId,
      msStyleId,
      mrPopularId,
      msPopularId,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Submit Vote Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while submitting your vote.",
    });
  }
};
