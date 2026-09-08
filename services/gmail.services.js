const db = require("../config/db");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();


// ======================================
// SEND OTP
// ======================================
exports.sendOtpService = async (email) => {
  console.log("1. Checking existing user in DB...");
  const existingUser = await db.query(
    "SELECT * FROM voted_users WHERE LOWER(email) = LOWER($1)",
    [email.trim()]
  );
  console.log("2. DB check complete.");

  if (existingUser.rows.length > 0) {
    const userRecord = existingUser.rows[0];
    if (userRecord.has_voted === true || userRecord.king_id !== null) {
      throw new Error("This email has already voted. OTP request denied.");
    }
  }

  // Generate OTP
  const otp = generateOTP();

  // OTP expires after 5 minutes
  const expiresAt = new Date(
    Date.now() + 5 * 60 * 1000
  );
  

  console.log("3. Clearing and saving OTP to DB...");
  // Clear out any old active OTP and save the new one instantly
  await db.query("DELETE FROM otp_codes WHERE email = $1", [email]);

  await db.query(
    `INSERT INTO otp_codes
    (email, otp, expires_at)
    VALUES ($1, $2, $3)`,
    [email, otp, expiresAt]
  );
  console.log("4. OTP saved. Triggering Nodemailer sendMail...");

  // Send OTP email
  await transporter.sendMail({
    from: '"CodeaSquad Voting System" <' + process.env.EMAIL_USER + '>',
    to: email,
    subject: "Voting Verification Code",
    html: `
      <h3>Your OTP Code is <b>${otp}</b></h3>
      <p>This code will expire in 5 minutes.</p>
    `
  });

  console.log("5. Email sent successfully!");
  return "OTP code sent successfully to your email.";
};

// ======================================
// VERIFY OTP
// ======================================
exports.verifyOtpService = async (email, otp) => {
  const trimmedEmail = email.trim();
  const trimmedOtp = String(otp).trim();

  // 1. Check if email exists in otp_codes at all
  const emailCheck = await db.query(
    `SELECT * FROM otp_codes WHERE LOWER(email) = LOWER($1)`,
    [trimmedEmail]
  );

  if (emailCheck.rows.length === 0) {
    throw new Error("No active OTP request found for this email. Please request a new code.");
  }

  // 2. Check if the specific OTP matches
  const result = await db.query(
    `SELECT * FROM otp_codes 
     WHERE LOWER(email) = LOWER($1) AND TRIM(otp) = TRIM($2)`,
    [trimmedEmail, trimmedOtp]
  );

  if (result.rows.length === 0) {
    throw new Error("Wrong OTP code. Please check your email and try again.");
  }

  const record = result.rows[0];

  // 3. Check expiration
  if (new Date() > new Date(record.expires_at)) {
    await db.query("DELETE FROM otp_codes WHERE email = $1", [trimmedEmail]);
    throw new Error("OTP code has expired. Please request a new one.");
  }

  // Clean up code after successful verification
  await db.query("DELETE FROM otp_codes WHERE email = $1", [trimmedEmail]);

  return true;
};
// ======================================
// SUBMIT VOTE (TRANSACTION SAFE)
// ======================================
exports.submitVote = async ({
  email,
  kingId,
  queenId,
  mrSmartId,
  msStyleId,
  mrPopularId,
  msPopularId
}) => {

  if (!email) {
    throw new Error("Email is required.");
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const existingVote = await client.query(
      `SELECT id, has_voted 
       FROM voted_users 
       WHERE email = $1`,
      [email]
    );

    if (existingVote.rows.length > 0) {
      const user = existingVote.rows[0];
      if (user.has_voted) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: "You have already voted. Multiple submissions are not allowed."
        };
      }
    } else {
      await client.query('ROLLBACK');
      return {
        success: false,
        message: "Unauthorized vote attempt. Please verify via OTP first."
      };
    }

    // KING
    if (kingId) {
      await client.query(
        `UPDATE participants
         SET "kingVotes" = "kingVotes" + 1
         WHERE id = $1`,
        [kingId]
      );
    }

    // QUEEN
    if (queenId) {
      await client.query(
        `UPDATE participants
         SET "queenVotes" = "queenVotes" + 1
         WHERE id = $1`,
        [queenId]
      );
    }

    // MR SMART
    if (mrSmartId) {
      await client.query(
        `UPDATE participants
         SET "smartVotes" = "smartVotes" + 1
         WHERE id = $1`,
        [mrSmartId]
      );
    }

    // MS STYLE
    if (msStyleId) {
      await client.query(
        `UPDATE participants
         SET "styleVotes" = "styleVotes" + 1
         WHERE id = $1`,
        [msStyleId]
      );
    }

    // MR POPULAR
    if (mrPopularId) {
      await client.query(
        `UPDATE participants
         SET "boyPopularVotes" = "boyPopularVotes" + 1
         WHERE id = $1`,
        [mrPopularId]
      );
    }

    // MS POPULAR
    if (msPopularId) {
      await client.query(
        `UPDATE participants
         SET "girlPopularVotes" = "girlPopularVotes" + 1
         WHERE id = $1`,
        [msPopularId]
      );
    }

    // SAVE VOTE IN voted_users (UPDATE OR INSERT)
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
        email,
        kingId || null,
        queenId || null,
        mrSmartId || null,
        msStyleId || null,
        mrPopularId || null,
        msPopularId || null
      ]
    );

    await client.query('COMMIT');
    return {
      success: true,
      message: "Vote submitted successfully."
    };
  } catch (err) {
    await client.query('ROLLBACK');
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