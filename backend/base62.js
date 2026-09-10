"use strict";

/**
 * Base62 codec for SnipURL short codes.
 *
 * Alphabet: 0-9, a-z, A-Z (62 characters), per the locked design.
 * A short code is the base62 encoding of a row's AUTO_INCREMENT id.
 *
 * decode() is intentionally NOT implemented. The retrieve/redirect path looks
 * rows up by `short_code` directly — a UNIQUE-indexed column — and never turns a
 * code back into an id, so a decoder would be unused code. `isValidShortCode()`
 * covers the only need on that path: rejecting malformed input before querying.
 */

const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = 62n;

/**
 * Encode a non-negative integer id into a base62 string.
 *
 * @param {number|bigint|string} id AUTO_INCREMENT id (>= 0)
 * @returns {string} base62 code
 */
function encode(id) {
  let n = BigInt(id);
  if (n < 0n) {
    throw new RangeError(`[base62] encode expects a non-negative id, received ${id}`);
  }
  if (n === 0n) {
    return ALPHABET[0];
  }
  let code = "";
  while (n > 0n) {
    code = ALPHABET[Number(n % BASE)] + code;
    n /= BASE;
  }
  return code;
}

/**
 * True when `code` is a syntactically valid short code: 1-10 base62 characters.
 * Does not check whether the code exists in the database.
 *
 * @param {unknown} code
 * @returns {boolean}
 */
function isValidShortCode(code) {
  return typeof code === "string" && /^[0-9A-Za-z]{1,10}$/.test(code);
}

module.exports = { encode, isValidShortCode, ALPHABET };
