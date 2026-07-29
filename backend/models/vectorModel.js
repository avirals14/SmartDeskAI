const { pool } = require("../config/postgres");
const { toPgVectorLiteral } = require("../services/embeddingService");

async function upsertEmbedding(ticketId, vector) {
  const literal = toPgVectorLiteral(vector);
  await pool.query(
    `INSERT INTO ticket_vectors (ticket_id, embedding, updated_at)
     VALUES ($1, $2::vector, NOW())
     ON CONFLICT (ticket_id) DO UPDATE SET embedding = $2::vector, updated_at = NOW()`,
    [ticketId, literal]
  );
}

// Returns tickets ordered by cosine distance (smaller = more similar) to
// the query vector, joined with their PostgreSQL ticket record.
async function findSimilarTickets(queryVector, limit = 10) {
  const literal = toPgVectorLiteral(queryVector);
  const { rows } = await pool.query(
    `SELECT t.*, (tv.embedding <=> $1::vector) AS distance
     FROM ticket_vectors tv
     JOIN tickets t ON t.id = tv.ticket_id
     ORDER BY tv.embedding <=> $1::vector
     LIMIT $2`,
    [literal, limit]
  );
  return rows;
}

module.exports = { upsertEmbedding, findSimilarTickets };
