const db = require("../config/db");
const { Resend } = require("resend");

// Initialize Resend dynamically to prevent boot crashes if env var is missing
const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY in environment variables.");
  }
  return new Resend(apiKey);
};

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ======================================
// SEND OTP (PREVENT DUPLICATES & DOUBLE VOTING)
// ======================================
exports.sendOtpService = async (email) => {
  const cleanEmail = email.trim().toLowerCase();

  console.log("1. Checking existing user in DB...");
  const existingUser = await db.query(
    "SELECT * FROM voted_users WHERE LOWER(email) = $1",
    [cleanEmail],
  );

  // Block OTP request if user has already voted
  if (existingUser.rows.length > 0) {
    const userRecord = existingUser.rows[0];
    if (userRecord.has_voted === true || userRecord.king_id !== null) {
      throw new Error("This email has already voted. OTP request denied.");
    }
  }

  // Block sending a new code if an active, unexpired OTP already exists
  console.log("2. Checking for active unexpired OTP...");
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

  // Generate OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

  console.log("3. Clearing expired OTPs and saving new OTP to DB...");
  await db.query("DELETE FROM otp_codes WHERE LOWER(email) = $1", [cleanEmail]);

  await db.query(
    `INSERT INTO otp_codes (email, otp, expires_at)
     VALUES ($1, $2, $3)`,
    [cleanEmail, otp, expiresAt],
  );

  console.log("4. Triggering Resend API...");
  const resend = getResend();

  const { error } = await resend.emails.send({
    from: "CodeaSquad Voting System <onboarding@resend.dev>",
    to: [cleanEmail],
    subject: "Voting Verification Code",
    html: `
      <h3>Your OTP Code is <b>${otp}</b></h3>
      <p>This code will expire in 5 minutes.</p>
    `,
  });

  if (error) {
    console.error("Resend Email Error:", error);
    throw new Error("Failed to send verification email. Please try again.");
  }

  console.log("5. Email sent successfully via Resend!");
  return "OTP code sent successfully to your email.";
};

// ======================================
// VERIFY OTP
// ======================================
exports.verifyOtpService = async (email, otp) => {
  const cleanEmail = email.trim().toLowerCase();
  const trimmedOtp = String(otp).trim();

  // 1. Check if email exists in otp_codes
  const emailCheck = await db.query(
    `SELECT * FROM otp_codes WHERE LOWER(email) = $1`,
    [cleanEmail],
  );

  if (emailCheck.rows.length === 0) {
    throw new Error(
      "No active OTP request found for this email. Please request a new code.",
    );
  }

  // 2. Check if the specific OTP matches
  const result = await db.query(
    `SELECT * FROM otp_codes 
     WHERE LOWER(email) = $1 AND TRIM(otp) = $2`,
    [cleanEmail, trimmedOtp],
  );

  if (result.rows.length === 0) {
    throw new Error("Wrong OTP code. Please check your email and try again.");
  }

  const record = result.rows[0];

  // 3. Check expiration
  if (new Date() > new Date(record.expires_at)) {
    await db.query("DELETE FROM otp_codes WHERE LOWER(email) = $1", [
      cleanEmail,
    ]);
    throw new Error("OTP code has expired. Please request a new one.");
  }

  // Clean up code after successful verification
  await db.query("DELETE FROM otp_codes WHERE LOWER(email) = $1", [cleanEmail]);

  return true;
};

// ======================================
// SUBMIT VOTE (TRANSACTION & RACE SAFE)
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

    // Lock the user record row to block concurrent double-voting attempts
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

    // Category vote increments
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

    // Save choices and update voter record
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
// GET ALL PARTICIPANTS
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
