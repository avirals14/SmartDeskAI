// AI worker — a standalone process that consumes ticket jobs from the
// Redis queue and does the actual AI processing asynchronously, so ticket
// creation (POST /api/tickets) stays fast and never blocks on an AI call.
//
// This is the core of the "data pipeline": Redis (queue) -> AI service ->
// Postgres (structured fields) + MongoDB (summary/reply) get updated.
//
// Run with: npm run worker

require("dotenv").config();
const { pool, testConnection } = require("../config/postgres");
const { connectMongo } = require("../config/mongo");
const { connectRedis, redisClient } = require("../config/redis");
const Conversation = require("../models/conversationModel");
const ticketModel = require("../models/ticketModel");
const vectorModel = require("../models/vectorModel");
const { classifyTicket, summarizeAndSuggestReply } = require("../services/aiService");
const { embed } = require("../services/embeddingService");

const AI_QUEUE_KEY = "queue:ai_jobs";

async function processJob(job) {
  const { ticketId } = job;
  console.log(`[worker] processing ticket ${ticketId}`);

  const ticket = await ticketModel.getTicketById(ticketId);
  const conversation = await Conversation.findOne({ postgresTicketId: ticketId });
  if (!ticket || !conversation) {
    console.warn(`[worker] ticket ${ticketId} or its conversation missing, skipping`);
    return;
  }

  const firstMessage = conversation.messages[0]?.text || "";
  const classification = await classifyTicket(ticket.subject, firstMessage);
  const { summary, suggestedReply } = await summarizeAndSuggestReply(conversation.messages);

  await ticketModel.updateAiFields(ticketId, {
    priority: classification.priority,
    category: classification.category,
    aiProcessed: true,
  });

  conversation.aiSummary = summary;
  conversation.aiSuggestedReply = suggestedReply;
  await conversation.save();

  // Embed the subject + summary + full thread text and store it in
  // PostgreSQL (pgvector) so /api/search/semantic can find similar tickets
  // later. Recomputed on every processing pass, so the vector always
  // reflects the latest conversation state.
  const fullText = [
    ticket.subject,
    summary,
    ...conversation.messages.map((m) => m.text),
  ].join(" ");
  const vector = embed(fullText);
  await vectorModel.upsertEmbedding(ticketId, vector);

  console.log(`[worker] ticket ${ticketId} classified as ${classification.category}/${classification.priority}, embedding stored`);
}

async function main() {
  await testConnection();
  await connectMongo();
  await connectRedis();

  console.log("[worker] listening on queue:", AI_QUEUE_KEY);

  // Blocking pop: waits up to 5s for a job, then loops again. This keeps
  // the worker idle (no busy-polling) while staying responsive to new jobs.
  while (true) {
    try {
      const result = await redisClient.blPop(AI_QUEUE_KEY, 5);
      if (!result) continue; // timed out, loop again
      const job = JSON.parse(result.element);
      await processJob(job);
    } catch (err) {
      console.error("[worker] error processing job", err);
    }
  }
}

main().catch((err) => {
  console.error("[worker] fatal error", err);
  process.exit(1);
});
