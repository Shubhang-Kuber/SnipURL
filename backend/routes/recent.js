"use strict";

/**
 * Recent links — GET /api/recent
 *
 * The most recently created links, newest first.
 * 200 { "links": [ { "shortCode", "longUrl", "createdAt" }, ... ] }
 *
 * The `/api/*` prefix matches the other JSON endpoint the frontend calls
 * (GET /api/resolve/:code). Limit is 10: the Recent links panel is a
 * glanceable list, not a full history view.
 */

const express = require("express");
const pool = require("../db");

const router = express.Router();

// Trusted integer constant — safe to inline into the query.
const RECENT_LIMIT = 10;

router.get("/api/recent", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT short_code, long_url, created_at FROM urls " +
        "WHERE short_code IS NOT NULL " +
        "ORDER BY created_at DESC, id DESC " +
        "LIMIT " + RECENT_LIMIT
    );

    const links = rows.map((row) => ({
      shortCode: row.short_code,
      longUrl: row.long_url,
      createdAt: row.created_at,
    }));

    return res.status(200).json({ links });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
