"use strict";

/**
 * One-shot schema setup.
 *
 * Creates the database named in backend/.env (if it does not exist) and applies
 * backend/schema.sql. Safe to run more than once — the schema uses
 * CREATE TABLE IF NOT EXISTS.
 *
 *   npm run db:setup
 *
 * This does not use the shared pool from db.js because it needs to connect
 * without a database selected in order to create it.
 */

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

async function main() {
  const dbName = process.env.DB_NAME;
  if (!process.env.DB_HOST || !process.env.DB_USER || !dbName) {
    throw new Error(
      "[migrate] Missing DB_HOST, DB_USER, or DB_NAME. Fill in backend/.env first."
    );
  }

  const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || "",
      multipleStatements: true,
    });

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` ` +
        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );
    await connection.query(`USE \`${dbName}\``);
    await connection.query(schemaSql);

    console.log(`[migrate] OK — schema.sql applied to database "${dbName}".`);
  } catch (err) {
    console.error("[migrate] SCHEMA SETUP FAILED (database connection or SQL error).");
    console.error("[migrate] Confirm MySQL is running and backend/.env is correct.");
    console.error(`[migrate] ${err.code || err.name}: ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
