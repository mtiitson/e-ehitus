#!/usr/bin/env node
/**
 * ehr-api — EHR API call helper
 *
 * Usage:
 *   node ehr-api.js GET /api/path
 *   node ehr-api.js POST /api/path '{"key":"value"}'
 *   node ehr-api.js POST /api/path @/path/to/body.json
 *   node ehr-api.js PUT /api/path @body.json
 *   node ehr-api.js DELETE /api/path
 *
 * Token is read from ~/ehr-token.json and refreshed automatically if needed.
 * Response JSON is pretty-printed to stdout; errors go to stderr with exit 1.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const BASE_URL = "https://livekluster.ehr.ee";
const KEYCLOAK_TOKEN_URL = `${BASE_URL}/auth/realms/eehitus/protocol/openid-connect/token`;
const TOKEN_CACHE_PATH = join(homedir(), "ehr-token.json");

function loadTokenCache() {
  try { return JSON.parse(readFileSync(TOKEN_CACHE_PATH, "utf-8")); }
  catch { return null; }
}

async function refreshToken(refreshTok) {
  const res = await fetch(KEYCLOAK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: "portal", refresh_token: refreshTok }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const d = await res.json();
  const cache = {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiresAt: Date.now() + d.expires_in * 1000 - 30_000,
  };
  writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(cache));
  return cache.accessToken;
}

async function getToken() {
  const cache = loadTokenCache();
  if (cache && Date.now() < cache.expiresAt) return cache.accessToken;
  if (cache?.refreshToken) {
    try { return await refreshToken(cache.refreshToken); }
    catch { /* fall through */ }
  }
  process.stderr.write("Token expired or missing. Run ehr-auth.js to authenticate.\n");
  process.exit(1);
}

async function main() {
  const [,, method, path, body] = process.argv;

  if (!method || !path) {
    process.stderr.write("Usage: ehr-api.js <GET|POST|PUT|DELETE> </api/path> [body|@file.json]\n");
    process.exit(1);
  }

  const token = await getToken();
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

  let bodyContent;
  if (body) {
    bodyContent = body.startsWith("@") ? readFileSync(body.slice(1), "utf-8") : body;
  }

  const res = await fetch(url, {
    method: method.toUpperCase(),
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(bodyContent ? { body: bodyContent } : {}),
  });

  const text = await res.text();

  if (!res.ok) {
    process.stderr.write(`HTTP ${res.status} ${res.statusText}\n${text}\n`);
    process.exit(1);
  }

  if (text) {
    try { process.stdout.write(JSON.stringify(JSON.parse(text), null, 2) + "\n"); }
    catch { process.stdout.write(text + "\n"); }
  }
}

main().catch((e) => { process.stderr.write(e.message + "\n"); process.exit(1); });
