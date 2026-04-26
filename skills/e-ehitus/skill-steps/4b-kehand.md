# Step 4b — Building body and parts (kehand)

Required for: area fields (`closedAreaSquareMeters` etc.) and the `buildingbody.validation.exists` validation check.

Coordinates are in **L-EST97 (EPSG:3301)**. See coordinate axis quirk in `skill-api-reference.md`.

## 1. Create building body

`geoJson` is a **JSON string** (double-encoded) inside the outer JSON. Polygon ring must be closed (last coord = first coord).

```bash
curl -s -X POST "$EHR/api/document/v1/document/DOC_NR/building/EHR_CODE/buildingBody" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "buildingParts": [],
    "spatialShape": {
      "ehrCode": "EHR_CODE",
      "coordinates": [],
      "coordinatesFormPolygon": true,
      "coordinatesTakenFromGeoMeasurements": true,
      "nahtus": {"code": "HOONE", "value": "", "additionalValue": "H"},
      "geoJson": "{\"type\":\"Polygon\",\"coordinates\":[[[575731.38,6595600.42],[575739.18,6595605.44],[575746.83,6595594.41],[575736.86,6595586.58],[575731.38,6595600.42]]]}",
      "geoType": "Polygon",
      "geoSource": "M"
    },
    "kehandId": 0
  }' | jq '{kehandId: .kehandId}'
```

`geoSource: "M"` = mõõdistuselt (from geodetic survey). Save the returned `kehandId`.

After calling this, re-fetch the document and include `buildingBodies` in any subsequent building PUT.

## 2. Heritage analysis (UI also calls this automatically)

```bash
curl -s -X PUT "$EHR/api/document/v1/document/DOC_NR/building/EHR_CODE/heritageAnalyze" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"geoJson": "{\"type\":\"Polygon\",\"coordinates\":[...]}"}' | jq .
```

## 3. Resolve address from polygon

```bash
# Returns cadastral unit info — use returned ADS ID in getAddress
curl -s -X POST "$EHR/api/geoinfo/v1/getkatastrialbygeojson" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"geojson": {"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [...]}, "properties": {}}}' | jq .

# Resolve ADS ID to full address object
curl -s "$EHR/api/geoinfo/v1/getAddress?ids=ADS_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## 4. Attach address to building body (required before adding parts)

Omit the `operation` field from the outer object — sending `"operation": "U"` or `"INSERT"` causes 400.

```bash
curl -s -X PUT "$EHR/api/document/v1/document/DOC_NR/building/EHR_CODE/buildingBody/KEHAND_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kehandId": KEHAND_ID,
    "spatialShape": {
      "ehrCode": "EHR_CODE",
      "coordinates": [],
      "coordinatesFormPolygon": true,
      "coordinatesTakenFromGeoMeasurements": true,
      "nahtus": {"code": "HOONE", "value": "", "additionalValue": "H"},
      "geoJson": "...",
      "geoType": "Polygon",
      "geoSource": "M",
      "addresses": [{
        "aadrId": 6747034,
        "fullAddress": "Harju maakond, Kuusalu vald, Valkla küla, Jõesuu tee 12",
        "closeAddress": "Jõesuu tee 12",
        "koodaadress": "37353895400000P6C0000D81700000000",
        "tase1Id": 37, "tase1Kood": "37", "tase1Nimetus": "Harju maakond",
        "tase2Id": 1603282, "tase2Kood": "353", "tase2Nimetus": "Kuusalu vald",
        "tase3Id": 9828243, "tase3Nimetus": "Valkla küla",
        "tase5Id": 9833892, "tase5Nimetus": "Jõesuu tee",
        "tase7Id": 11121997, "tase7Nimetus": "12"
      }]
    },
    "buildingParts": [],
    "firstUsageYear": null
  }' | jq .
```

`aadrId` and `tase*` values come from `getAddress?ids=ADS_ID`.

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
