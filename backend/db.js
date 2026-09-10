"use strict";

/**
 * MySQL connection layer for SnipURL.
 *
 * Exports a single mysql2/promise connection pool, configured entirely from
 * backend/.env. Nothing sensitive is hardcoded here. Import this module wherever
 * a database handle is needed:
 *
 *   const pool = require("./db");
 *   const [rows] = await pool.query("SELECT ...");
 */

const path = require("path");
const mysql = require("mysql2/promise");

// Pin dotenv to backend/.env so the values load no matter what directory the
// process is started from.
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const REQUIRED_VARS = ["DB_HOST", "DB_USER", "DB_NAME"];
const missing = REQUIRED_VARS.filter((name) => !process.env[name]);

if (missing.length > 0) {
  throw new Error(
    "[db] Database configuration is incomplete. Missing environment " +
      `variable(s): ${missing.join(", ")}. Copy backend/.env.example to ` +
      "backend/.env and fill in the values."
  );
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  // DB_PASSWORD is intentionally allowed to be empty for local root logins.
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,

  // Local-development pool sizing.
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
