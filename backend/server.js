require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { testConnection } = require("./config/postgres");
const { connectMongo } = require("./config/mongo");
const { connectRedis } = require("./config/redis");
const { rateLimit } = require("./middleware/rateLimit");
const { hasApiKey } = require("./services/aiService");

const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/tickets");
const searchRoutes = require("./routes/search");
const dashboardRoutes = require("./routes/dashboard");

const app = express();
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowSeconds: 60, maxRequests: 200 }));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    aiMode: hasApiKey ? "live (Groq API)" : "mock (no GROQ_API_KEY set)",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 4000;

async function start() {
  await testConnection();
  await connectMongo();
  await connectRedis();

  app.listen(PORT, () => {
    console.log(`[server] SmartDesk AI backend running on http://localhost:${PORT}`);
    console.log(`[server] AI mode: ${hasApiKey ? "live" : "mock fallback"}`);
  });
}

start().catch((err) => {
  console.error("[server] failed to start", err);
  process.exit(1);
});
