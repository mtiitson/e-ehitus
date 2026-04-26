# Workflow: Ehitusloa taotlus (11271)

**Use when:** the building requires ehitusluba — typically new buildings >60 m², buildings >5m, or as determined by the threshold table in `lisa1-ehitusseadustik.md`. The system auto-switches between 11271 and 11201 after Step 4 based on the actual dimensions.

## Step sequence

```
1 → 2 → 3 → 3a → 3b → 4 → 4b → 5 → 6 → 7
```

Read the corresponding step file for each step. Notes specific to ehitusluba are below.

## Step-specific notes

### Step 2
Search for drafts with `documentTypeCode: ["11271", "11201"]` — the system may have already switched type on a prior draft.

### Step 3a (base documents)
Always check. Projekteerimistingimused is common for ehitusluba and should be linked if present.

### Step 4 (building data)
**Ehitustegevuse info is required.** Fill `constructionType` (hoone liik) and `kavandatavTegevus` (kavandatav tegevus) before other fields. These determine whether the system switches to 11201.

### Step 5 (persons)
Required roles (read from server — do not hardcode):
- **Taotleja** — auto-added as the authenticated user
- **Ehitusprojekti koostaja** — the architect / project author
- **Auditi koostaja** — energy audit author (if energy audit required)
- **Mõõdistusprojekti koostaja** — geodetic survey author

Ask the user for contact details (email, phone) for each person if not in the project documents.

### Step 6 (attachments)
Required:
- **Ehitusprojekt** (construction project files) with digital signatures per project part
- **Riigilõivu maksekorraldus** (state fee payment order) — see `stateFeeDto` in the document for the correct amount and reference number

Optional: other supporting documents (kooskõlastused, load, etc.) as needed.

### Step 7 (validate)
The `general.validation.applicant.empty` error means roles are missing, not that taotleja is wrong.

After handing off, the user must:
1. Have ehitusprojekt digitally signed by each responsible specialist
2. Submit (Esitan) and sign with ID-card / Mobile-ID
