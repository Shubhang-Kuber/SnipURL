"use strict";

/**
 * SnipURL HTTP server.
 *
 * Serves the static frontend and the two services:
 *   POST /shorten               create a short link
 *   GET  /api/resolve/:code     resolve a short link (JSON, for the UI preview)
 *   GET  /:code                 302 redirect to the destination
 */

// Require db.js first: it loads backend/.env (via dotenv) before we read PORT.
const pool = require("./db");

const path = require("path");
const express = require("express");

const shortenRoute = require("./routes/shorten");
const retrieveRoute = require("./routes/retrieve");
const recentRoute = require("./routes/recent");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Static frontend (index.html, app.js, styles.css) at the site root.
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Services — separate route handlers. The bare GET /:shortCode redirect in
// retrieveRoute is a catch-all, so it is mounted last.
app.use("/", shortenRoute);
app.use("/", recentRoute);
app.use("/", retrieveRoute);

// Unmatched route — explicit JSON 404, never a silent hang.
app.use((req, res) => {
  res
    .status(404)
    .json({ error: `Not found: ${req.method} ${req.originalUrl}` });
});

// Central error handler — every thrown or rejected handler lands here.
app.use((err, req, res, _next) => {
  console.error(
    `[server] Unhandled error on ${req.method} ${req.originalUrl}:`,
    err
  );
  res.status(500).json({ error: "Internal server error." });
});

async function start() {
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    console.error(
      "[server] FATAL: cannot reach MySQL. Is the server running, and is backend/.env correct?"
    );
    console.error(`[server] ${err.code || err.name}: ${err.message}`);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[server] SnipURL listening on http://localhost:${PORT}`);
  });
}

start();
