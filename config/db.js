// config/db.js
const { Pool } = require("pg");
require("dotenv").config();

// Determine if running in production or using a remote database URL
const isProduction =
  process.env.NODE_ENV === "production" || !!process.env.DATABASE_URL;

const pool = isProduction
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Required for hosted databases like Render/Supabase
      },
    })
  : new Pool({
      user: process.env.DB_USER || "postgres",
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "voting_db",
      password: String(process.env.DB_PASSWORD || ""), // Guarantees a string type for pg SASL auth
      port: Number(process.env.DB_PORT) || 5432,
    });

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
};
