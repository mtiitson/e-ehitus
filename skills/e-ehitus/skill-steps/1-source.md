# Step 1 — Data source

**Ask first:** "Do you have an architecture/design project (seletuskiri, drawings) I can read?"

- **Yes** → ask for the folder path, then read all PDFs/documents to extract:
  - Address and cadastral unit code
  - EHR code (if existing building)
  - Measurements: ehitisealune pind, suletud netopind, kõrgus, pikkus, laius, maht, korruste arv
  - Construction materials: vundament, välisseinad, vahelaed, katus
  - Technical systems: vesi, kanalisatsioon, küte, energiakandja, ventilatsioon
  - Usage purposes (kasutamise otstarve) and floor areas per purpose
  - Persons: architect, project author, contact details if present

- **No** → ask the user directly for:
  - Address or EHR code to locate the building
  - Any data needed for the specific document type (see workflow file)

Collect everything you can from the source documents before making any API calls. Surface any fields that are absent or ambiguous — do not guess.
