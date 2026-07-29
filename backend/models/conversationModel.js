// Conversation model — stored in MongoDB because a ticket thread's shape
// varies: a message may or may not have attachments, may come from a
// customer/agent/AI, and threads can grow arbitrarily long. Forcing this
// into rigid relational columns would mean constant schema migrations —
// exactly the kind of data MongoDB's flexible documents are suited for.
const { mongoose } = require("../config/mongo");

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ["customer", "agent", "ai"], required: true },
    text: { type: String, required: true },
    attachments: [{ filename: String, url: String }],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema({
  postgresTicketId: { type: Number, required: true, index: true },
  messages: [messageSchema],
  aiSummary: { type: String, default: null },
  aiSuggestedReply: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Conversation", conversationSchema);
