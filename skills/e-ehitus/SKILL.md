---
name: e-ehitus
description: Use whenever the user needs to submit, prepare, look up, or automate anything in Estonia's ehr.ee building register (e-ehitus platform) — including ehitusluba, ehitusteatis, projekteerimistingimused, andmete esitamise teatis, building data lookups, authentication with TARA/Mobile-ID/Smart-ID, or any API call to livekluster.ehr.ee. Covers authentication, Ehitusloa taotlus, Ehitusteatis, Projekteerimistingimuste taotlus, and Andmete esitamise teatis workflows, script-based API calls, form field semantics, API structure, and classifier reference.
---

# ehr.ee — e-ehituse platvorm

Estonia's building register (ehitisregister). One bundled Node.js script — `ehr-auth` — handles TARA authentication and token management. API calls use `ehr-api` (with `curl` only for multipart file uploads).

Base URL: `https://livekluster.ehr.ee`

## Setup

No installation needed. Pre-built scripts are in `scripts/` next to this file.

**Prerequisites:** Node.js 18+ (bundled with Claude Code), `curl` (standard everywhere), `jq` (`brew install jq` on macOS, `winget install jqlang.jq` on Windows).

**Optional setup** — installs `ehr-auth` and `ehr-api` as global commands for convenience:
```bash
node <skill-dir>/setup.js
```
After setup, `ehr-auth` and `ehr-api` work anywhere without a path prefix.

**Without setup** — run directly from the skill directory:
```bash
node <skill-dir>/scripts/ehr-auth.js
node <skill-dir>/scripts/ehr-api.js GET /api/path
```

**Resolving `<skill-dir>`:**
```bash
find ~/.claude -name "setup.js" 2>/dev/null | head -1 | xargs dirname
```

To rebuild after source changes: `cd <skill-dir>/js && npm install && node build.mjs`

## ⚠️ CRITICAL: Guessed values must always be surfaced to the user

EHR data is legally binding — incorrect entries can cause violations, fines, or demolition orders.

**Default rule:** if data is not present in the project documents or API responses, ask the user before filling.

**Exception:** when the API requires a value to proceed (e.g. technoSystems fields required to save a building part), you may use a reasonable inference — but you **must** present every guessed value to the user immediately after, clearly labeled as a guess, and wait for their confirmation or correction before continuing.

Never silently fill guessed values and move on.

Common danger zones:
- **Building body coordinates** — must come from an explicit source. Never estimate without telling the user they are approximate and getting confirmation.
- **Technical systems** (heating, water, sewage, ventilation) — prefer asking first; if a guess is unavoidable to unblock an API call, surface it immediately.
- **Construction materials** — must come from an explicit source: architectural drawings, written spec, or the user stating them directly.
- **Measurements** — use only values from an explicit source. Do not derive unlisted values.
- **Person details** (emails, roles) — ask the user; do not search or infer.

## Role selection (esindamine)

**Before starting any workflow**, check which role the user is acting under:

```bash
ehr-api GET /api/user/v1/person/details \
  | jq '{activeRole: .activeRole.id, roles: [.businessUsers[] | {id: .id, name: (.businessName // "isiklik")}]}'
```

If `businessUsers` contains more than one entry, **ask the user which role to use** before proceeding. Then switch if needed:

```bash
# 1. Switch role
ehr-api POST /api/user/v1/auth/update/active \
  '{"newUserId": TARGET_ID}'

# 2. Force token refresh — the active role is embedded in the JWT's ehr.active_role
#    claim, so the old token still carries the previous role. Drop the cached access
#    token so --print-token fetches a fresh one from Keycloak.
jq '.expiresAt = 0' ~/ehr-token.json > /tmp/ehr-token-tmp.json && mv /tmp/ehr-token-tmp.json ~/ehr-token.json
TOKEN=$(ehr-auth --print-token)
```

No re-authentication (TARA/Mobile-ID) is required. Skip this step only if the user has already confirmed their active role earlier in the conversation.

## Document types and workflows

| Document | Type code | Workflow file | Use case |
|----------|-----------|--------------|----------|
| **Ehitusloa taotlus** | `11271` | `skill-workflows/ehitusluba.md` | New/renovation/demolition requiring ehitusluba |
| **Ehitusteatis** | `11201` | `skill-workflows/ehitusteatis.md` | New/renovation/demolition — ehitusluba not required |
| **Projekteerimistingimuste taotlus** | `11002` | `skill-workflows/projekteerimistingimused.md` | Design conditions request before project design, €25 flat fee |
| **Andmete esitamise teatis** | `11525` | `skill-workflows/andmete-teatis.md` | Updating building registry data |

**Start every new document task by reading the relevant workflow file.** The workflow file defines the step sequence and type-specific variations. Then read individual step files as you execute each step.

### Ehitusluba vs ehitusteatis thresholds (hoone — most common)

| Building category | Püstitamine | Ümberehitamine | Lammutamine |
|---|---|---|---|
| **Elamu**, 0–20 m², ≤5m | Puudub | Puudub | Puudub |
| **Elamu**, 20–60 m², ≤5m | Ehitusteatis | Ehitusteatis | Ehitusteatis |
| **Elamu**, 0–60 m², >5m | Ehitusluba | Ehitusteatis + ehitusprojekt | Ehitusluba |
| **Elamu**, >60 m² | Ehitusluba | Ehitusteatis + ehitusprojekt | Ehitusluba |
| **Mitteelamu**, 0–20 m², ≤5m | Ehitusteatis | Puudub | Ehitusteatis |
| **Mitteelamu**, 20–60 m², ≤5m | Ehitusteatis + ehitusprojekt | Ehitusteatis + ehitusprojekt | Ehitusteatis + ehitusprojekt |
| **Mitteelamu**, 0–60 m², >5m | Ehitusluba | Ehitusteatis + ehitusprojekt | Ehitusluba |
| **Mitteelamu**, >60 m² | Ehitusluba | Ehitusluba | Ehitusluba |

Full table: `lisa1-ehitusseadustik.md`. "Puudub" = no document needed. Laiendamine >33% follows püstitamine rules.

### Dynamic type switching (ehitusluba ↔ ehitusteatis)

The system auto-switches between `11271` and `11201` based on kavandatav tegevus + constructionType + PIND_KORGUS. A new docNr is created; all data is carried over.

**After every building data PUT, verify the docNr is still valid:**
```bash
ehr-api GET /api/document/v1/document/DOC_NR | jq '.applicationNumber // "404"'
# If null/404 → find the new docNr:
ehr-api POST /api/myviews/v1/search/documents \
  '{"connectedPerson": USER_ID, "documentState": ["DO_DOKUSEIS_KOOSTAMISEL"], "documentTypeCode": ["11201","11271"], "offset": 0, "limit": 5}' \
  | jq '[.content[] | {nr: .docNr, type: .documentType, ehr: .ehrCode}]'
```

## Authentication

Auth goes through TARA (Riigi autentimisteenus) → Keycloak. Token cached in `~/ehr-token.json` (~15 min), auto-refreshed by `ehr-auth --print-token`.

**When the token is missing or expired:**

Tell the user to run this directly in their terminal (not via `!` — it's interactive):
```
ehr-auth
```
Flags: `-m` / `--mobile-id` for Mobile-ID, `-s` / `--smart-id` for Smart-ID.

The script prompts interactively, shows the Mobile-ID challenge code or Smart-ID QR, polls until confirmed, then saves the token. After it completes, resume API calls normally.

## Making API calls

Use `ehr-api` for all API calls — it handles token management automatically:

```bash
# GET
ehr-api GET /api/path | jq .

# POST / PUT with inline body
ehr-api POST /api/path '{"key":"value"}' | jq .

# POST / PUT with body from file (preferred for large payloads)
ehr-api POST /api/path @payload.json | jq .

# DELETE
ehr-api DELETE /api/path
```

Token is refreshed automatically. If both access and refresh tokens are gone, it exits with an error — re-run `ehr-auth` interactively to re-authenticate.

For file uploads (multipart), fall back to curl:
```bash
TOKEN=$(ehr-auth --print-token)
EHR=https://livekluster.ehr.ee

# File upload (multipart)
curl -s -X POST "$EHR/api/file-upload-api/v1/fileWithInfoAndDocRel" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/document.pdf;type=application/pdf" \
  -F 'fileInfo={"faty": 123, "docDate": "2026-04-24"}' \
  -F "docNr=DOC_NR" \
  -F "relType=D" | jq .

```

Classifiers via ehr-api:
```bash
ehr-api GET /api/document/v1/classifiers/KASUTUS_OTSTARVE,KONS_MATERJAL | jq .

Trust the live API over `skill-classifiers.md` if they conflict.

**To look up a request body schema:**
```bash
jq '.components.schemas.BuildingDataDto' <skill-dir>/references/openapi-document.json
jq '.components.schemas.PurposeDto' <skill-dir>/references/openapi-document.json
```

## Reference files

| File | Contents | When to use |
|------|----------|-------------|
| `skill-workflows/ehitusluba.md` | Step sequence + variations for ehitusloa taotlus (11271) | Starting an ehitusluba task |
| `skill-workflows/ehitusteatis.md` | Step sequence + variations for ehitusteatis (11201) | Starting an ehitusteatis task |
| `skill-workflows/andmete-teatis.md` | Step sequence + variations for andmete esitamise teatis (11525) | Starting a data update task |
| `skill-steps/1-source.md` … `skill-steps/7-validate.md` | Detailed instructions + API commands for each workflow step | Executing a specific step |
| `references/openapi-document.json` | Full OpenAPI spec for document/building/classifier APIs | **Before constructing any request body** |
| `references/openapi-myviews.json` | OpenAPI spec for search/myviews API | Searching documents |
| `references/openapi-building-project.json` | OpenAPI spec for building project file API | Step 6 — uploading ehitusprojekt files |
| `skill-classifiers.md` | Embedded classifier value tables | Quick lookup; verify against live API if stale |
| `skill-api-reference.md` | Endpoint authority, quirks, full endpoint list, JSON structure | Non-standard calls, debugging |
| `skill-field-tooltips.md` | UI tooltip text for every form field | Understanding field definitions and measurement rules |
| `skill-ehitusgiid.md` | Activity type definitions, building rules | Understanding what the user wants |
| `lisa1-ehitusseadustik.md` | Full ehitusluba vs ehitusteatis threshold table | Edge cases |

## API base paths

| Service | Base path |
|---------|-----------|
| Documents | `/api/document/v1` |
| Building registry | `/api/building/v2` |
| Classifiers | `/api/document/v1/classifiers/{codes}` |
| MyViews / search | `/api/myviews/v1` |
| Address/geo | `/api/geoinfo/v1` |
| User | `/api/user/v1` |
| File upload | `/api/file-upload-api/v1` |
| Building project files | `/api/building-project-file/v1` |
