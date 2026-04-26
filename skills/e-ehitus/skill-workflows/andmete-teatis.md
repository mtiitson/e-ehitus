# Workflow: Andmete esitamise teatis (11525)

**Use when:** updating building registry data for an existing building — no construction activity, just correcting or completing the EHR record.

## Step sequence

```
1 → 2 → 3 → 3b → 4 → 4b → 7
```

Steps 3a, 5, and 6 are skipped entirely.

## What's different

### No ehitustegevuse info (Step 4)
Skip the "Ehitustegevuse info" section. Do not set `constructionType` or `kavandatavTegevus` — these fields do not exist on 11525.

No dynamic type switching — 11525 stays 11525.

### No base document check (Step 3a)
Skip entirely. Projekteerimistingimused is not relevant for a data update.

### No persons step (Step 5)
Andmete esitamise teatis does not require the full role set. The authenticated user (taotleja) is sufficient. Skip Step 5 unless the server's `requiredRoles` shows otherwise.

### No attachments step (Step 6)
No ehitusprojekt or state fee required. Skip Step 6. If the user wants to attach supporting evidence (e.g. a geodetic survey report), use the regular attachments API, but this is optional.

### Building data scope (Step 4)
Focus on whatever data is being corrected:
- Measurements (pind, kõrgus, maht, korruste arv)
- Construction materials
- Technical systems
- Usage purposes

Keep all existing correct values. Only update the fields the user wants to change.

### Building body (Step 4b)
Create or update the kehand only if coordinates are being added/corrected. If the building already has correct spatial data in the registry, skip 4b.

## Step 2 — draft search

```bash
# Search specifically for 11525 drafts
-d '{"connectedPerson": USER_ID, "documentState": ["DO_DOKUSEIS_KOOSTAMISEL"], "documentTypeCode": ["11525"], "offset": 0, "limit": 20}'
```
