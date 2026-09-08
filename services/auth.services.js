const db = require("../config/db");

exports.isAdmin = async (name, email, password) => {
  const query = `
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3) RETURNING id, name, email;
  `;
  const { rows } = await db.query(query, [name, email, password]);
  return rows[0];
};
exports.findByEmail = async (email) => {
  const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  return rows[0];
};
