# EHR Classifier Reference

> Captured: 2026-04-26. Trust the live API over this file if values conflict — classifiers change occasionally.

Classifiers are opaque codes used where enums would normally appear. Each field that takes a classifier value stores the `value` string (e.g. `"EHITIS_SEISUND_OLEMA"` or `"1103"`).

**To look up values not listed here:**
```
api_request GET /api/document/v1/classifiers/KASUTUS_OTSTARVE
```
Response is `{ "CODE": [{ value, description, additionalDescription, validToDate }, ...] }`. Filter out entries where `validToDate` is in the past.

**If a value the user expects doesn't appear in the tables below**, the embedded list may be stale (classifiers change when regulations are updated). Verify by fetching fresh values:
```
api_request GET /api/document/v1/classifiers/KONS_VALISV
```
(substitute whichever classifier code is in question — comma-separate multiple). Trust the API response over the embedded tables.

---

## EHITIS_SEISUND — Building lifecycle status
| Value | Description |
|-------|-------------|
| `EHITIS_SEISUND_KAVAN` | Kavandatav |
| `EHITIS_SEISUND_PYSTI` | Püstitamisel |
| `EHITIS_SEISUND_OLEMA` | Olemas |
| `EHITIS_SEISUND_LAMEL` | Lammutamisel |
| `EHITIS_SEISUND_LAMUT` | Lammutatud |
| `EHITIS_SEISUND_EHITAMISEL` | Ehitamisel |
| `EHITIS_SEISUND_KASUTUSEL` | Kasutusel |
| `EHITIS_SEISUND_KASUT_OSALINE` | Kasutusel osaliselt |
| `EHITIS_SEISUND_KASUT_MAAS` | Kasutusest maas |
| `EHITIS_SEISUND_MAARAMATA` | Määramata |
| `EHITIS_SEISUND_PLANEERITAV` | Planeeritav |
| `EHITIS_SEISUND_ARHIIVIS` | Arhiivis |
| `EHITIS_SEISUND_LAMMUTATUD` | Lammutatud |

## EHITIS_OMANDI_LIIK — Ownership type
| Value | Description |
|-------|-------------|
| `EHITIS_OMANDI_LIIK_KINNIS` | Kinnisasi (real property — default) |
| `EHITIS_OMANDI_LIIK_VALLAS` | Vallasasi (movable property) |
| `EHITIS_OMANDI_LIIK_VALLASRO` | Reaalosa kui vallasasi |

## Construction materials — field→classifier mapping

Each `constructionAndMaterials` field in `BuildingDataDto` uses a **different** classifier code. Do NOT reuse `KONS_KKONSTR` for outer walls etc.

| `BuildingDataDto` field | Classifier code | Notes |
|---|---|---|
| `basementTypes` | `KONS_VUND` | Use `[]` if no basement |
| `loadBearingsAndStiffeninngTypes` | `KONS_KKONSTR` | Load-bearing structure material |
| `outerWallsTypes` | `KONS_VSEIN` | **NOT** `KONS_KKONSTR` — separate classifier |
| `outerWallsExteriorTypes` | `KONS_VALISV` | Facade finish/cladding |
| `ceilingLoadBearingTypes` | `KONS_VLAED` | Floor/ceiling slabs |
| `roofLoadBearingTypes` | `KONS_SARIKAD` | Roof structure (rafters) |
| `roofMaterialTypes` | `KONS_KATUS` | `609`=bituumen/PVC (not `802`) |
| `doEhTehnaRelatedClassifiers` | — | Flat mirror of all construction classifier values — browser auto-populates it; safe to send `[]` or a copy of all values |

---

## KONS_VUND — Foundation type
| Value | Description |
|-------|-------------|
| `102` | Puudub |
| `103` | Madalvundament (shallow foundation) |
| `104` | Vaivundament (piled foundation) |
| `199` | Muu |

## KONS_KKONSTR — Load-bearing structure
| Value | Description |
|-------|-------------|
| `202` | Puudub |
| `211` | Looduslik kivi |
| `212` | Monoliitne raudbetoon |
| `213` | Monteeritav raudbetoon |
| `214` | Plastmass |
| `215` | Puit |
| `217` | Väike- või suurplokk (vaht, mull, kergkruus, kärg, betoon) |
| `218` | Tellis |
| `220` | Metall |
| `299` | Muu |

## KONS_VSEIN — Interior walls
| Value | Description |
|-------|-------------|
| `502` | Puudub |
| `503` | Looduslik kivi |
| `508` | Väike- või suurplokk |
| `509` | Vahetäitega sõrestik |
| `510` | Plekk |
| `511` | Tellis |
| `512` | Betoon |
| `513` | Tsementkiudplaat |
| `514` | Palk |
| `515` | Laudis |
| `516` | Mitmekihiline raudbetoonpaneel |
| `517` | Mitmekihiline teraspaneel |
| `518` | Plastmass |
| `519` | Klaas |
| `599` | Muu |

## KONS_VALISV — Exterior walls / facade
| Value | Description |
|-------|-------------|
| `702` | Puudub |
| `703` | Krohv |
| `704` | Looduslik kivi |
| `705` | Metall (sh plekk, profiilplekk) |
| `706` | Keraamiline tellis |
| `709` | Puit (vooder) |
| `710` | Puit (palk) |
| `711` | Betoon |
| `712` | Fassaadiplaat (sh tsementkiudplaat) |
| `713` | Klaas |
| `714` | Väike- või suurplokk |
| `799` | Muu |

## KONS_VLAED — Floors/slabs
| Value | Description |
|-------|-------------|
| `402` | Puudub |
| `403` | Plekkprofiil |
| `404` | Terasferm või -tala |
| `405` | Monoliitne raudbetoon |
| `406` | Monteeritav raudbetoon |
| `407` | Puit |
| `499` | Muu |

## KONS_SARIKAD — Roof structure (rafters)
| Value | Description |
|-------|-------------|
| `902` | Puudub |
| `903` | Plekkprofiil |
| `904` | Terasferm või -tala |
| `905` | Monoliitne raudbetoon |
| `906` | Monteeritav raudbetoon |
| `907` | Puit |
| `908` | Muu |

## KONS_KATUS — Roof covering material
| Value | Description |
|-------|-------------|
| `602` | Puudub |
| `604` | Katusekivi |
| `605` | Plekk |
| `607` | Puit/laast |
| `608` | Roog/põhk |
| `609` | Bituumen, PVC plaat või rullmaterjal |
| `615` | Plaatmaterjal (sh tsementkiudplaat) |
| `699` | Muu |

## TEHNO_VESI — Water supply
| Value | Description |
|-------|-------------|
| `1102` | Puudub |
| `1103` | Võrk (grid) |
| `1104` | Lokaalne, salvkaev |
| `1105` | Lokaalne, puurkaev |
| `1106` | Muu |

## TEHNO_KANAL — Sewerage
| Value | Description |
|-------|-------------|
| `1402` | Puudub |
| `1403` | Võrk (network) |
| `1404` | Lokaalne, puhasti |
| `1405` | Lokaalne, mahuti |
| `1406` | Muu |

## TEHNO_SOOJUSA — Heat source (Soojusallika liik)
| Value | Description |
|-------|-------------|
| `2502` | Puudub |
| `2503` | Katel |
| `2506` | Päikesekollektor |
| `2507` | Ahi, kamin, pliit |
| `2508` | Elektrootseküte |
| `2509` | Muu |
| `2510` | Kaugküte |
| `2515` | Heitvee soojustagasti |
| `2516` | Kondensatsioonikatel |
| `2517` | Soojaveeboiler |
| `2518` | Maasoojuspump |
| `2519` | Õhk-vesi soojuspump |
| `2520` | Õhk-õhk soojuspump |
| `2521` | Väljatõmbeõhu soojuspump |
| `2522` | Koostootmisseade |

Note: `TEHNO_SOOJAVLIIK` (Soojusvarustuse liik) is deprecated since 2024 — use `TEHNO_SOOJUSA` instead.

## TEHNO_ENERGIA — Energy carrier (Energiakandja liik)
| Value | Description |
|-------|-------------|
| `2602` | Puudub |
| `2607` | Elekter |
| `2614` | Maagaas |
| `2615` | Vedelgaas |
| `2616` | Puitpellet |
| `2617` | Segapuit |
| `2618` | Kütteõli |
| `2619` | Kivisüsi |
| `2620` | Turvas |
| `2621` | Soojus (kaugküte) |
| `2622` | Soojus (tõhus kaugküte) |
| `2623` | Vesi (kaugjahutus) |
| `2624` | Vesi (tõhus kaugjahutus) |
| `2625` | Biogaas |
| `2612` | Muu |

## TEHNO_ELEKLIIK — Electrical system type
| Value | Description |
|-------|-------------|
| `2302` | Puudub |
| `2303` | Võrk (grid-connected) |
| `2304` | Fossiilkütusel põhinev |
| `2305` | Tuulenergial põhinev |
| `2306` | Päikeseenergial põhinev |
| `2307` | Hüdroenergial põhinev |
| `2308` | Koostootmisseade |
| `2312` | Muu |

## TEHNO_VENT — Ventilation type
| Value | Description |
|-------|-------------|
| `2701` | Puudub |
| `2703` | Loomulik ventilatsioon |
| `2704` | Mehaaniline väljatõmme |
| `2705` | Mehaaniline sissepuhe ja väljatõmme |
| `2710` | Mehaaniline väljatõmme soojustagastusega (väljatõmbeõhu soojuspump) |
| `2712` | Mehaaniline sissepuhe ja väljatõmme soojustagastusega |
| `2708` | Muu |

## TEHNO_JAHUTUSA — Cooling source
| Value | Description |
|-------|-------------|
| `20102` | Puudub |
| `20103` | Kompressorjahutus |
| `20104` | Vabajahutus |
| `20105` | Kaugjahutus |
| `20199` | Muu |

## TEHNO_MAJAPIDAMISGAAS — Household gas
| Value | Description |
|-------|-------------|
| `20402` | Puudub |
| `20403` | Võrgugaas |
| `20404` | Balloonigaas |

## TEHNO_WC — Toilet type (building part level)
| Value | Description |
|-------|-------------|
| `2001` | Puudub |
| `2002` | Vesiklosett |
| `2003` | Kuivkäimla |
| `2004` | Muu tualett |
| `2005` | Tualett hoones või kinnistul |

(`2000`, `2006` expired — exclude.)

## TEHNO_OPESU — Washing/bath type (building part level)
| Value | Description |
|-------|-------------|
| `1202` | Puudub |
| `1203` | Vann/dušš |
| `1204` | Saun |
| `1205` | Pesemisvõimalus hoones või kinnistul |
| `1206` | Muu pesemisvõimalus |

(`1201` expired — exclude.)

---

## Ehitusteatis-specific classifiers

Fetch on demand:
```
api_request GET /api/document/v1/classifiers/DO_EHITUSTEG_LIIK,DO_EHITUSTEG_LIIK_ALAM,H_TEG,PIND_KORGUS,HL,RL
```

| Classifier code | Description | Used for |
|----------------|-------------|----------|
| `DO_EHITUSTEG_LIIK` | Construction activity type (kavandatav tegevus) | Ehitise püstitamine, ümberehitamine, lammutamine |
| `DO_EHITUSTEG_LIIK_ALAM` | Sub-type of activity | Detailed activity classification |
| `H_TEG` | Activity actions | Building activity specifics |
| `PIND_KORGUS` | Area/height threshold categories | Determines ehitusteatis vs ehitusluba requirement |
| `HL` / `RL` | Building/structure type codes | Hoone liik classification |
| `EHITIS_MALESTIS` | Heritage monument status | Heritage protection check |
| `EHITIS_MUINSUSKAITSE_KATEGOORIA` | Heritage protection category | Heritage protection level |
| `MENSEIS` | Proceeding status | Menetluse seisund |
| `MENTOIMLIIK` | Proceeding action type | Menetlustoimingu liik |
| `MENTOIMSEIS` | Proceeding action status | Menetlustoimingu seisund |
| `TAOTLUSE_POHJUS` | Application reason | Why the ehitusteatis is being filed |
| `ENERGIA_PUUDUMISE_POHJUS` | Reason for missing energy certificate | Energy cert exemption |
| `MARKUSE_POHJUS` | Annotation/note reason | Document notes |

## KASUTUS_OTSTARVE — Usage purpose
402 values from MKM regulation. **Fetch on demand:**
```
api_request GET /api/document/v1/classifiers/KASUTUS_OTSTARVE
```
Search by `description` to match user intent (e.g. "elamu", "saun", "garaaz"). The main purpose = largest floor area; EHR auto-calculates from building parts.
