-- SnipURL database schema
-- Run against the schema named in backend/.env (DB_NAME).
-- Either apply this file directly in MySQL Workbench, or run `npm run db:setup`
-- from the backend/ directory, which creates the database (if needed) and
-- applies this file.
--
-- Schema is fixed by prior design decisions — do not change column names,
-- types, or constraints here.
--
-- short_code is nullable by design: a row is INSERTed first so MySQL assigns the
-- AUTO_INCREMENT id, then UPDATEd with the base62 encoding of that id. The UNIQUE
-- index still guards against duplicate codes (and permits multiple NULLs during
-- that brief window).

CREATE TABLE IF NOT EXISTS urls (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    short_code VARCHAR(10),
    long_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    UNIQUE KEY idx_short_code (short_code)
);
