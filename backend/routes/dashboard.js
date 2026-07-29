const express = require("express");
const router = express.Router();
const { pool } = require("../config/postgres");
const { requireAuth } = require("../middleware/auth");
const { cacheMiddleware } = require("../middleware/cache");

router.use(requireAuth);

// GET /api/dashboard/summary
// A handful of GROUP BY aggregations over the PostgreSQL tickets table.
// Cached briefly since dashboards are read far more often than the
// underlying data changes.
router.get("/summary", cacheMiddleware(20), async (req, res) => {
  try {
    const [byStatus, byPriority, byCategory, totals, recentVolume] = await Promise.all([
      pool.query(`SELECT status, COUNT(*)::int AS count FROM tickets GROUP BY status`),
      pool.query(`SELECT priority, COUNT(*)::int AS count FROM tickets GROUP BY priority`),
      pool.query(`SELECT category, COUNT(*)::int AS count FROM tickets GROUP BY category ORDER BY count DESC LIMIT 8`),
      pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE ai_processed)::int AS processed FROM tickets`),
      pool.query(`
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
        FROM tickets
        WHERE created_at >= NOW() - INTERVAL '14 days'
        GROUP BY day
        ORDER BY day
      `),
    ]);

    res.json({
      byStatus: byStatus.rows,
      byPriority: byPriority.rows,
      byCategory: byCategory.rows,
      totals: totals.rows[0],
      recentVolume: recentVolume.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to compute dashboard summary" });
  }
});

module.exports = router;
