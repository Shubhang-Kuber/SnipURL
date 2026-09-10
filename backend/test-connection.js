"use strict";

/**
 * End-to-end connection check.
 *
 *   npm run db:test
 *
 * Runs `SELECT 1 + 1` against the shared pool from db.js and logs the result.
 * Exits non-zero with a clear message if the pool cannot reach MySQL.
 */

const pool = require("./db");

async function main() {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    console.log("[db:test] Connection OK — SELECT 1 + 1 =>", rows[0].result);
  } catch (err) {
    console.error("[db:test] DATABASE CONNECTION FAILED.");
    console.error(
      "[db:test] This is a DB connectivity problem, not an application bug."
    );
    console.error(
      "[db:test] Check: MySQL80 service running, host/port/user/password in backend/.env,"
    );
    console.error("[db:test] and that the database named in DB_NAME exists.");
    console.error(`[db:test] ${err.code || err.name}: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
