// Ticket model — talks directly to PostgreSQL with plain SQL.
// Kept ORM-free on purpose: when you present this to faculty, you can point
// at the exact SQL running for every operation.
const { pool } = require("../config/postgres");

async function createTicket({ userId, subject, mongoThreadId }) {
  const { rows } = await pool.query(
    `INSERT INTO tickets (user_id, subject, mongo_thread_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, subject, mongoThreadId]
  );
  return rows[0];
}

async function getTicketById(id) {
  const { rows } = await pool.query(`SELECT * FROM tickets WHERE id = $1`, [id]);
  return rows[0];
}

async function listTickets({ status, priority } = {}) {
  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  if (priority) {
    values.push(priority);
    conditions.push(`priority = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT * FROM tickets ${where} ORDER BY created_at DESC`,
    values
  );
  return rows;
}

async function updateAiFields(id, { priority, category, aiProcessed }) {
  const { rows } = await pool.query(
    `UPDATE tickets
     SET priority = $1, category = $2, ai_processed = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [priority, category, aiProcessed, id]
  );
  return rows[0];
}

async function updateStatus(id, status) {
  const { rows } = await pool.query(
    `UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return rows[0];
}

module.exports = {
  createTicket,
  getTicketById,
  listTickets,
  updateAiFields,
  updateStatus,
};
