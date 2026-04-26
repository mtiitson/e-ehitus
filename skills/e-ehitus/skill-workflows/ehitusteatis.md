# Workflow: Ehitusteatis (11201)

**Use when:** the building activity requires ehitusteatis but not ehitusluba — typically new buildings 20–60 m² and ≤5m, or renovation/extension of existing buildings as per `lisa1-ehitusseadustik.md`. The system auto-switches between 11201 and 11271 after Step 4 based on actual dimensions — start with whichever seems correct and let the system correct it.

## Step sequence

```
1 → 2 → 3 → 3a → 3b → 4 → 4b → 5 → 6 → 7
```

The sequence is identical to ehitusluba. The differences are in scope and required fields.

## Step-specific notes

### Step 2
Search with `documentTypeCode: ["11201", "11271"]` — include both since auto-switching may have occurred.

### Step 3a (base documents)
Check for linked projekteerimistingimused. Less common than for ehitusluba but still possible.

### Step 4 (building data)
**Ehitustegevuse info is required** — same as ehitusluba. Fill `constructionType` and `kavandatavTegevus` first.

For renovation/extension (ümberehitamine, laiendamine): ehitusteatis typically does not require ehitusprojekt unless the building category requires it (see `lisa1-ehitusseadustik.md`).

### Step 5 (persons)
Required roles (always read from server):
- **Taotleja** — auto-added
- Additional roles depend on building category and tegevus — e.g. ehitusprojekti koostaja is required when ehitusprojekt must be attached

Fewer mandatory roles than ehitusluba in most cases.

### Step 6 (attachments)
- **Ehitusprojekt** — required only for categories that explicitly require it (see `lisa1-ehitusseadustik.md`, column "Ehitusteatis + ehitusprojekt")
- **Riigilõivu maksekorraldus** — check `stateFeeDto`; ehitusteatis may not require a state fee for all categories
- Other attachments as needed

### Step 7 (validate)
Same validation endpoint. The prosecuting authority (`prosecutingAuthority`) is auto-resolved from the building after Step 3 — verify it populated correctly before handing off.
