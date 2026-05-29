# Step 3 — Locate building and create document

## Look up EHR code from address (if not known)

```bash
node <skill-dir>/scripts/ehr-api.js GET "/api/geoinfo/v1/getgeoobjectsbyaddress?address=Tartu+mnt+1&epsg=wgs84&rgo=false" \
  | jq '[.features[] | select(.properties.object_type == "EHR_KOOD") | {ehr: .properties.ehr_code, address: .properties.address}]'
```

## Case A — existing building (EHR code known)

Create document and attach building in one call:

```bash
DOC_TYPE=11271  # or 11201, 11525
node <skill-dir>/scripts/ehr-api.js POST /api/document/v1/document/$DOC_TYPE \
  "{\"documentType\": \"$DOC_TYPE\", \"ehrCodes\": [\"121432339\"]}" \
  | jq '{docNr: .applicationNumber}'
```

## Case B — new building (no EHR code yet, only cadastral unit known)

```bash
# 1 — create empty document
DOC_NR=$(node <skill-dir>/scripts/ehr-api.js POST /api/document/v1/document/11271 \
  '{"documentType": "11271"}' | jq -r '.applicationNumber')

# 2 — attach via cadastral unit
node <skill-dir>/scripts/ehr-api.js POST /api/document/v1/document/$DOC_NR/buildings \
  '{"cadastrialUnitCode": "35301:001:1974", "buildingType": "Hoone"}' | jq .
```

> `buildingType` must be the display string `"Hoone"` (not the code `"EHITIS_RAJATIS_HOONE_H"` — that returns 400).

## Deleting a draft

```bash
# docNr "2611271/04701" → DELETE /document/2611271/04701
node <skill-dir>/scripts/ehr-api.js DELETE /api/document/v1/document/2611271/04701 | jq .
# Use the docNr path — NOT the numeric internal documentId (that endpoint returns 405).
```

## Step 3a — Base documents (ehitusluba / ehitusteatis only)

```bash
# Check for projekteerimistingimused linked to this building
node <skill-dir>/scripts/ehr-api.js GET /api/document/v1/document/building/base/11271/EHR_CODE | jq .
```

If results returned, ask: **"This building has a linked Projekteerimistingimused (nr. X) — link it as base document?"**

```bash
# Yes — include baseDocumentId when adding building
node <skill-dir>/scripts/ehr-api.js POST /api/document/v1/document/DOC_NR/buildings \
  '{"ehrCodes": ["EHR_CODE"], "baseDocumentId": BASE_DOC_ID}' | jq .

# No — omit baseDocumentId
node <skill-dir>/scripts/ehr-api.js POST /api/document/v1/document/DOC_NR/buildings \
  '{"ehrCodes": ["EHR_CODE"]}' | jq .
```

Auto-resolve prosecuting authority after adding building:
```bash
node <skill-dir>/scripts/ehr-api.js GET /api/document/v1/prosecutingAuthority/BUILDING_ID | jq .
```

## Step 3b — Fetch baseline building data

```bash
node <skill-dir>/scripts/ehr-api.js GET "/api/building/v2/buildingData?ehr_code=EHR_CODE" | jq .
```

Use this to see what's already registered — carry over `ownershipType`, `buildingStatus`, and any correct existing values into Step 4.
