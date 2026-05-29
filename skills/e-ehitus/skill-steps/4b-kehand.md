# Step 4b — Building body and parts (kehand)

Required for: area fields (`closedAreaSquareMeters` etc.) and the `buildingbody.validation.exists` validation check.

Coordinates are in **L-EST97 (EPSG:3301)**. See coordinate axis quirk in `skill-api-reference.md`.

## 1. Resolve address from polygon

Run this before creating the building body — the address goes into the POST.

```bash
# Returns cadastral unit info — use properties.aadr_id (ads_oid is often null)
AADR_ID=$(curl -s -X POST "$EHR/api/geoinfo/v1/getkatastrialbygeojson" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"geojson": {"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [[[e,n],...,[e,n]]]}, "properties": {}}}' \
  | jq -r '.properties.aadr_id')

# Build address object (note snake_case → camelCase mapping)
ADDR=$(curl -s "$EHR/api/geoinfo/v1/getAddress?ids=$AADR_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.[0] | {
    aadrId: (.id | tonumber),
    fullAddress: .taisaadress,
    closeAddress: .lahiaadress,
    koodaadress: .koodaadress,
    tase1Id: (.tase1_id | tonumber), tase1Kood: .tase1_kood, tase1Nimetus: .tase1_nimetus,
    tase2Id: (.tase2_id | tonumber), tase2Kood: .tase2_kood, tase2Nimetus: .tase2_nimetus,
    tase3Id: (.tase3_id | tonumber), tase3Nimetus: .tase3_nimetus,
    tase5Id: (.tase5_id | tonumber), tase5Nimetus: .tase5_nimetus,
    tase7Id: (.tase7_id | tonumber), tase7Nimetus: .tase7_nimetus
  }')
```

## 2. Heritage analysis

Call this **before** the buildingBody POST.

```bash
curl -s -X PUT "$EHR/api/document/v1/document/DOC_NR/building/EHR_CODE/heritageAnalyze" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"geoJson": "{\"type\":\"Polygon\",\"coordinates\":[[[e,n],...,[e,n]]]}"}' | jq .
```

## 3. Create building body

`geoJson` is a **JSON string** (double-encoded) inside the outer JSON. Polygon ring must be closed (last coord = first coord). Include `addresses` in the initial POST — no separate PUT step needed. `shapeType` is only required for PT (11002) — omit it for ehitusluba/ehitusteatis.

```bash
curl -s -X POST "$EHR/api/document/v1/document/DOC_NR/building/EHR_CODE/buildingBody" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"buildingParts\": [],
    \"spatialShape\": {
      \"ehrCode\": \"EHR_CODE\",
      \"coordinates\": [],
      \"coordinatesFormPolygon\": true,
      \"coordinatesTakenFromGeoMeasurements\": true,
      \"adsType\": \"ME\",
      \"nahtus\": {\"code\": \"HOONE\", \"value\": \"\", \"additionalValue\": \"H\"},
      \"shapeType\": {\"code\": \"SHAPE_TYPE_CODE\", \"value\": \"SHAPE_TYPE_CODE\"},
      \"addresses\": [$(echo $ADDR)],
      \"geoJson\": \"{\\\"type\\\":\\\"Polygon\\\",\\\"coordinates\\\":[[[538657.93,6586889.12],[538666.44,6586907.22],[538675.49,6586902.96],[538666.98,6586884.86],[538657.93,6586889.12]]]}\",
      \"geoType\": \"Polygon\",
      \"geoSource\": \"M\"
    },
    \"kehandId\": 0
  }" | jq '{kehandId: .kehandId}'
```

`geoSource: "M"` = mõõdistuselt (from geodetic survey). Save the returned `kehandId`.

After calling this, re-fetch the document and include `buildingBodies` in any subsequent building PUT.

**`shapeType` codes** (`KUJU_LIIK` classifier):
| Code | When |
|------|------|
| `KUJU_LIIK_OLEMAS_OLEV` | Existing registered building |
| `KUJU_LIIK_HOON_ALA` | New building, no detailplaneering |
| `KUJU_LIIK_DP_KEHT_HOON_ALA` | New building, DP already exists |
| `KUJU_LIIK_TEEN_EHIT_ASUK` | Service/ancillary building, no DP |
| `KUJU_LIIK_DP_KEHT_TEEN_EHIT_ASUK` | Service building, DP exists |

## 5. Add building part (hooneosa)

```bash
curl -s -X POST "$EHR/api/document/v1/document/DOC_NR/buildingBody/KEHAND_ID/buildingPart" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "livingPart": true,
    "buildingPartType": "K",
    "roomCount": 4,
    "entranceFloor": "1",
    "areaSquareMeters": 125.3,
    "heatedAreaSquareMeters": 125.3,
    "roomTemperatureAreaSquareMeters": 125.3,
    "balconiesAreaSquareMeters": 0,
    "kitchenRoomCount": 1,
    "openKitchenRoomCount": 0,
    "purposeOfUse": {"code": "11101", "value": "11101", "description": "Üksikelamu", "additionalDescription": "Single detached building", "additionalValue": "1"},
    "spatialShapeDto": { ... same spatialShape object as the buildingBody ... },
    "addressDto": { ... address object from buildingBody.spatialShape.addresses[0] ... },
    "waterSupplyTypes": [{"code": "TEHNO_VESI", "value": "VALUE"}],
    "sewageTypes": [{"code": "TEHNO_KANAL", "value": "VALUE"}],
    "wcTypes": [{"code": "TEHNO_WC", "value": "VALUE"}],
    "washingTypes": [{"code": "TEHNO_OPESU", "value": "VALUE"}],
    "heatingTypes": [],
    "heatingSourceTypes": [],
    "energySourceTypes": [],
    "technoSystems": [ ... see technoSystems format below — required, all 5 liik entries ... ],
    "actionType": {"code": "", "value": false, "description": "", "additionalDescription": "", "additionalValue": ""}
  }' | jq .
```

### technoSystems format

`technoSystems` is an array of `BuildingPartTechnoSystemDto`. **All 5 liik entries must be present in the initial POST — empty array or missing liik causes validation failure and the part is not saved.**

```json
[
  {
    "liik": "TEHNO_ELEKLIIK",
    "technoSystems": [{"tehnosysteemiliik": "...", "allikasKood": "...", "energiakandjaKood": "..."}]
  }
]
```

**Critical field rules (verified against live API):**
- **`allikasKood`** = same value as `tehnosysteemiliik` (self-referential). Do not use `""`, `null`, or classifier group codes like `"ALA_TEHNO_VALIK_VORK"` — those all fail.
- **`energiakandjaKood`** = energy carrier code (e.g. `"2607"` for elekter). For systems with no energy carrier, use `"2602"` (puudub) — do not use `""` or omit.
- **`ehos`** — omit this field entirely. The OAS spec marks it required (`$ref: HooneOsaDto`), but sending it causes `false` → 400 (type mismatch), `null` → 500 (server NPE). Omitting it works in practice.

Required `liik` values: `TEHNO_ELEKLIIK`, `TEHNO_JAHUTUSA`, `TEHNO_MAJAPIDAMISGAAS`, `TEHNO_SOOJUSA`, `TEHNO_VENT`.

**Working example for a maasoojuspump + meh.vent üksikelamu (no cooling, no gas):**
```json
"technoSystems": [
  {"liik":"TEHNO_ELEKLIIK",        "technoSystems":[{"tehnosysteemiliik":"2303","allikasKood":"2303","energiakandjaKood":"2607"}]},
  {"liik":"TEHNO_SOOJUSA",         "technoSystems":[{"tehnosysteemiliik":"2518","allikasKood":"2518","energiakandjaKood":"2607"}]},
  {"liik":"TEHNO_VENT",            "technoSystems":[{"tehnosysteemiliik":"2712","allikasKood":"2712","energiakandjaKood":"2607"}]},
  {"liik":"TEHNO_JAHUTUSA",        "technoSystems":[{"tehnosysteemiliik":"20102","allikasKood":"20102","energiakandjaKood":"2602"}]},
  {"liik":"TEHNO_MAJAPIDAMISGAAS", "technoSystems":[{"tehnosysteemiliik":"20402","allikasKood":"20402","energiakandjaKood":"2602"}]}
]
```
Where: 2303=elektrivõrk, 2518=maasoojuspump, 2712=meh.vent soojustagastusega, 20102=jahutust ei ole, 20402=gaasi ei ole, 2607=elekter, 2602=puudub.

### Part-level classifiers

```bash
curl -s "$EHR/api/document/v1/classifiers/TEHNO_WC,TEHNO_OPESU,TEHNO_VESI,TEHNO_KANAL" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

| Field | Classifier |
|-------|-----------|
| `waterSupplyTypes` | `TEHNO_VESI` |
| `sewageTypes` | `TEHNO_KANAL` |
| `wcTypes` | `TEHNO_WC` (part-level only) |
| `washingTypes` | `TEHNO_OPESU` (part-level only) |

## 6. Verify derived area totals

```bash
curl -s "$EHR/api/document/v1/document/DOC_NR/building/BUILDING_ID/derived-data" \
  -H "Authorization: Bearer $TOKEN" | jq .
```
