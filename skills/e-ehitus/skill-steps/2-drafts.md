# Step 2 — Check for existing drafts

```bash
TOKEN=$(node <skill-dir>/scripts/ehr-auth.js --print-token)
EHR=https://livekluster.ehr.ee

# Get user ID
USER_ID=$(curl -s "$EHR/api/user/v1/person/details" \
  -H "Authorization: Bearer $TOKEN" | jq '.id')

# Search drafts — adjust documentTypeCode for the doc type being submitted
curl -s -X POST "$EHR/api/myviews/v1/search/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"connectedPerson\": $USER_ID, \"documentState\": [\"DO_DOKUSEIS_KOOSTAMISEL\"], \"documentTypeCode\": [\"11271\",\"11201\"], \"offset\": 0, \"limit\": 20}" \
  | jq '[.content[] | {nr: .docNr, type: .documentType, address: .buildingAddress}]'
```

If drafts exist for the relevant document type, ask:
**"There are existing drafts — continue one or start fresh?"**

- **Continue** → the building is already attached. Read the document to get `ehrCode` and `buildingId`, then skip to Step 4.
- **Fresh** → proceed to Step 3.
