const db = require("../config/db");
const { BrevoClient } = require("@getbrevo/brevo");

// Initialize Brevo API Client (v2+ SDK)
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

  // 2. Generate OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // 3. Send Email via Brevo API FIRST
  // (Prevents saving orphaned OTP codes if delivery fails)
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

    console.log(
      `OTP email dispatched successfully to ${cleanEmail} via Brevo.`,
    );
  } catch (error) {
    console.error(
      "Brevo Delivery Error Details:",
      error?.response?.body || error,
    );
    throw new Error(
      "Failed to deliver OTP email. Please verify sender configuration.",
    );
  }

  // 4. Save to DB ONLY after successful email dispatch
  await db.query("DELETE FROM otp_codes WHERE LOWER(email) = $1", [cleanEmail]);
  await db.query(
    `INSERT INTO otp_codes (email, otp, expires_at) VALUES ($1, $2, $3)`,
    [cleanEmail, otp, expiresAt],
  );

  return "OTP code sent successfully to your email.";
};

// ======================================
// 2. VERIFY OTP
// ======================================
exports.verifyOtpService = async (email, otp) => {
  const cleanEmail = email.trim().toLowerCase();
  const trimmedOtp = String(otp).trim();

  const emailCheck = await db.query(
    `SELECT * FROM otp_codes WHERE LOWER(email) = $1`,
    [cleanEmail],
  );

  if (emailCheck.rows.length === 0) {
    throw new Error(
      "No active OTP request found for this email. Please request a new code.",
    );
  }

  const result = await db.query(
    `SELECT * FROM otp_codes 
     WHERE LOWER(email) = $1 AND TRIM(otp) = $2`,
    [cleanEmail, trimmedOtp],
  );

  if (result.rows.length === 0) {
    throw new Error("Wrong OTP code. Please check your email and try again.");
  }

  const record = result.rows[0];

  if (new Date() > new Date(record.expires_at)) {
    await db.query("DELETE FROM otp_codes WHERE LOWER(email) = $1", [
      cleanEmail,
    ]);
    throw new Error("OTP code has expired. Please request a new one.");
  }

  await db.query("DELETE FROM otp_codes WHERE LOWER(email) = $1", [cleanEmail]);
  return true;
};

// ======================================
// 3. SUBMIT VOTE
// ======================================
exports.submitVote = async ({
  email,
  kingId,
  queenId,
  mrSmartId,
  msStyleId,
  mrPopularId,
  msPopularId,
}) => {
  if (!email) {
    throw new Error("Email is required.");
  }

  const cleanEmail = email.trim().toLowerCase();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const existingVote = await client.query(
      `SELECT id, has_voted 
       FROM voted_users 
       WHERE LOWER(email) = $1 FOR UPDATE`,
      [cleanEmail],
    );

    if (existingVote.rows.length > 0) {
      const user = existingVote.rows[0];
      if (user.has_voted) {
        await client.query("ROLLBACK");
        return {
          success: false,
          message:
            "You have already voted. Multiple submissions are not allowed.",
        };
      }
    } else {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "Unauthorized vote attempt. Please verify via OTP first.",
      };
    }

    const voteCategories = [
      { id: kingId, field: "kingVotes" },
      { id: queenId, field: "queenVotes" },
      { id: mrSmartId, field: "smartVotes" },
      { id: msStyleId, field: "styleVotes" },
      { id: mrPopularId, field: "boyPopularVotes" },
      { id: msPopularId, field: "girlPopularVotes" },
    ];

    for (const item of voteCategories) {
      if (item.id) {
        await client.query(
          `UPDATE participants
           SET "${item.field}" = "${item.field}" + 1
           WHERE id = $1`,
          [item.id],
        );
      }
    }

    await client.query(
      `INSERT INTO voted_users
      (
        email,
        has_voted,
        king_id,
        queen_id,
        mr_smart_id,
        ms_style_id,
        mr_popular_id,
        ms_popular_id
      )
      VALUES ($1, TRUE, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) 
      DO UPDATE SET 
        has_voted = TRUE,
        king_id = EXCLUDED.king_id,
        queen_id = EXCLUDED.queen_id,
        mr_smart_id = EXCLUDED.mr_smart_id,
        ms_style_id = EXCLUDED.ms_style_id,
        mr_popular_id = EXCLUDED.mr_popular_id,
        ms_popular_id = EXCLUDED.ms_popular_id`,
      [
        cleanEmail,
        kingId || null,
        queenId || null,
        mrSmartId || null,
        msStyleId || null,
        mrPopularId || null,
        msPopularId || null,
      ],
    );

    await client.query("COMMIT");
    return {
      success: true,
      message: "Vote submitted successfully.",
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// ======================================
// 4. GET ALL PARTICIPANTS
// ======================================
exports.getAllParticipants = async () => {
  const query = `
    SELECT
      ROW_NUMBER() OVER (ORDER BY id ASC) AS display_id,
      id,
      name,
      photo,
      description,
      gender,
      hobby,
      hometown,
      "kingVotes",
      "queenVotes",
      "smartVotes",
      "styleVotes",
      "boyPopularVotes",
      "girlPopularVotes"
    FROM participants;
  `;

  const { rows } = await db.query(query);
  return rows;
};
