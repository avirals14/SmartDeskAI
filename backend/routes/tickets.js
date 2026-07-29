const express = require("express");
const router = express.Router();

const ticketModel = require("../models/ticketModel");
const Conversation = require("../models/conversationModel");
const { redisClient } = require("../config/redis");
const { cacheMiddleware, invalidateTicketCaches } = require("../middleware/cache");
const { requireAuth, requireRole } = require("../middleware/auth");

const AI_QUEUE_KEY = "queue:ai_jobs";

// All ticket routes require a signed-in user.
router.use(requireAuth);

// GET /api/tickets?status=open&priority=high
// Cached in Redis for 15s — ticket lists are read far more than they change.
router.get("/", cacheMiddleware(15), async (req, res) => {
  try {
    const { status, priority } = req.query;
    const tickets = await ticketModel.listTickets({ status, priority });
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list tickets" });
  }
});

// GET /api/tickets/:id  — full ticket + its Mongo conversation thread
router.get("/:id", async (req, res) => {
  try {
    const ticket = await ticketModel.getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Not found" });

    const conversation = await Conversation.findOne({ postgresTicketId: ticket.id });
    res.json({ ticket, conversation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

// POST /api/tickets  { userId, subject, message }
// This is the "data pipeline" entry point:
//   1. Write structured record -> Postgres
//   2. Write conversation doc  -> MongoDB
//   3. Queue an AI job         -> Redis list (consumed by worker/aiWorker.js)
router.post("/", async (req, res) => {
  try {
    const { subject, message } = req.body;
    const userId = req.user.sub; // the ticket always belongs to the authenticated user
    if (!subject || !message) {
      return res.status(400).json({ error: "subject and message are required" });
    }

    const conversation = await Conversation.create({
      postgresTicketId: -1, // patched below once we know the Postgres id
      messages: [{ sender: "customer", text: message }],
    });

    const ticket = await ticketModel.createTicket({
      userId,
      subject,
      mongoThreadId: conversation._id.toString(),
    });

    conversation.postgresTicketId = ticket.id;
    await conversation.save();

    await redisClient.lPush(AI_QUEUE_KEY, JSON.stringify({ ticketId: ticket.id }));
    await invalidateTicketCaches();

    res.status(201).json({ ticket, conversation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// PATCH /api/tickets/:id/status  { status }  — agents/admins only
router.patch("/:id/status", requireRole("agent", "admin"), async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await ticketModel.updateStatus(req.params.id, status);
    await invalidateTicketCaches();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// POST /api/tickets/:id/messages  { sender, text }
// Adds a message to the Mongo thread and re-queues for an updated AI summary.
router.post("/:id/messages", async (req, res) => {
  try {
    const { text } = req.body;
    // Sender is derived from the authenticated user's role, not client input,
    // so a customer account can't post messages that appear to come from an agent.
    const sender = req.user.role === "customer" ? "customer" : "agent";
    const conversation = await Conversation.findOneAndUpdate(
      { postgresTicketId: req.params.id },
      { $push: { messages: { sender, text } } },
      { new: true }
    );
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    await redisClient.lPush(AI_QUEUE_KEY, JSON.stringify({ ticketId: Number(req.params.id) }));
    res.json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add message" });
  }
});

module.exports = router;
