// Redis connection — used for three distinct purposes in this project:
//   1. Caching   -> GET /api/tickets results cached for a few seconds
//   2. Job queue -> new tickets pushed to a list, consumed by the AI worker
//   3. Rate limit -> per-IP request counters with TTL
const { createClient } = require("redis");

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("[redis] error", err));

async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("[redis] connected");
  }
}

module.exports = { redisClient, connectRedis };
