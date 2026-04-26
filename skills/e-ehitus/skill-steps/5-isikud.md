# Step 5 — Fill persons (Isikud tab)

Required roles are determined server-side — do not hardcode. Always read them from the document:

```bash
curl -s "$EHR/api/document/v1/document/DOC_NR" -H "Authorization: Bearer $TOKEN" \
  | jq '{required: [.relatedEntities.requiredRoles[].value], present: [.relatedEntities.persons[].role[].value]}'
```

The difference between `required` and `present` is what needs to be filled.

## Search for a person

```bash
curl -s "$EHR/api/user/v1/search/searchPerson?input=PERSONAL_CODE&xRoad=false" \
  -H "Authorization: Bearer $TOKEN" | jq '{id, firstName, familyName, idCode, citizenship}'
```

## Add person to document

Fetch the full document, add the person to `relatedEntities.persons[]`, PUT it back:

```bash
curl -s "$EHR/api/document/v1/document/DOC_NR" \
  -H "Authorization: Bearer $TOKEN" > /tmp/document.json
# Edit /tmp/document.json — add person object to relatedEntities.persons[]
curl -s -X PUT "$EHR/api/document/v1/document/DOC_NR" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/document.json | jq .
```

Person object field mapping:

| searchPerson field | persons[] field |
|---|---|
| `id` | `personId` |
| `idCode` | `personalCode` |
| `firstName` | `firstName` |
| `familyName` | `surname` |
| `citizenship` | `citizenship` (expand to `{code, value, description}`) |
| (user input) | `role[]`, `email`, `phoneNumber` |

**Contact details are required for submission.** Check that `email` and `phoneNumber` are populated for each person. If not derivable from project data, ask the user before proceeding.
