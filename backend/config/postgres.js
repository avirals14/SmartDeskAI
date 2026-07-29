// PostgreSQL connection — structured, relational storage for users & tickets.
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PG_HOST || "localhost",
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || "smartdesk",
  password: process.env.PG_PASSWORD || "smartdesk_pass",
  database: process.env.PG_DATABASE || "smartdesk",
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("[postgres] unexpected error on idle client", err);
});

async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.log("[postgres] connected");
  } finally {
    client.release();
  }
}

module.exports = { pool, testConnection };
