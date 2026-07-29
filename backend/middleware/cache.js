// Redis read-through cache for GET requests.
// Pattern: check cache -> if hit, return immediately -> if miss, let the
// route handler run and capture its JSON response into Redis with a TTL.
const { redisClient } = require("../config/redis");

function cacheMiddleware(ttlSeconds = 15) {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      console.error("[cache] read error, continuing without cache", err);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      redisClient
        .set(key, JSON.stringify(body), { EX: ttlSeconds })
        .catch((err) => console.error("[cache] write error", err));
      res.setHeader("X-Cache", "MISS");
      return originalJson(body);
    };

    next();
  };
}

// Call this whenever ticket data changes, so stale cached lists don't linger.
async function invalidateTicketCaches() {
  const keys = await redisClient.keys("cache:/api/tickets*");
  if (keys.length) await redisClient.del(keys);
}

module.exports = { cacheMiddleware, invalidateTicketCaches };
