# EHR API Reference

## Document JSON structure

Key fields in the full document object returned by `GET /api/document/v1/document/{docNr}`:
- `documentId`, `documentNrFull`, `documentStatus` (`DO_DOKUSEIS_KOOSTAMISEL` = draft)
- `relatedEntities.persons[]` — persons; each has `id` (for PUT/DELETE), `personalCode`, `role[]`, `email`, `phoneNumber`
- `buildingDatas[]` — buildings; each has:
  - `buildingId`, `ehrCode`, `fullAddress`, `buildingName`, `firstUsageYear`
  - `buildingStatus.value` e.g. `EHITIS_SEISUND_OLEMA`
  - `ownershipType.value` e.g. `EHITIS_OMANDI_LIIK_KINNIS`
  - `purposes[]` — usage purposes with `livingAreaMeters`, `nonLivingAreaMeters`
  - `measurements` — `floorsCount`, `closedAreaSquareMeters`, `buildingFootprintAreaSquareMeters`, `volumeCubicMeters`, etc.
  - `constructionAndMaterials` — `basementTypes`, `outerWallsTypes`, `roofMaterialTypes`, etc.
  - `buildingTechnicalDetails` — `waterSupplyTypes`, `sewerTypes`, `heatingTypes`, `electricalSystemsTypes`, etc.
  - `buildingBodies[]` — each has `kehandId` (used in building body endpoints), `buildingParts[]`, `spatialShape`
- `prosecutingAuthority` — the local government authority (auto-resolved for ehitusteatis after adding building)
- `baseDocument` — linked base document reference (ehitusteatis only, e.g. projekteerimistingimused)
- `complianceNotice` — enforcement/compliance data (ehitusteatis only)
- `processingReasons` / `processingReasonTypes` — reasons for the application (ehitusteatis only)
- Attachments (Lisad tab) are **not** embedded in the document — use `GET .../document/{docNr}/files` to list them

## Field Semantics (Ehitised tab)

Source: https://e-ehitus.taskugiid.eu/ehitised/

### Üldinfo ja otstarbed

- **Ehitise liik**: "hoone" or "rajatis". First digit of EHR code: 1=hoone, 2=rajatis.
- **Ehitise nimetus**: Free-text name (e.g. "suitsusaun", "Teletorn"). NOT the project name. Treat like a person's name.
- **Omandi liik**: kinnisasi = real property; vallasasi = movable property. Default to kinnisasi unless user states otherwise.
- **Ehitise seisund**: Building lifecycle status. Keep existing value unless user changes it.
- **Esmase kasutuselevõtu aasta**: Earliest traceable year regardless of renovations. `firstUsageYearEstimated` = true when estimated.
- **Kasutamise otstarve**: Usage purpose from MKM määrus nr 51. Main purpose = largest floor area. EHR auto-calculates from building parts.

### Mõõtmed ja materjalid

**Precision rules:**
- Linear measurements: 1 decimal place (meters)
- Areas: 1 decimal place (m²)
- Volumes: whole numbers (m³)
- Heights/volumes based on *surrounding average ground level* = (max + min height of perimeter) / 2

**Field definitions:**
- **Ehitisealune pind**: Footprint area. Includes balconies, loggias, canopies >2m². Excludes eaves <1m, canopies <2m², terraces, steps.
- **Maapealse osa alune pind**: Above-ground footprint only. Equals ehitisealune pind when no larger underground portion.
- **Suletud netopind**: Sum of all net floor areas (living + non-living + shared + technical). Auto-calculated from building parts. Only counts areas with ceiling height ≥1.6m.
- **Köetav pind**: Areas with guaranteed interior climate (room temp + low-temp). Auto-calculated.
- **Toatemperatuuriga pind**: Areas at room temperature per energy efficiency regulation.
- **Kõrgus (m)**: Distance from average surrounding ground level to highest structural point.
- **Absoluutne kõrgus (m)**: Height above sea level. Since 1 Jan 2018: **Amsterdam zero** (Amsterdams Peil). Before 2018: Baltic datum. Read from project drawings.
- **Sügavus (m)**: Depth of underground part below ground level.
- **Maht (m³)**: Total volume including underground.
- **Maapealse osa maht (m³)**: Above-ground volume only.

## Endpoint authority (HAR-verified 2026-04-20, updated 2026-04-21)

Each data domain has a specific endpoint that is authoritative for persisting it. The UI fires multiple overlapping saves, but only the authoritative endpoint actually writes the data — the others silently ignore fields outside their domain.

| Data domain | Authoritative endpoint | Notes |
|------------|----------------------|-------|
| **Coordinates / spatial shape** | `PUT .../buildingBody/{kehandId}` | `PUT document` silently ignores coordinate changes |
| **Building parts (add)** | `POST .../buildingBody/{kehandId}/buildingPart` | Single call, no full save needed |
| **Building parts (edit)** | `PUT .../buildingBody/{kehandId}/buildingPart` | Single call, no full save needed |
| **Construction & materials** | `PUT .../building/{ehrCode}` | Single call sufficient (verified 2026-04-21) |
| **Measurements** | `PUT .../building/{ehrCode}` | Single call sufficient |
| **Technical details** | `PUT .../building/{ehrCode}` | Single call sufficient |
| **Persons (add/edit)** | `PUT .../document/{docNr}` | Persons embedded in `relatedEntities.persons[]` — no dedicated endpoint used by UI |
| **File attachments (upload)** | `POST /api/file-upload-api/v1/fileWithInfoAndDocRel` | Multipart: `file` + `fileInfo` JSON (`{faty, docDate}`) + `docNr` + `relType` (`"D"`) |
| **File attachments (edit)** | `PUT /api/document/v1/document/{docNr}/file/{fileId}` | Send full file object; editable: `title`, `publisher`, `notes`, `docNumber` (external ref, free-text), `fileType`/`docType` |
| **File attachments (delete)** | `DELETE /api/file-upload-api/v1/{docNr}/file/{fileId}` | Single call |
| **Document metadata** | `PUT .../document/{docNr}` | Status, notes, etc. |

**Adding a person** requires a prior search to get `personId`:
```
GET /api/user/v1/search/searchPerson?input={personalCode}&xRoad=false
```
Response: `{ "people": [{ "id": ..., "idCode": "...", "firstName": "...", "familyName": "...", "citizenship": "EST", ... }] }`

Map to document person object:
| searchPerson field | persons[] field |
|---|---|
| `id` | `personId` |
| `idCode` | `personalCode` |
| `firstName` | `firstName` |
| `familyName` | `surname` |
| `citizenship` + `country` | `citizenship` (expand to classifier object: `{code: "EST", value: "EE", description: "Eesti"}`) |
| (user input) | `role[]`, `email`, `phoneNumber` |

**After editing building parts**, the UI fetches derived/calculated data:
```
GET /api/document/v1/document/{docNr}/building/{buildingId}/derived-data
```

## Known API quirks

- **Document path**: `{documentType}/{applicationNumber}` splits into two URL segments — `GET /api/document/v1/document/2611525/08290` not `...document/2611525%2F08290`
- **Add building (existing)**: endpoint is `/buildings` (plural), body is `{"ehrCodes": ["121432339"]}` (array, not scalar). For ehitusteatis, optionally include `"baseDocumentId": {id}` to link a base document (e.g. projekteerimistingimused).
- **Add building (new construction — no EHR code yet)**: use `cadastrialUnitCode` + `buildingType` (display string, not a code — use `"Hoone"` for buildings, `"Rajatis"` for structures):
  ```bash
  ehr-api POST /api/document/v1/document/DOC_NR/buildings \
    '{"cadastrialUnitCode": "35301:001:1974", "buildingType": "Hoone"}'
  ```
  This creates a new EHR entry and returns the new EHR code. The `cadastrialUnitCode` alone (without `buildingType`) causes a 500. `kovKood` is not needed.
- **Building body vs building data**: `/building/{ehrCode}/buildingBody/{kehandId}` (singular) is for kehand data; `/buildings` (plural) is for add/remove
- **Document search**: use `POST /api/myviews/v1/search/documents` with `connectedPerson` (= `user.id` from `/api/user/v1/person/details`), `documentState` array, `offset`, `limit`. Use `list_documents` which handles this automatically.
- **Classifiers**: two equivalent endpoints — `/api/document/v1/classifiers/{codes}` (document API, comma-separated) and `/api/classifier/v1/classifiers/{codes}` (classifier API). Either works; prefer the document API one since we're already authenticated against it.
- **Building parts bulk update**: body is a `BuildingPartUpdateValue` with `fieldName`, `type` discriminator (`multi-select`, `select`, `float`, `integer`, `string`, `addressDto`), `values`, and `updatableIds`
- **File upload**: multipart POST — see Endpoint Authority table for details. `fileInfo` is a JSON blob `{"faty": <fatyId>, "docDate": "<ISO8601>"}`, `relType` is `"D"`. File type IDs from `GET /api/classifier/v1/classifier/faty/{documentType}`
- **PUT responses**: some PUT endpoints return 204 No Content — treat as success
- **Coordinates**: The API uses `pointX` = easting and `pointY` = northing — the **opposite** of the L-EST97 (EPSG:3301) surveying convention where X = northing and Y = easting. Architecture drawings follow the L-EST97 convention, so when reading `x=<value>` from a drawing, that value is northing → submit as `pointY`. Estonia's bounding box: easting 370,000–740,000 m, northing 6,375,000–6,635,000 m. If a coordinate's range doesn't disambiguate (both values within 370k–740k), ask the user.

- **Updating building geometry** — use the dedicated building body endpoint, not the full building PUT:
  ```
  PUT /api/document/v1/document/{docNr}/building/{ehrCode}/buildingBody/{kehandId}
  ```
  Body shape (only send what's needed, keep `operation: "UNTOUCHED"` for unchanged parts):
  ```json
  {
    "kehandId": 13529140,
    "operation": "U",
    "spatialShape": {
      "id": 30588783,
      "geoJson": "{\"type\":\"Polygon\",\"coordinates\":[[[easting,northing],...]]}",
      "operation": "U",
      "entrancePoints": [
        { "id": 24910328, "pointX": 549356.81, "pointY": 6594967.75, "oper": "U" }
      ]
    },
    "buildingParts": [],
    "firstUsageYear": null
  }
  ```
  GeoJSON coordinates are `[easting, northing]` pairs. The polygon ring must be **closed** — the last coordinate must repeat the first (standard GeoJSON; 4 corners = 5 entries). `entrancePoints` is the centroid — compute as average of polygon vertices if not provided. Fetch the current kehandId from `buildingBodies[].kehandId` in the document.

## Useful utility endpoints

### Get prosecuting authority (KOV) by geometry
```bash
ehr-api POST /api/document/v1/getProsecutingAuthorityByGeometry \
  '{"geoJson": "{\"type\":\"Polygon\",\"coordinates\":[[[easting,northing],...]]}"}' 
```
Geometry in L-EST97 (EPSG:3301). Returns list of institutions with `id`, `regName`, `regCode`, `ehakCode`. Use this to identify which KOV handles a location before creating a document.

Example for Valkla küla / Jõesuu tee 1 (Kuusalu vald):
- `id: 4588188`, `regName: "Kuusalu Vallavalitsus"`, `regCode: "75033496"`

## OpenAPI specs

All services follow the same pattern for their OAS spec: `https://livekluster.ehr.ee/api/{service}/{version}/v3/api-docs`

| Service | OAS spec | Local copy |
|---------|----------|------------|
| Documents | `https://livekluster.ehr.ee/api/document/v1/v3/api-docs` | `references/openapi-document.json` |
| MyViews / search | `https://livekluster.ehr.ee/api/myviews/v1/v3/api-docs` | `references/openapi-myviews.json` |
| Classifiers | `https://livekluster.ehr.ee/api/classifier/v1/v3/api-docs` | — |

**Before calling any endpoint for the first time, check the local OAS file** for the request body schema. Search for the endpoint path, find the `requestBody.$ref`, resolve the DTO schema, and check its `required` fields and property types. The OAS is the authoritative reference — do not guess body shapes from examples alone.

Key DTOs:
- `POST /document/{documentType}` → `AddEntityDto` (`documentType` + optional `ehrCodes[]`). Works for `11271`, `11201`, and `11525`.
- `PUT /document/{docNr}` → `DocumentDto` / `ApplicationDto` (full document object)
- `PUT .../building/{ehrCode}` → `BuildingDataDto` (full building object)
- `PUT .../buildingBody/{kehandId}` → building body with `spatialShape`, `buildingParts[]`

For services without a local copy, fetch the OAS JSON directly from the API (e.g. `api_request GET /api/classifier/v1/v3/api-docs`). The Swagger UI at `https://swaggerui.ehr.ee/` is for browsing only — it does **not** expose the JSON spec. Refresh local copies periodically.

**Document number format**: `{documentType}/{applicationNumber}` e.g. `2611271/04563` (ehitusloa taotlus), `2611201/09387` (ehitusteatis), `2611525/08290` (andmete esitamise teatis)

## Key confirmed endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/document/v1/document/{type}` | POST | Create document — body `AddEntityDto`: `{"documentType": "{type}", "ehrCodes": [...]}`. Use `11271` (ehitusluba), `11201` (ehitusteatis), or `11525` (andmete esitamise teatis). Returns full document. |
| `/api/document/v1/document/{docNr}` | GET/PUT/DELETE | Get / save / delete draft document |
| `/api/document/v1/document/{docNr}/buildings` | POST | Add buildings — body `{"ehrCodes": [...]}` |
| `/api/document/v1/document/{docNr}/buildings/{ehrCode}` | DELETE | Remove building |
| `/api/document/v1/document/{docNr}/building/{ehrCode}/buildingBody/{kehandId}` | GET/PUT | Building body data (coordinates, spatial shape) |
| `/api/document/v1/document/{docNr}/buildingBody/{kehandId}/buildingPart` | POST | Add building part |
| `/api/document/v1/document/{docNr}/buildingBody/{kehandId}/buildingPart` | PUT | Update building part |
| `/api/document/v1/document/{docNr}/building/{ehrCode}` | PUT | Update building (measurements, construction, technical) |
| `/api/document/v1/document/{docNr}/building/{buildingId}/derived-data` | GET | Calculated/aggregated building values |
| `/api/document/v1/document/{docNr}/building/{ehrCode}/heritageAnalyze` | PUT | Heritage check (sends geoJson) |
| `/api/document/v1/document/{docNr}/saveAndValidate` | POST | Validate (saves first) |
| `/api/document/v1/document/{docNr}/completeApplicationChecks` | GET | Validity check — returns `{arrayOfErrors, arrayOfWarnings}` with `path`, `messageCode`, `type` per issue |
| `/api/document/v1/document/{docNr}/submitToProcessing` | PUT | Submit (irreversible) |
| `/api/document/v1/classifiers/{codes}` | GET | Classifier values (comma-separated codes) |
| `/api/building/v2/buildingData?ehr_code={code}` | GET | Building registry data |
| `/api/document/v1/ehbuilding/{ehrCode}` | GET | Building data for summary/comparison view |
| `/api/myviews/v1/search/documents` | POST | Search user's documents |
| `/api/user/v1/person/details` | GET | Current user info (use `id` field as `connectedPerson`) |
| `/api/user/v1/search/searchPerson?input={code}&xRoad=false` | GET | Search person by personal code (returns `personId`, name, citizenship) |
| `/api/file-upload-api/v1/fileWithInfoAndDocRel` | POST | Upload file attachment (multipart: `file`, `fileInfo` JSON, `docNr`, `relType`) |
| `/api/document/v1/document/{docNr}/files` | GET | List document file attachments |
| `/api/document/v1/document/{docNr}/file/{fileId}` | PUT | Update file metadata (send full file object from files list) |
| `/api/file-upload-api/v1/{docNr}/file/{fileId}` | DELETE | Delete file attachment (`fileId` from files list) |
| `/api/classifier/v1/classifier/faty/{documentType}` | GET | File type classifier (returns `fatyId` + `fatyName` for document type) |
| `/api/document/v1/document/building/base/{docType}/{ehrCode}` | GET | **(Ehitusteatis)** Find base documents (e.g. projekteerimistingimused) linked to a building for a given document type |
| `/api/document/v1/prosecutingAuthority/{buildingId}` | GET | **(Ehitusteatis)** Auto-resolve prosecuting authority (menetlev asutus) from building |
| `/api/document/v1/document/{docNr}/rights` | GET | **(Ehitusteatis)** Check user permissions on document |
| `/api/proceeding/v1/proceeding/{docNr}` | GET | **(Ehitusteatis)** Get proceeding status (404 = no proceeding yet) |
| `/api/proceeding/v1/auth/document/userrole?docNr={docNr}` | GET | **(Ehitusteatis)** User's role in proceeding |
| `/api/building-project-file/v1/application/{docId}/project/current` | GET | **(Ehitusteatis)** Current construction project files |
| `/api/building-project-file/v1/application/{docId}/project/create-options` | GET | **(Ehitusteatis)** Options for creating/uploading construction project |
| `/api/building-project-file/v1/config` | GET | **(Ehitusteatis)** Construction project file upload config |
| `/api/building/v2/buildingSecureData?ehr_code={code}` | GET | Secure building data (restricted fields) |
| `/api/area/v1/public/area/buildingPermits?lon={lon}&lat={lat}` | GET | Check area building permits by coordinates |
| `/api/user/v1/user/possiblesupervisors/{personId}/{areaCode}` | GET | **(Ehitusteatis)** Possible supervisors for the area |
| `/api/document/v1/document/kek/{docNr}/buildingRelatedEnergyCertificates` | GET | Energy certificates related to buildings in the document |
