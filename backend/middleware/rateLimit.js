// Simple Redis-backed rate limiter: N requests per IP per window.
// Demonstrates Redis as more than "just a cache" — an atomic counter store.
const { redisClient } = require("../config/redis");

function rateLimit({ windowSeconds = 60, maxRequests = 100 } = {}) {
  return async (req, res, next) => {
    const key = `ratelimit:${req.ip}`;
    try {
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, windowSeconds);
      }
      if (count > maxRequests) {
        return res.status(429).json({ error: "Too many requests, slow down." });
      }
    } catch (err) {
      console.error("[rateLimit] redis error, allowing request through", err);
    }
    next();
  };
}

module.exports = { rateLimit };
