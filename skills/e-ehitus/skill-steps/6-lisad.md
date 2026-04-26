# Step 6 — Attachments (Lisad tab)

Two separate attachment systems: **regular attachments** and **construction project files**. Different APIs, different IDs.

## Regular attachments (Lisad)

```bash
# Get file type classifier for this document type
curl -s "$EHR/api/classifier/v1/classifier/faty/11271" \
  -H "Authorization: Bearer $TOKEN" | jq '[.[] | {id: .fatyId, name: .fatyName}]'

# Upload file
curl -s -X POST "$EHR/api/file-upload-api/v1/fileWithInfoAndDocRel" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/document.pdf;type=application/pdf" \
  -F 'fileInfo={"faty": FATY_ID, "docDate": "2026-04-25"}' \
  -F "docNr=DOC_NR" \
  -F "relType=D" | jq .

# Update optional metadata after upload
curl -s -X PUT "$EHR/api/document/v1/document/DOC_NR/file/FILE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "...", "publisher": "...", "notes": "...", "docNumber": "..."}' | jq .

# List current attachments
curl -s "$EHR/api/document/v1/document/DOC_NR/files" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Delete attachment
curl -s -X DELETE "$EHR/api/file-upload-api/v1/DOC_NR/file/FILE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## Construction project files (Ehitusprojekt)

Uses `/api/building-project-file/v1/` — addressed by numeric **documentId** (not docNr) and UUID project/file IDs.

```bash
DOC_ID=$(curl -s "$EHR/api/document/v1/document/DOC_NR" \
  -H "Authorization: Bearer $TOKEN" | jq '.documentId')

# 1 — create project container
PROJECT_ID=$(curl -s -X POST "$EHR/api/building-project-file/v1/application/$DOC_ID/project" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}' | jq -r '.id')

# 2 — upload file
FILE_ID=$(curl -s -X POST "$EHR/api/building-project-file/v1/application/$DOC_ID/project/$PROJECT_ID/file/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/project.pdf;type=application/pdf" | jq -r '.id')

# 3 — set file metadata
curl -s -X PUT "$EHR/api/building-project-file/v1/application/$DOC_ID/project/$PROJECT_ID/file/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "project.pdf",
    "jrkNr": "1",
    "grupp": "SELETUSKIRJAD",
    "projektiOsa": "AR",
    "projektiTunnus": "",
    "selgitus": "",
    "projektiStaadium": "EHITUSPROJEKTI_STAADIUM_PP",
    "ehitiseSeosKoigiga": false,
    "ehitiseSeosEhrKood": "null"
  }' | jq .

# Check project status
curl -s "$EHR/api/building-project-file/v1/application/$DOC_ID/project/current" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Full classifier list (grupp, projektiOsa, projektiStaadium codes)
curl -s "$EHR/api/building-project-file/v1/config" -H "Authorization: Bearer $TOKEN" | jq .
```

Common classifier values:

| Field | Code | Label |
|-------|------|-------|
| `projektiStaadium` | `EHITUSPROJEKTI_STAADIUM_EP` | Eelprojekt |
| | `EHITUSPROJEKTI_STAADIUM_PP` | Põhiprojekt |
| | `EHITUSPROJEKTI_STAADIUM_TP` | Tööprojekt |
| | `EHITUSPROJEKTI_STAADIUM_TJ` | Teostusprojekt |
| `grupp` | `ULDDOKUMENDID` | Ülddokumendid |
| | `SELETUSKIRJAD` | Seletuskirjad |
| | `ASENDUSPLAANI_JOONISED` | Asendiplaani joonised |
| | `EHITUSE_ULDISED_PLAANIJOONISED` | Ehitise üldised plaanijoonised |
| | `EHITUSE_ULDISED_VAATED_LOIKED` | Ehitise üldised vaated, lõiked |
| | `MUUD_JOONISED` | Muud joonised |
| | `SPETSIFIKATSIOONID_MAHTUDE_LOETELUD` | Spetsifikatsioonid, mahtude loetelud |
| | `LISAD` | Lisad |
| `projektiOsa` | `AR` | Arhitektuur |
| | `AS` | Asendiplaan |
| | `EK` | Ehituskonstruktsioonid |
| | `KV` | Küte, ventilatsioon ja jahutus |
| | `EL` | Elektrienergia tugevvool |
| | `VK` | Veevarustus ja kanalisatsioon |
| | `AA` | Üldosa |
| | `TO` | Tuleohutus |

## State fee payment order (riigilõivu maksekorraldus)

Uses a different upload endpoint from regular attachments:

```bash
# docNr "2611271/04701" → DOC_TYPE=2611271, DOC_NUM=04701

# 1 — upload
FILE_ID=$(curl -s -X POST "$EHR/api/file-upload-api/v1/2611271/04701/file" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/payment.pdf;type=application/pdf" | jq -r '.id')

# 2 — set metadata (fileType 20302 = Riigilõivu maksekorraldus)
curl -s -X PUT "$EHR/api/document/v1/document/DOC_NR/file/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"id\": $FILE_ID, \"fileName\": \"payment.pdf\", \"date\": \"2026-04-25T00:00:00.000+00:00\", \"fileType\": 20302}" | jq .

# 3 — register with stateFee endpoint (body = full document JSON)
DOC_VERSION=$(curl -s "$EHR/api/document/v1/document/DOC_NR" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.documentVersion // "1"')
curl -s "$EHR/api/document/v1/document/DOC_NR" -H "Authorization: Bearer $TOKEN" > /tmp/doc.json
curl -s -X POST "$EHR/api/document/v1/document/DOC_NR/$DOC_VERSION/stateFee" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/doc.json | jq .
```

The `stateFeeDto` in the document contains payee, bank account, reference number, and amount.
