"use strict";

/**
 * Retrieve service.
 *
 * GET /:shortCode            302 (temporary) redirect to the long URL, or
 *                            404 { "error": "..." } when the code is unknown.
 *
 * GET /api/resolve/:shortCode
 *                            200 { "shortCode", "longUrl" } — JSON lookup used by
 *                            the in-app "Retrieve" preview. Separate from the bare
 *                            redirect because a browser fetch() cannot read the
 *                            Location header of a 302 without navigating away.
 *                            400 malformed code, 404 unknown code.
 */

const express = require("express");
const pool = require("../db");
const { isValidShortCode } = require("../base62");

const router = express.Router();

/**
 * Look up a long URL by short code. Indexed lookup on the UNIQUE `short_code`
 * column — no full table scan.
 * @returns {Promise<string|null>}
 */
async function resolveShortCode(code) {
  const [rows] = await pool.query(
    "SELECT long_url FROM urls WHERE short_code = ? LIMIT 1",
    [code]
  );
  return rows.length > 0 ? rows[0].long_url : null;
}

router.get("/api/resolve/:shortCode", async (req, res, next) => {
  try {
    const code = req.params.shortCode;
    if (!isValidShortCode(code)) {
      return res
        .status(400)
        .json({ error: `"${code}" is not a valid short code.` });
    }
    const longUrl = await resolveShortCode(code);
    if (!longUrl) {
      return res
        .status(404)
        .json({ error: `No short link found for code "${code}".` });
    }
    return res.status(200).json({ shortCode: code, longUrl });
  } catch (err) {
    next(err);
  }
});

router.get("/:shortCode", async (req, res, next) => {
  try {
    const code = req.params.shortCode;
    if (!isValidShortCode(code)) {
      return res
        .status(404)
        .json({ error: `No short link found for code "${code}".` });
    }
    const longUrl = await resolveShortCode(code);
    if (!longUrl) {
      return res
        .status(404)
        .json({ error: `No short link found for code "${code}".` });
    }
    return res.redirect(302, longUrl);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
