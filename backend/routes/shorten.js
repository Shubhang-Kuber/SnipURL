"use strict";

/**
 * Create service — POST /shorten
 *
 * Body: { "url": "<http/https URL>" }
 * 201 { "shortUrl": "<base>/<code>" }  new link
 * 200 { "shortUrl": "<base>/<code>" }  URL was already shortened (existing row)
 * 400 { "error": "..." }               missing / empty / malformed URL
 */

const express = require("express");
const pool = require("../db");
const { encode } = require("../base62");

const router = express.Router();

const BASE_URL =
  process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

/**
 * Validate and normalize a candidate long URL.
 * @returns {string|null} normalized href, or null if not a valid http/https URL
 */
function normalizeLongUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  return parsed.href;
}

router.post("/shorten", async (req, res, next) => {
  try {
    const body = req.body || {};
    const raw = typeof body.url === "string" ? body.url.trim() : "";

    // Edge case: missing or empty URL — reject before any DB access.
    if (!raw) {
      return res
        .status(400)
        .json({ error: 'Request body must include a non-empty "url" field.' });
    }

    // Edge case: malformed URL — reject before any DB access.
    const longUrl = normalizeLongUrl(raw);
    if (!longUrl) {
      return res
        .status(400)
        .json({ error: `"${raw}" is not a valid http or https URL.` });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Edge case: URL already shortened — return the existing code, never a
      // duplicate row (chosen to avoid wasting keyspace). `long_url` is TEXT and
      // cannot carry a UNIQUE index, so this is a scan; acceptable because writes
      // are rare relative to reads and this is a single-instance deployment.
      const [existing] = await conn.query(
        "SELECT short_code FROM urls WHERE long_url = ? LIMIT 1",
        [longUrl]
      );
      if (existing.length > 0) {
        await conn.commit();
        return res
          .status(200)
          .json({ shortUrl: `${BASE_URL}/${existing[0].short_code}` });
      }

      // Insert-then-update: the short code is a function of the AUTO_INCREMENT
      // id, which MySQL only assigns on INSERT. The row is created first (with
      // short_code left NULL), then updated with encode(id). Wrapping both in a
      // transaction guarantees a row is never left with a NULL short_code.
      const [insert] = await conn.query(
        "INSERT INTO urls (long_url) VALUES (?)",
        [longUrl]
      );
      const shortCode = encode(insert.insertId);
      await conn.query("UPDATE urls SET short_code = ? WHERE id = ?", [
        shortCode,
        insert.insertId,
      ]);

      await conn.commit();
      return res.status(201).json({ shortUrl: `${BASE_URL}/${shortCode}` });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
