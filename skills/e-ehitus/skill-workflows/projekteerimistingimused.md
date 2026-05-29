# Workflow: Projekteerimistingimuste taotlus (11002)

**Use when:** the user wants to request design conditions (projekteerimistingimused) before starting the design process. This is a separate permit type — not related to the ehitusluba/ehitusteatis thresholds. Typically required when there is a valid detail plan and the user wants to deviate from it, or when the local municipality requires it.

State fee: **€25** flat (regardless of building type or size).

## Step sequence

```
1 → 2 → 3 → 3b → 4 → 4b → 5 → 6 → 7
```

Steps 3a is skipped (PT has no base document concept).

Read the corresponding step file for each step. Notes specific to PT taotlus are below.

## Step-specific notes

### Step 1 (data source)
For PT, the key inputs differ from ehitusluba — no measurements, materials, or technical systems needed. Gather:
- Address or cadastral unit code
- EHR code (if attaching to an existing building)
- Building polygon / hoonestusala coordinates (L-EST97)
- Kavandatav tegevus (what the user wants to build)
- Whether there is a detailplaneering and if so its identifier
- The PT form fields (see Step 4 notes below) — ask the user for each

### Step 2 (draft check)
Search for existing 11002 drafts:
```bash
-d '{"connectedPerson": USER_ID, "documentState": ["DO_DOKUSEIS_KOOSTAMISEL"], "documentTypeCode": ["11002"], "offset": 0, "limit": 20}'
```

### Step 3 (create document)

**Case A — existing building (EHR code known):**
```bash
# NOTE: 11002 returns documentNrFull, not applicationNumber (applicationNumber is null)
curl -s -X POST "$EHR/api/document/v1/document/11002" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentType": "11002", "ehrCodes": ["EHR_CODE"]}' \
  | jq '{docNr: .documentNrFull}'
```

**Case B — new building (cadastral unit only):**
```bash
# 1 — create empty document
# NOTE: 11002 returns documentNrFull, not applicationNumber (applicationNumber is null)
DOC_NR=$(curl -s -X POST "$EHR/api/document/v1/document/11002" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentType": "11002"}' | jq -r '.documentNrFull')

# 2 — attach via cadastral unit
curl -s -X POST "$EHR/api/document/v1/document/$DOC_NR/buildings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cadastrialUnitCode": "CADASTRAL_CODE", "buildingType": "Hoone"}' | jq .
```

Save `ehrCode` and `buildingId` from the building attach response. **Note:** the response is an array — use `.[0].ehrCode` and `.[0].buildingId`.

Also: the document auto-creates a building on creation, so calling `POST .../buildings` a second time creates a duplicate. Check `buildingDatas` on the document first; if one already exists with the right cadastral unit, skip the POST. If a duplicate is created, delete it: `DELETE /api/document/v1/document/{docType}/{docNum}/building/{ehrCode}`.

No base document check (Step 3a) — skip it entirely.

After adding the building, auto-resolve the prosecuting authority:
```bash
curl -s "$EHR/api/document/v1/prosecutingAuthority/BUILDING_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Step 3b (baseline building data)
Follow step file as normal. Note: for a brand-new building there will be no existing registry data — that is expected.

### Step 4 (building data)

**Do not fill** `constructionType`, `kavandatavTegevus`, measurements, `constructionAndMaterials`, or `buildingTechnicalDetails` — these fields are not part of the PT form and should remain `null` in the PUT body. No dynamic type switching occurs for 11002.

Instead, PT-specific form fields are stored in `buildingExtras` on the building object and `applicationExtras` on the document. Follow the fetch → edit → PUT pattern from the step file, adding these arrays.

**`buildingExtras`** (on the building PUT — all fields include `"ehrCode": "EHR_CODE"` except the first three):

| Code | Field label | Value |
|------|-------------|-------|
| `MUU_DETAIPL_KASOTS_PROPOSE_TAO` | Kavandatav tegevus | classifier code (see below) |
| `MUU_DETAIPL_KASOTS_PURPOSE_TAO` | Ehitamise eesmärk | HTML string `<p>...</p>` |
| `MUU_DETAIPL_KASOTS_PUR_OF_USE` | Kasutusotstarve | `"usageCode": CODE` from KASUTUS_OTSTARVE. One entry per intended use. `value` is osakaal (proportional share) as a fraction string — leave as `""` unless a specific split is known (not validated, so an imprecise value could be taken at face value). |
| `MUU_DETAIPL_KASOTS_TING_TAO` | Tingimuste selgitus | free text |
| `MUU_DETAIPL_KASOTS_SELGITUS_SUUR_MEN` | Kehtestatud suurus (m²) | numeric string |
| `MUU_DETAIPL_KASOTS_SELGITUS_SUUR_TAO` | Taotletav suurus (m²) | numeric string |
| `MUU_DETAIPL_KASOTS_SELGITUS_KORG_MEN` | Kehtestatud kõrgus (m) | numeric string |
| `MUU_DETAIPL_KASOTS_SELGITUS_KORG_TAO` | Taotletav kõrgus (m) | numeric string |
| `MUU_DETAIPL_KASOTS_SELGITUS_SUGAV_MEN` | Kehtestatud sügavus (m) | numeric string |
| `MUU_DETAIPL_KASOTS_SELGITUS_SUGAV_TAO` | Taotletav sügavus (m) | numeric string |
| `MUU_DETAIPL_KASOTS_SELGITUS_TAO` | Üldine selgitus | free text |
| `MUU_DETAIPL_KASOTS_LAHEND_TAO` | Lahendus | free text |
| `MUU_DETAIPL_KASOTS_ASUKOHT_TAO` | Asukoht | free text |
| `MUU_DETAIPL_KASOTS_POHIMOTTED_TAO` | Põhimõtted | free text |
| `MUU_DETAIPL_KASOTS_JAOTUS_TAO` | Jaotus | free text |

Observed `MUU_DETAIPL_KASOTS_PROPOSE_TAO` values:
- `PROJ_EHITUSTEG_LIIK_D_PYST` — püstitamine detailplaneeringuga

**`applicationExtras`** (on the document PUT — detailplaneeringu identifikaator):
```json
"applicationExtras": [
  {"code": "MUU_DETAILPL_TAO_IDENT", "value": "DP-identifier-or-empty-string", "id": 0, "usageCode": null}
]
```

`constructionActivity` in the building PUT must be set:
```json
"constructionActivityType": "DO_EHITUSTEG_LIIK_PYSTITAM",
"constructionActivity": {
  "constructionType": null,
  "plannedConstructionActivity": {
    "code": "DO_EHITUSTEG_LIIK",
    "value": "DO_EHITUSTEG_LIIK_PYSTITAM",
    "description": "Ehitise püstitamine"
  }
}
```

No docNr switch check needed — 11002 never auto-switches.

### Step 4b (building body)

Follow the step file. UI-observed order (verified via HAR):

```
1. Resolve address (getkatastrialbygeojson → getAddress)
2. PUT heritageAnalyze
3. POST buildingBody (include shapeType + addresses in the initial POST — no separate PUT needed)
```

**PT requires `shapeType` on the kehand** — without it, `blt.error.missing_shape_type_building_area` blocks submission. Include it in the `POST buildingBody` `spatialShape`. For a new building without a DP, use `KUJU_LIIK_HOON_ALA`. All codes are in the step file.

Note: the server returns the shapeType with `code: "KUJU_LIIK"` and `value: "KUJU_LIIK_HOON_ALA"` — that is correct, it is just how the classifier group is stored.

Building parts (hooneosa) are not added for PT — the kehand itself is sufficient.

### Step 5 (persons)

The only required role is **Taotleja**, which is auto-added as the authenticated user. Check that `email` is populated (it may be blank on first creation):

```bash
curl -s "$EHR/api/document/v1/document/$DOC_NR" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.relatedEntities.persons[0] | {name: .firstName, email: .email}'
```

If email is missing, fetch the document, set `relatedEntities.persons[0].email`, and PUT it back. Ask the user for their email — do not guess.

### Step 6 (attachments)

No ehitusprojekt (construction project files) needed for PT. Use only the **regular attachments** section from the step file.

The Lisad tab has three sections:
- **Taotlusele lisatud detailplaneering** — attach the detail plan document if available
- **Lisadokumendid taotluse juurde** — any other supporting documents

Get applicable file type codes for 11002:
```bash
curl -s "$EHR/api/classifier/v1/classifier/faty/11002" \
  -H "Authorization: Bearer $TOKEN" | jq '[.[] | {id: .fatyId, name: .fatyName}]'
```

State fee is always **€25**. Trigger calculation and register the payment order following the stateFee section in the step file. The `stateFeeDto` response gives the payee (local municipality), bank accounts, and reference number.

### Step 7 (validate)

Follow the step file. Additional PT-specific check before handing off:

```bash
curl -s "$EHR/api/document/v1/document/$DOC_NR" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{status: .documentStatus, authority: .prosecutingAuthority.registrationName, stateFee: .stateFeeDto.totalAmount}'
```

`prosecutingAuthority` must be populated — if it is null after Step 3, re-run the auto-resolve call from Step 3 notes.

The user submits via **Esitan** in the browser and signs with ID-card or Mobile-ID. No ehitusprojekt signing step is needed.
