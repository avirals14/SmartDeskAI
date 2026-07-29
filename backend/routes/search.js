const express = require("express");
const router = express.Router();
const Conversation = require("../models/conversationModel");
const ticketModel = require("../models/ticketModel");
const vectorModel = require("../models/vectorModel");
const { embed } = require("../services/embeddingService");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// GET /api/search?q=refund
// Keyword search over MongoDB conversation text + AI summaries.
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);

    const regex = new RegExp(q, "i");
    const matches = await Conversation.find({
      $or: [{ "messages.text": regex }, { aiSummary: regex }],
    }).limit(20);

    const results = await Promise.all(
      matches.map(async (c) => ({
        ticket: await ticketModel.getTicketById(c.postgresTicketId),
        matchedSummary: c.aiSummary,
      }))
    );

    res.json(results.filter((r) => r.ticket));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

// GET /api/search/semantic?q=cant+access+my+account
// Vector similarity search: embeds the query the same way ticket text was
// embedded by the AI worker, then finds the closest tickets in PostgreSQL
// via pgvector's cosine-distance operator. Unlike the keyword endpoint
// above, this can match tickets that don't share exact words with the
// query (e.g. "cant access my account" matching a ticket about "login
// error"), because both are hashed into overlapping vector buckets by
// shared/related tokens rather than requiring an exact substring match.
router.get("/semantic", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);

    const queryVector = embed(q);
    const rows = await vectorModel.findSimilarTickets(queryVector, 10);

    res.json(
      rows.map((r) => ({
        ticket: r,
        similarity: Math.max(0, 1 - r.distance), // cosine distance -> similarity, clamped at 0
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Semantic search failed" });
  }
});

module.exports = router;
