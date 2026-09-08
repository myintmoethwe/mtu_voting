const db = require("../config/db");
const { BrevoClient } = require("@getbrevo/brevo");

// Initialize Brevo Client
const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ======================================
// 1. SEND OTP (BREVO HTTP API)
// ======================================
exports.sendOtpService = async (email) => {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check if user has already voted
  const existingUser = await db.query(
    "SELECT * FROM voted_users WHERE LOWER(email) = $1",
    [cleanEmail],
  );

  if (existingUser.rows.length > 0) {
    const userRecord = existingUser.rows[0];
    if (userRecord.has_voted === true || userRecord.king_id !== null) {
      throw new Error("This email has already voted. OTP request denied.");
    }
  }

  // 2. Check active unexpired OTP to prevent spam
  const activeOtp = await db.query(
    `SELECT expires_at FROM otp_codes 
     WHERE LOWER(email) = $1 AND expires_at > NOW()`,
    [cleanEmail],
  );

  if (activeOtp.rows.length > 0) {
    throw new Error(
      "An OTP code has already been sent to this email. Please check your inbox or wait for it to expire.",
    );
  }

  // 3. Generate & Save OTP (5 minutes expiration)
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db.query("DELETE FROM otp_codes WHERE LOWER(email) = $1", [cleanEmail]);
  await db.query(
    `INSERT INTO otp_codes (email, otp, expires_at) VALUES ($1, $2, $3)`,
    [cleanEmail, otp, expiresAt],
  );

  // 4. Send Email via BrevoClient
  try {
    await brevo.transactionalEmails.sendTransacEmail({
      subject: "MTU Voting System Verification Code",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0066ff;">MTU Voting System</h2>
          <p>Your OTP verification code is:</p>
          <h1 style="font-size: 32px; letter-spacing: 5px; color: #111;">${otp}</h1>
          <p>This code will expire in 5 minutes.</p>
        </div>
      `,
      sender: {
        name: "MTU Voting System",
        email: process.env.SENDER_EMAIL,
      },
      to: [{ email: cleanEmail }],
    });

    console.log(`OTP sent successfully to ${cleanEmail} via Brevo.`);
    return "OTP code sent successfully to your email.";
  } catch (error) {
    console.error("Brevo API Execution Error:", error);
    throw new Error("Failed to send verification email. Please try again.");
  }
};
