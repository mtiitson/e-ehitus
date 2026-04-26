# e-ehitus

Claude Code'i skill ehitisregistriga töötamiseks ([ehr.ee](https://www.ehr.ee) / e-ehitus platvorm).

Automatiseerib ehitusdokumentide ettevalmistamise ja esitamise EHR API kaudu — sh arhitektuuriprojekti lugemine, kõikide väljade täitmine, lisade üleslaadimine ja dokumendi üleandmine allkirjastamiseks.

## Mida see teeb

- **Ehitusloa taotlus** (11271) — ehitusloa taotlemine
- **Ehitusteatis** (11201) — ehitusteatise esitamine
- **Andmete esitamise teatis** (11525) — ehitisregistri andmete uuendamine
- TARA autentimine (Mobiil-ID, Smart-ID, ID-kaart) läbi bundlitud Node.js skripti
- Täielik ehitise andmete sisestus: mõõtmed, materjalid, tehnilised süsteemid, kehandid
- Lisade üleslaadimine: ehitusprojekt, riigilõivu maksekorraldus, muud dokumendid

## Paigaldamine

### Claude Code

```bash
/plugin marketplace add mtiitson/e-ehitus
/plugin install e-ehitus@mtiitson-e-ehitus
```

### Käsitsi

Klooni repositoorium ja suuna Claude Code `skills/` kausta, või kopeeri `skills/e-ehitus/` oma kohalikku skills kausta.

## Eeldused

- Node.js 18+ (Claude Code'iga kaasas)
- `curl` (olemas macOS/Linuxis)
- `jq` — macOS-il `brew install jq`

## Autentimine

Autentimine käib läbi TARA (riigi autentimisteenus) → Keycloak. Käivita bundlitud skript interaktiivselt:

```bash
node skills/e-ehitus/scripts/ehr-auth.js --mobile-id
node skills/e-ehitus/scripts/ehr-auth.js --smart-id
```

Token salvestatakse `~/ehr-token.json` faili ja uuendatakse API päringute ajal automaatselt.

## Kasutamine

Pärast skilli paigaldamist kirjelda lihtsalt, mida soovid teha:

> "Valmista ette ehitusteatis 45 m² sauna jaoks aadressil [aadress]. Siin on arhitektuuriprojekt: /path/to/project/"

> "Vaata minu olemasolevaid mustandeid ehr.ee-s ja jätka ehitise andmete täitmist"

> "Laadi ehitusprojekt üles dokumendile 2611271/04701"

## Litsents

MIT — vaata [LICENSE](LICENSE)
