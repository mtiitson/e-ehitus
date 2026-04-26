#!/usr/bin/env node
/**
 * ehr-auth — EHR TARA authentication
 *
 * Usage:
 *   node ehr-auth.js                 # interactive prompt (Mobile-ID or Smart-ID)
 *   node ehr-auth.js -m              # Mobile-ID
 *   node ehr-auth.js --mobile-id     # Mobile-ID
 *   node ehr-auth.js -s              # Smart-ID QR
 *   node ehr-auth.js --smart-id      # Smart-ID QR
 *   node ehr-auth.js --print-token   # print valid access token to stdout (refresh if needed)
 */

import got from "got";
import { CookieJar } from "tough-cookie";
import QRCode from "qrcode";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import * as readline from "readline";

const BASE_URL = "https://livekluster.ehr.ee";
const KEYCLOAK_TOKEN_URL = `${BASE_URL}/auth/realms/eehitus/protocol/openid-connect/token`;
const TOKEN_CACHE_PATH = join(homedir(), "ehr-token.json");
const MID_SESSION_PATH = join(homedir(), "ehr-mid-session.json");
const REDIRECT_URI = `${BASE_URL}/ui/ehr/v1/`;

// ── Utilities ──────────────────────────────────────────────────────────────────

function randomHex(n = 32) {
  return Array.from(crypto.getRandomValues(new Uint8Array(n)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function extractCsrf(html) {
  const m = html.match(/<meta name="_csrf" content="([^"]+)"/);
  if (!m) throw new Error("Could not extract CSRF token from TARA page");
  return m[1];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

async function renderQr(url) {
  const qr = await QRCode.toString(url, { type: "terminal", small: true });
  process.stderr.write("\x1B[2J\x1B[H"); // clear screen
  process.stderr.write(qr + "\n");
  process.stderr.write("Scan with Smart-ID app\n");
}

// ── Shared auth scaffold ───────────────────────────────────────────────────────

function makeClient(jar) {
  return got.extend({
    cookieJar: jar ?? new CookieJar(),
    followRedirect: true,
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "et-EE,et;q=0.9,en;q=0.8",
    },
  });
}

async function taraInit() {
  const jar = new CookieJar();
  const client = makeClient(jar);
  const authUrl =
    `${BASE_URL}/auth/realms/eehitus/protocol/openid-connect/auth` +
    `?client_id=portal` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_mode=fragment&response_type=code&scope=openid` +
    `&state=${randomHex(16)}&nonce=${randomHex(16)}`;

  const res = await client.get(authUrl);
  const csrf = extractCsrf(res.body);
  const taraBase = new URL(res.url).origin;
  return { client, jar, csrf, taraBase };
}

async function acceptAndGetTokens(client, taraBase, csrf) {
  let fragmentUrl = null;

  const hookClient = client.extend({
    hooks: {
      beforeRedirect: [(options, response) => {
        const loc = response.headers.location ?? "";
        if (loc.startsWith(REDIRECT_URI) && loc.includes("#")) {
          fragmentUrl = loc;
          throw Object.assign(new Error("FRAGMENT_CAPTURED"), { code: "FRAGMENT_CAPTURED" });
        }
        if (loc.includes("/auth/consent")) {
          options.method = "GET";
          delete options.body;
          delete options.form;
        }
      }],
    },
  });

  try {
    await hookClient.post(`${taraBase}/auth/accept`, { form: { _csrf: csrf } });
  } catch (e) {
    if (e.code !== "FRAGMENT_CAPTURED") throw e;
  }

  if (!fragmentUrl) throw new Error("No authorization code captured after auth");

  const code = new URLSearchParams(fragmentUrl.split("#")[1] ?? "").get("code");
  if (!code) throw new Error(`No code in fragment: ${fragmentUrl}`);

  const tokenRes = await got.post(KEYCLOAK_TOKEN_URL, {
    form: { grant_type: "authorization_code", code, client_id: "portal", redirect_uri: REDIRECT_URI },
    responseType: "json",
  });
  const d = tokenRes.body;
  const cache = {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiresAt: Date.now() + d.expires_in * 1000 - 30_000,
  };
  writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(cache));
  process.stderr.write("\nAuthentication successful. Token saved to ~/ehr-token.json\n");
}

// ── Mobile-ID ──────────────────────────────────────────────────────────────────

async function loginMobileId() {
  const idCode = await prompt("Personal ID code (isikukood): ");
  const phone = await prompt("Phone number (without +372): ");

  process.stderr.write("Connecting to TARA...\n");
  const { client, jar, csrf: initCsrf, taraBase } = await taraInit();
  let csrf = initCsrf;

  const res = await client.post(`${taraBase}/auth/mid/init`, {
    form: { idCode, telephoneNumber: phone, _csrf: csrf },
  });
  const html = res.body;

  const codeMatch =
    html.match(/class="[^"]*control[^"]*"[^>]*>\s*(\d{4})\s*</) ??
    html.match(/kontrollkood[^>]*>\s*(\d{4})/i) ??
    html.match(/>\s*(\d{4})\s*</);
  const challengeCode = codeMatch?.[1];

  const newCsrf = html.match(/<meta name="_csrf" content="([^"]+)"/)?.[1];
  if (newCsrf) csrf = newCsrf;

  if (challengeCode) {
    process.stderr.write(`\nOpen Mobile-ID app and confirm code: ${challengeCode}\n`);
  } else {
    process.stderr.write("\nCheck your phone for the Mobile-ID confirmation prompt.\n");
  }

  process.stderr.write("Waiting for confirmation (up to 120s)...\n");
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await sleep(2000);
    const poll = await client.get(`${taraBase}/auth/mid/poll`, { responseType: "json" });
    const { status, message } = poll.body;
    if (status === "ERROR" || status === "CANCELLED") throw new Error(`Mobile-ID ${status}: ${message ?? ""}`);
    if (status === "COMPLETED") break;
  }

  await acceptAndGetTokens(client, taraBase, csrf);
}

// ── Smart-ID QR ────────────────────────────────────────────────────────────────

async function loginSmartId() {
  process.stderr.write("Connecting to TARA...\n");
  const { client, csrf: initCsrf, taraBase } = await taraInit();
  let csrf = initCsrf;

  const initRes = await client.post(`${taraBase}/auth/sid/qr-code/init`, { form: { _csrf: csrf } });
  const newCsrf = initRes.body.match(/<meta name="_csrf" content="([^"]+)"/)?.[1];
  if (newCsrf) csrf = newCsrf;

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await sleep(1000);
    const poll = await client.get(`${taraBase}/auth/sid/qr-code/poll`, { responseType: "json" });
    const { status, deviceLink, message } = poll.body;
    if (status === "ERROR" || status === "CANCELLED") throw new Error(`Smart-ID ${status}: ${message ?? ""}`);
    if (deviceLink) await renderQr(deviceLink);
    if (status === "COMPLETED") break;
  }

  await acceptAndGetTokens(client, taraBase, csrf);
}

// ── Token refresh (non-interactive) ───────────────────────────────────────────

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

async function printToken() {
  const cache = loadTokenCache();
  if (cache && Date.now() < cache.expiresAt) {
    process.stdout.write(cache.accessToken + "\n");
    return;
  }
  if (cache?.refreshToken) {
    try {
      const token = await refreshToken(cache.refreshToken);
      process.stdout.write(token + "\n");
      return;
    } catch { /* fall through */ }
  }
  process.stderr.write("Token expired. Run ehr-auth.js to re-authenticate.\n");
  process.exit(1);
}

// ── CLI entry ──────────────────────────────────────────────────────────────────

async function main() {
  const arg = (process.argv[2] ?? "").toLowerCase();

  if (arg === "--print-token") {
    await printToken();
    return;
  }

  let method;
  if (arg === "-m" || arg === "--mobile-id") {
    method = "mobile";
  } else if (arg === "-s" || arg === "--smart-id") {
    method = "smart";
  } else {
    const answer = await prompt("Auth method — [m]obile-id or [s]mart-id qr: ");
    method = answer.toLowerCase().startsWith("s") ? "smart" : "mobile";
  }

  if (method === "smart") {
    await loginSmartId();
  } else {
    await loginMobileId();
  }
}

main().catch((e) => { process.stderr.write(e.message + "\n"); process.exit(1); });
