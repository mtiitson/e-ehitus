# Step 4 — Fill building data (Ehitised tab)

## Ehitustegevuse info (ehitusluba / ehitusteatis only)

Fill these fields first — they determine whether the system auto-switches doc type (11271 ↔ 11201):

- **Hoone liik** (`constructionType`) — e.g. `{"code": "HL", "value": "HL_ELAMU"}` for eluhoone
- **Kavandatav tegevus** — pre-filled when base doc is linked; otherwise set explicitly
- **Ehitisealune pind ja kõrgus** — select the applicable threshold category

**After every building data PUT, verify docNr is still valid** (dynamic type switching creates a new docNr):

```bash
curl -s "$EHR/api/document/v1/document/DOC_NR" \
  -H "Authorization: Bearer $TOKEN" | jq '.applicationNumber // "404"'

# If null/404 — find the new docNr:
curl -s -X POST "$EHR/api/myviews/v1/search/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"connectedPerson\": $USER_ID, \"documentState\": [\"DO_DOKUSEIS_KOOSTAMISEL\"], \"documentTypeCode\": [\"11201\",\"11271\"], \"offset\": 0, \"limit\": 5}" \
  | jq '[.content[] | {nr: .docNr, type: .documentType, ehr: .ehrCode}]'
```

The building PUT response (`BuildingDataDto`) does **not** contain the new docNr. The only signal is the 404 on the old docNr.

## Fetch → edit → PUT

```bash
# Fetch current building state from the document
curl -s "$EHR/api/document/v1/document/DOC_NR" \
  -H "Authorization: Bearer $TOKEN" | jq '.buildingDatas[0]' > /tmp/building.json

# Edit /tmp/building.json — add/update fields from project data

# PUT
curl -s -X PUT "$EHR/api/document/v1/document/DOC_NR/building/EHR_CODE" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/building.json | jq '{buildingId, ehrCode}'
```

Keep existing `ownershipType` and `buildingStatus` unless the user changes them.

## Derived fields — do NOT set directly

These are computed from building parts (Step 4b) and are silently ignored in a PUT:
- `heatedAreaSquareMeters` / `closedAreaSquareMeters` / `generalUsageAreaSquareMeters`

## Field precision rules

| Type | Precision |
|------|-----------|
| Linear measurements (m) | 1 decimal |
| Areas (m²) | 1 decimal |
| Volumes (m³) | whole numbers |
| Heights | based on average surrounding ground level = (max + min perimeter height) / 2 |

## Construction materials

Each field uses a different classifier code. See `skill-classifiers.md` for the mapping table.

Common mistake: `outerWallsTypes` uses classifier `KONS_VSEIN`, not `KONS_KKONSTR`.

## Schema reference

Always check field shapes before constructing the PUT body:
```bash
jq '.components.schemas.BuildingDataDto' <skill-dir>/references/openapi-document.json
jq '.components.schemas.PurposeDto' <skill-dir>/references/openapi-document.json
```
