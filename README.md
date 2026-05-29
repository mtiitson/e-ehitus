# e-ehitus

Claude Code'i skill ehitisregistriga töötamiseks ([ehr.ee](https://www.ehr.ee) / e-ehitus platvorm).

Automatiseerib ehitusdokumentide ettevalmistamise ja esitamise EHR API kaudu — sh arhitektuuriprojekti lugemine, kõikide väljade täitmine, lisade üleslaadimine ja dokumendi üleandmine allkirjastamiseks.

## Mida see teeb

- **Ehitusloa taotlus**
- **Ehitusteatis** 
- **Andmete esitamise teatis**
- **Projekteerimistingimuste taotlus**
- TARA autentimine (Mobiil-ID, Smart-ID) 
- Täielik ehitise andmete sisestus: mõõtmed, materjalid, tehnilised süsteemid, kehandid
- Lisade üleslaadimine: ehitusprojekt, riigilõivu maksekorraldus, muud dokumendid

## Paigaldamine

### Claude Code CLI

```bash
/plugin marketplace add mtiitson/e-ehitus
/plugin install e-ehitus@mtiitson-e-ehitus
```

### Claude Code Desktop

1. Vajuta Customize
2. Personal Plugins juures vajuta '+'
3. Create Plugin > Add marketplace
4. Sisesta `mtiitson/e-ehitus`
5. Vali E ehitus
6. Install


## Eeldused

- Node.js 18+
- `curl` 
- `jq` 


## Kasutamine

Pärast skilli paigaldamist kirjelda lihtsalt, mida soovid teha:

> "Valmista ette ehitusteatis 45 m² sauna jaoks aadressil [aadress]. Siin on arhitektuuriprojekt: /path/to/project/"

> "Vaata minu olemasolevaid mustandeid ehr.ee-s ja jätka ehitise andmete täitmist"

> "Laadi ehitusprojekt üles dokumendile 2611271/04701"

## Litsents

MIT — vaata [LICENSE](LICENSE)
