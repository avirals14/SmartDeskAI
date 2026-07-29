// Data ingestion pipeline — the "robust data pipelines" piece from the
// certificate. Takes raw, untrusted-shaped ticket data (imagine this coming
// from a CSV export, a webhook, or a legacy system) and:
//
//   1. VALIDATES each record (reject malformed rows instead of crashing)
//   2. Ensures a Postgres `users` row exists for the customer (relational identity)
//   3. Writes the structured ticket record -> PostgreSQL
//   4. Writes the raw conversation          -> MongoDB
//   5. Queues an AI processing job          -> Redis
//
// Run with: npm run seed

require("dotenv").config();
const fs = require("fs");
const path = require("path");

const { pool, testConnection } = require("../config/postgres");
const { connectMongo } = require("../config/mongo");
const { connectRedis, redisClient } = require("../config/redis");
const Conversation = require("../models/conversationModel");
const ticketModel = require("../models/ticketModel");

const AI_QUEUE_KEY = "queue:ai_jobs";

function validateRecord(record, index) {
  const errors = [];
  if (!record.customerName || typeof record.customerName !== "string") errors.push("missing customerName");
  if (!record.customerEmail || !record.customerEmail.includes("@")) errors.push("invalid customerEmail");
  if (!record.subject || record.subject.length < 3) errors.push("subject too short");
  if (!record.message || record.message.length < 3) errors.push("message too short");

  if (errors.length) {
    console.warn(`[pipeline] skipping record #${index}: ${errors.join(", ")}`);
    return false;
  }
  return true;
}

async function getOrCreateUser(name, email) {
  const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  if (existing.rows.length) return existing.rows[0];

  const { rows } = await pool.query(
    `INSERT INTO users (name, email, role) VALUES ($1, $2, 'customer') RETURNING *`,
    [name, email]
  );
  return rows[0];
}

async function ingestRecord(record) {
  const user = await getOrCreateUser(record.customerName, record.customerEmail);

  const conversation = await Conversation.create({
    postgresTicketId: -1,
    messages: [{ sender: "customer", text: record.message }],
  });

  const ticket = await ticketModel.createTicket({
    userId: user.id,
    subject: record.subject,
    mongoThreadId: conversation._id.toString(),
  });

  conversation.postgresTicketId = ticket.id;
  await conversation.save();

  await redisClient.lPush(AI_QUEUE_KEY, JSON.stringify({ ticketId: ticket.id }));

  console.log(`[pipeline] ingested ticket #${ticket.id} ("${ticket.subject}") for ${user.email}`);
}

async function main() {
  await testConnection();
  await connectMongo();
  await connectRedis();

  const rawPath = path.join(__dirname, "..", "sampledata", "raw_tickets.json");
  const raw = JSON.parse(fs.readFileSync(rawPath, "utf-8"));

  console.log(`[pipeline] loaded ${raw.length} raw records, validating...`);

  let ingested = 0;
  for (let i = 0; i < raw.length; i++) {
    if (!validateRecord(raw[i], i)) continue;
    await ingestRecord(raw[i]);
    ingested++;
  }

  console.log(`[pipeline] done. ${ingested}/${raw.length} records ingested and queued for AI processing.`);
  console.log(`[pipeline] now run "npm run worker" (in another terminal) to process the AI queue.`);

  process.exit(0);
}

main().catch((err) => {
  console.error("[pipeline] fatal error", err);
  process.exit(1);
});
