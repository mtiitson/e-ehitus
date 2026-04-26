# Step 7 — Validate and hand off

## Run validation

```bash
curl -s "$EHR/api/document/v1/document/DOC_NR/completeApplicationChecks" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{errors: .arrayOfErrors, warnings: .arrayOfWarnings}'
```

## Known misleading error codes

| Error code | What it actually means |
|---|---|
| `general.validation.applicant.empty` | Required roles are still unfilled — NOT that taotleja is incomplete. Check `messageValues` for which roles: typically Auditi koostaja, Ehitusprojekti koostaja, Mõõdistusprojekti koostaja. |
| `buildingbody.validation.exists` | No building body (kehand) has been created yet. Go to Step 4b. |

## Hand off to user

Once all API-resolvable errors are cleared, share the document URL:
```
https://livekluster.ehr.ee/ui/ehr/v1/document?docNr=DOC_NR
```

The following steps require the user to act in the browser — they are out of scope for API automation:

- **Ehitusprojekti allkirjad** — project files must be digitally signed by the responsible person for each project part (arhitektuur, konstruktsioonid, etc.)
- **Esitan** — final submission button; triggers a signing flow
- **Document signing** — submission must be signed with ID-card or Mobile-ID

Tell the user: review the document, have the project files signed by responsible parties, then sign and submit via the Esitan button.
