const db = require("../config/db");

exports.getKing = async () => {
  const { rows } = await db.query(
    "SELECT * FROM participants WHERE LOWER(gender) = 'boy' ORDER BY \"kingVotes\" DESC LIMIT 1"
  );
  return rows[0] || null;
};

exports.getQueen = async () => {
  const { rows } = await db.query(
    "SELECT * FROM participants WHERE LOWER(gender) = 'girl' ORDER BY \"queenVotes\" DESC LIMIT 1"
  );
  return rows[0] || null;
};

exports.getWinners = async () => {
  try {
    const king = await db.query(
      "SELECT * FROM participants WHERE LOWER(gender) = 'boy' ORDER BY \"kingVotes\" DESC LIMIT 1"
    );
    const queen = await db.query(
      "SELECT * FROM participants WHERE LOWER(gender) = 'girl' ORDER BY \"queenVotes\" DESC LIMIT 1"
    );
    const mrSmart = await db.query(
      "SELECT * FROM participants WHERE LOWER(gender) = 'boy' ORDER BY \"smartVotes\" DESC LIMIT 1"
    );
    const msStyle = await db.query(
      "SELECT * FROM participants WHERE LOWER(gender) = 'girl' ORDER BY \"styleVotes\" DESC LIMIT 1"
    );
    const mrPopular = await db.query(
      "SELECT * FROM participants WHERE LOWER(gender) = 'boy' ORDER BY \"boyPopularVotes\" DESC LIMIT 1"
    );
    const msPopular = await db.query(
      "SELECT * FROM participants WHERE LOWER(gender) = 'girl' ORDER BY \"girlPopularVotes\" DESC LIMIT 1"
    );

    return {
      king: king.rows[0] || null,
      queen: queen.rows[0] || null,
      mrSmart: mrSmart.rows[0] || null,
      msStyle: msStyle.rows[0] || null,
      mrPopular: mrPopular.rows[0] || null,
      msPopular: msPopular.rows[0] || null,
    };
  } catch (err) {
    console.error("DETAILED GETWINNERS ERROR:", err.message);
    throw err;
  }
};

exports.createParticipant = async (name, photo, description, gender, hobby, hometown) => {
  const query = `
    INSERT INTO participants (name, photo, description, gender, hobby, hometown)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
  `;
  const { rows } = await db.query(query, [
    name,
    photo || null,
    description || null,
    gender || "boy",
    hobby || null,
    hometown || null,
  ]);
  return rows[0];
};

exports.deleteParticipant = async (id) => {
  await db.query("DELETE FROM participants WHERE id = $1", [id]);
};

exports.updateParticipant = async (id, name, photo, description, gender, hobby, hometown) => {
  if (photo) {
    const query = `
      UPDATE participants 
      SET name = $1, photo = $2, description = $3, gender = $4, hobby = $5, hometown = $6 
      WHERE id = $7 
      RETURNING *;
    `;
    const { rows } = await db.query(query, [name, photo, description || null, gender || "boy", hobby || null, hometown || null, id]);
    return rows[0];
  } else {
    const query = `
      UPDATE participants 
      SET name = $1, description = $2, gender = $3, hobby = $4, hometown = $5 
      WHERE id = $6 
      RETURNING *;
    `;
    const { rows } = await db.query(query, [name, description || null, gender || "boy", hobby || null, hometown || null, id]);
    return rows[0];
  }
};

exports.getTotalVotes = async () => {
  const query = `
    SELECT 
      (SELECT COUNT(*) FROM voted_users) AS total_voters,
      (SELECT COALESCE(SUM("kingVotes" + "queenVotes" + "smartVotes" + "styleVotes" + "boyPopularVotes" + "girlPopularVotes"), 0) FROM participants) AS total_votes,
      (SELECT COALESCE(MAX("kingVotes"), 0) FROM participants WHERE LOWER(gender) = 'boy') AS total_king_votes,
      (SELECT COALESCE(MAX("queenVotes"), 0) FROM participants WHERE LOWER(gender) = 'girl') AS total_queen_votes,
      (SELECT COALESCE(MAX("smartVotes"), 0) FROM participants WHERE LOWER(gender) = 'boy') AS total_smart_votes,
      (SELECT COALESCE(MAX("styleVotes"), 0) FROM participants WHERE LOWER(gender) = 'girl') AS total_style_votes,
      (SELECT COALESCE(MAX("boyPopularVotes"), 0) FROM participants WHERE LOWER(gender) = 'boy') AS total_boy_popular_votes,
      (SELECT COALESCE(MAX("girlPopularVotes"), 0) FROM participants WHERE LOWER(gender) = 'girl') AS total_girl_popular_votes
    FROM participants;
  `;
  const { rows } = await db.query(query);
  return rows[0];
};

exports.getSettings = async () => {
  const { rows } = await db.query("SELECT * FROM settings WHERE id = 1");
  return rows[0];
};

exports.updateSettings = async (data) => {
  const fields = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`"${key}" = $${index++}`);
      values.push(value);
    }
  }

  if (fields.length === 0) return;

  values.push(1); // For WHERE id = 1
  const query = `UPDATE settings SET ${fields.join(", ")} WHERE id = $${index}`;
  await db.query(query, values);
};

exports.updateCountdownService = async ({ target_time, duration, countdown_status }) => {
    let validTargetTime;
    if (!target_time || isNaN(Number(target_time))) {
        validTargetTime = new Date();
    } else {
        validTargetTime = new Date(Number(target_time));
    }

    const isOpen = countdown_status === 'running';

    const query = `
        UPDATE settings 
        SET target_time = $1, duration = $2, countdown_status = $3, is_voting_open = $4 
        WHERE id = 1
    `;
    return await db.query(query, [validTargetTime, duration, countdown_status, isOpen]);
};

exports.updateCountdownStatusService = async (status) => {
    const isOpen = status === 'running';

    if (status === 'Reset') {
        return await db.query(
            `UPDATE settings SET countdown_status = $1, target_time = NULL, duration = NULL, is_voting_open = $2 WHERE id = 1`,
            [status, isOpen]
        );
    }
    return await db.query(
        `UPDATE settings SET countdown_status = $1, is_voting_open = $2 WHERE id = 1`,
        [status, isOpen]
    );
};

exports.getVoteRecords = async () => {
  const query = `
    SELECT id, email, has_voted, voted_at 
    FROM voted_users 
    ORDER BY voted_at DESC NULLS LAST;
  `;
  const { rows } = await db.query(query);
  return rows;
};
exports.getTopThreeResults = async () => {
  const categories = [
    { key: 'king', col: '"kingVotes"', gender: 'boy' },
    { key: 'queen', col: '"queenVotes"', gender: 'girl' },
    { key: 'smart', col: '"smartVotes"', gender: 'boy' },
    { key: 'style', col: '"styleVotes"', gender: 'girl' },
    { key: 'boyPopular', col: '"boyPopularVotes"', gender: 'boy' },
    { key: 'girlPopular', col: '"girlPopularVotes"', gender: 'girl' }
  ];

  const results = {};

  for (const cat of categories) {
    const query = `
      SELECT name, ${cat.col} AS votes 
      FROM participants 
      WHERE LOWER(gender) = $1
      ORDER BY ${cat.col} DESC 
      LIMIT 3;
    `;
    const { rows } = await db.query(query, [cat.gender]);
    
    const totalQuery = `SELECT SUM(${cat.col}) AS total FROM participants WHERE LOWER(gender) = $1;`;
    const totalRes = await db.query(totalQuery, [cat.gender]);
    const totalCatVotes = Number(totalRes.rows[0]?.total) || 1; 

    results[cat.key] = rows.map(row => ({
      name: row.name,
      votes: Number(row.votes),
      percentage: Math.round((Number(row.votes) / totalCatVotes) * 100)
    }));
  }

  return results;
};