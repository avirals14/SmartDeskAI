// AI service — the "artificial intelligence" layer referenced on the
// certificate. Uses the Groq LLM API to:
//   1. Classify a ticket's priority + category
//   2. Summarize a conversation thread
//   3. Draft a suggested agent reply
//
// If no API key is configured, falls back to a simple rule-based mock so
// the whole pipeline still runs end-to-end for a live demo without
// requiring anyone to share billing/API keys during a faculty presentation.

const Groq = require("groq-sdk");

const groqApiKey = process.env.GROQ_API_KEY;
const hasApiKey = Boolean(groqApiKey);
const client = hasApiKey ? new Groq({ apiKey: groqApiKey }) : null;

const URGENT_WORDS = ["urgent", "asap", "down", "outage", "critical", "not working", "broken"];

function mockClassify(subject, firstMessage) {
  const text = `${subject} ${firstMessage}`.toLowerCase();
  const isUrgent = URGENT_WORDS.some((w) => text.includes(w));
  let category = "general";
  if (text.includes("bill") || text.includes("payment") || text.includes("refund")) category = "billing";
  else if (text.includes("login") || text.includes("password") || text.includes("access")) category = "account";
  else if (text.includes("bug") || text.includes("error") || text.includes("crash")) category = "technical";

  return {
    priority: isUrgent ? "urgent" : "medium",
    category,
    reasoning: "mock classifier (no GROQ_API_KEY set)",
  };
}

async function callGroq(prompt, maxTokens) {
  if (!client) return null;

  try {
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: maxTokens,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("[aiService] Groq request failed", err);
    return null;
  }
}

async function classifyTicket(subject, firstMessage) {
  if (!client) return mockClassify(subject, firstMessage);

  const prompt = `Classify this support ticket. Respond ONLY with JSON in this exact shape:
{"priority": "low|medium|high|urgent", "category": "billing|account|technical|general", "reasoning": "one short sentence"}

Subject: ${subject}
Message: ${firstMessage}`;

  const text = await callGroq(prompt, 200);
  if (!text) {
    console.error("[aiService] failed to parse classification, falling back");
    return mockClassify(subject, firstMessage);
  }

  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (err) {
    console.error("[aiService] failed to parse classification, falling back", err);
    return mockClassify(subject, firstMessage);
  }
}

async function summarizeAndSuggestReply(messages) {
  const transcript = messages.map((m) => `${m.sender}: ${m.text}`).join("\n");

  if (!client) {
    return {
      summary: `Thread with ${messages.length} message(s). (mock summary — no GROQ_API_KEY set)`,
      suggestedReply: "Thanks for reaching out — a member of our team will follow up shortly.",
    };
  }

  const prompt = `Here is a support ticket conversation:
${transcript}

Respond ONLY with JSON in this exact shape:
{"summary": "2-3 sentence summary of the issue", "suggestedReply": "a short, polite draft reply an agent could send"}`;

  const text = await callGroq(prompt, 400);
  if (!text) {
    return {
      summary: `Thread with ${messages.length} message(s). (fallback — could not parse AI response)`,
      suggestedReply: "Thanks for reaching out — a member of our team will follow up shortly.",
    };
  }

  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (err) {
    console.error("[aiService] failed to parse summary, falling back", err);
    return {
      summary: `Thread with ${messages.length} message(s). (fallback — could not parse AI response)`,
      suggestedReply: "Thanks for reaching out — a member of our team will follow up shortly.",
    };
  }
}

module.exports = { classifyTicket, summarizeAndSuggestReply, hasApiKey };
