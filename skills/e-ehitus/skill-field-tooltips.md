# EHR Form Field Tooltips

Scraped from the live EHR UI (`https://livekluster.ehr.ee/ui/ehr/v1/document?docNr=...`) using agent-browser. Covers ehitusloa taotlus (11271) form fields. Update by re-running the scrape if tooltips change.

---

## Ehitised tab — Ehitustegevuse info

**Hoone liik**
Hoone liik vastavalt ehitusseadustiku lisale nr 1 või nr 2. See võib olla: - elamu ja/või selle teenindamiseks vajalik hoone (nt ühepereelamu, kortermaja, garaaž elumaja juures) või - mitteelamu (nt büroo, teater).

**Ehitisealune pind ja kõrgus**
Ehitise andmete põhjal vastavalt ehitusseadustiku lisale nr 1 või nr 2 süsteemi poolt arvutatud hoone üldised mõõtmed, millest sõltub ehitustegevuse loakohustuslikkus.

**Kavandatav tegevus**
Uue ehitise puhul on alati ehitustegevus "püstitamine", olemasoleva ehitise puhul võib olenevalt dokumendist olla: - ümberehitamine - laiendamine - osa asendamine samaväärsega - lammutamine.

**See tegevus on**
Ehitustegevus võib olla: - kooskõlastamist mitte vajav - teatisekohustuslik - teatisekohustuslik koos ehitusprojektiga - loakohustuslik (vaja on lisada ehitusprojekt). Vastavalt ehitusseadustiku lisale nr 1 või nr 2 süsteemi poolt arvutatud.

---

## Ehitised tab — Ehitise üldinfo

**Ehitise aadress**
Ehitise aadress.

**Ehitise kood**
Unikaalne ehitise kood, mille loob Ehitisregister. Nimetatud ka kui EHR kood.

**Ehitise liik**
Hoone või rajatis.

**Ehitise seisund**
Ehitisregistrile esitatud dokumentidest lähtuv ehitise elukaare etapp. Näiteks ehitusluba antud, ehitamisel, kasutusel, lammutatud.

**Ehitise nimetus**
Ehitisele antav vabatekstiline nimi, mis iseloomustab antud ehitist, aitab ehitist leida ja eristada. Näiteks suitsusaun, roigasaed, Teletorn.

**Omandi liik**
Kinnisasi või vallasasi.

**Esmase kasutuselevõtu aasta**
Ehitise valmimise aasta või ehitise esimese kasutusteatise või kasutusloa ehitisregistrisse kandmise aasta. Ehitise esmase kasutuselevõtu aasta on oletuslik, kui see on tuletatud kaudsete allikate põhjal, näiteks ajaloolised ortofotod ja kaardid.

**Esmase kasutuselevõtu aasta on oletuslik**
Ehitise esmase kasutuselevõtu aasta on oletuslik, kui see on tuletatud kaudsete allikate põhjal, näiteks ajaloolised ortofotod ja kaardid.

**Ajutise ehitise kavandatav kasutamise lõpp**
Kuupäev, millal on plaanis lõpetada ajutise ehitise kasutamine.

---

## Ehitised tab — Mõõdud ja pinnad

**Ehitisealune pind (m²)**
Ehitisealune pind näitab, kui suure ala võtab ehitis ära maapinnast. Pind saadakse ehitise maa-aluse ja maapealse osa projektsiooniga maapinnale. Ehitisealuse pinna sisse ei pea arvestama väiksemaid detaile, näiteks alla 1 m laiust räästast, disainielemente, alla 2 m² suurust varikatust. Mõõdetakse ruutmeetrites. Täpsem arvutusmeetod on toodud määruses "Ehitise tehniliste andmete loetelu ja arvestamise alused" §19.

**Maapealse osa alune pind (m²)**
Ehitise maapealse osa projektsioon maapinnal. Pinna sisse ei pea arvestama väiksemaid detaile, näiteks alla 1 m laiust räästast, disainielemente, alla 2 m² suurust varikatust. Kui ehitisel pole maapealsest osast suuremat maa-alust osa, siis on maapealse osa alune pind sama, mis ehitisealune pind. Mõõdetakse ruutmeetrites. Täpsem arvutusmeetod on toodud määruses "Ehitise tehniliste andmete loetelu ja arvestamise alused" §19.

**Absoluutne kõrgus (m)**
Ehitise kõrgus kindlaksmääratud keskmisest merepinnast. 1. jaanuarist 2018 loetakse Eestis absoluutset kõrgust Amsterdami nullist. Enne seda mõõdeti absoluutset kõrgust Kroonlinna nullist. Absoluutset kõrgust mõõdetakse meetrites.

**Suletud netopind (m²)**
Kõigi põrandapindade summa (nimetatud ka kui kasulik pind) ruutmeetrites. Hoone suletud netopind arvutatakse automaatselt kokku hooneosade pindadest: eluruumide pinnad + mitteeluruumide pinnad + üldkasutatavad pinnad + tehnopinnad. Suletud netopinna sisse ei arvestata seinte ja ukseavade alla jäävat pinda ning võetakse arvesse vaid ruumiosad, kus ruumi kõrgus on vähemalt 1,6 meetrit.

> **Note:** `suletudNetopind` is derived from building parts — setting it directly in a PUT is ignored. Create hooneosad first.

**Köetav pind (m²)**
Ehitise kõikide nende ruumide suletud netopind, mille õhutemperatuuri reageerimist välisõhu temperatuuri muutustele me võimalusel väldime (näiteks talvel kütame, suvel jahutame). Arvestatakse ruutmeetrites ja arvutatakse automaatselt kokku hooneosade köetavatest pindadest.

**Toatemperatuuriga pind (m²)**
Ehitise kõikide köetavate pindade osa, millest on maha arvestatud madala temperatuuriga pind. Madala temperatuuriga pinnaks loetakse pinda, kus ei hoita tavapärast toatemperatuuri ja mida köetakse jäätumise vältimiseks. Arvestatakse ruutmeetrites ja arvutatakse automaatselt kokku hooneosade toatemperatuuriga pindadest.

**Kõrgus (m)**
Vahemaa vahetult ehitist ümbritseva maapinna või katendi keskmisest kõrgusest ehitise kõrgeima punktini. Keskmine leitakse maapinna kõrgeima ja madalaima punkti kõrguse liitmisel ning kahega jagamisel. Kõrgust mõõdetakse meetrites.

**Sügavus (m)**
Hoone sügavus on vahemaa vahetult ehitist ümbritseva maapinna või katendi keskmisest kõrgusest hoone madalaima korruse viimistletud põrandapinnani. Rajatise sügavus on vahemaa vahetult ehitist ümbritseva maapinna või katendi keskmisest kõrgusest ehitise kõige alumise punktini (näiteks kaevu sügavus). Sügavust mõõdetakse meetrites.

**Pikkus (m)**
Ristkülikukujulise ehitise pikim külg. Kui hoone ei ole ristkülik, siis moodustatakse välispiirete ümber mõtteline ristkülik ja mõõdetakse selle pikemat külge. Pikkuse sisse arvestatakse ka ehitisealuse pinna sees olevad rõdud ja varjualused.

**Laius (m)**
Ristkülikukujulise ehitise lühim külg. Kui hoone ei ole ristkülik, siis moodustatakse välispiirete ümber mõtteline ristkülik ja mõõdetakse selle lühemat külge. Laiuse sisse arvestatakse ka ehitisealuse pinna sees olevad rõdud ja varjualused.

**Maht (m³)**
Ehitise maapealse ja maa-aluse ruumala summa kuupmeetrites. Arvutatakse ehitise välispiiretest (sh seinad, katus, vundament) lähtudes. Mahu sisse ei arvata tehnoseadmeid ega väiksemaid detaile.

**Maapealse osa maht (m³)**
Ehitise maapealne ruumala kuupmeetrites. Arvutatakse maapinnast ja ehitise välispiiretest (sh seinad ja katus) lähtudes. Mahu sisse ei arvata tehnoseadmeid ega väiksemaid detaile.

**Maapealsete korruste arv**
Hoones asuvate maa-pealsete horisontaalsete tasapindade arv tingimusel, et iga järgnev tasapind asub alumisest vähemalt 1,5 meetrit kõrgemal. Pööningu- või katusekorrust loetakse korruseks juhul, kui seal paiknevaid ruume on võimalik kasutada eluruumina või mitteeluruumina. Kui maapinna kalde tõttu on osa korrusest maa all ja osa maa peal, loetakse korrus maapealseks korruseks.

**Maa-aluste korruste arv**
Hoones asuvate maa-aluste horisontaalsete tasapindade arv tingimusel, et maa-alune tasapind asub vähemalt pool ruumi kõrgust maapinnast allpool ja selle kohal asuv tasapind ei ole kõrgemal kui 2,5 meetrit hoonet ümbritsevast keskmisest maapinnast või katendist. Kui maapinna kalde tõttu on osa korrusest maa all ja osa maa peal, loetakse korrus maapealseks korruseks.

---

## Ehitised tab — Tehnilised andmed

**Soojusvarustuse liik**
Kaugküte - keskses asukohas toodetud soojuse jaotamise süsteem paljudele hoonetele. Näiteks linnaosa ülene soojavarustus. Lokaalküte - hoone või hoonegrupi keskne soojusvarustuse süsteem (näiteks katel koos kohaliku keskküttetorustiku ja radiaatoritega). Kohtküte - ruumikeskne soojavarustus (näiteks ahi toas).

**Võrgu- või mahutigaas**
Märge selle kohta, kas hoones on gaasipliit, gaasiboiler, gaasiküte või muu selline kohtkindel gaasipaigaldis.

---

## Ehitised tab — Ehitise kuju (kehand)

**Nimetus**
Olemas oleva ehitise nimi ja selle ruumikuju nimetus.

**Koordinaadid**
Koordinaadid märgivad objekti asukohta ruumis. Eestis on kasutusel L-EST97 tasapinnaliste ristkoordinaatide süsteemi kaardiprojektsioon EPSG koodiga (SRID) 3301.

*(Checkbox) Koordinaadid on saadud geodeetilise mõõdistustöö alusel*
Checkbox that marks the coordinates as coming from a geodetic survey (mõõdistuselt). Sets `geoSource: "M"` in the API.

*(Import button tooltip)*
Kui oled sisestanud kujundi koordinaadid faili üleslaadimise teel või käsitsi koordinaatide väljal, saad objekti üle kanda kaardile. Kui sisestasid joone või punkti, vajuta joone või punkti eelvaate nupule. Kui sisestasid pinna (hoone puhul ainuvõimalik valik), vajuta pinna eelvaate nupule.

---

## Lisad tab — Ehitusprojekt (construction project files)

**Projekti tunnus**
Projekti tunnus.

**Projekti staadium**
Projekti staadium.

**Projektiosa**
Projektiosa.

**Jrk nr**
Jrk nr.

**Grupi nimetus**
Grupi nimetus.

**Fail on muutunud**
Fail on muutunud.

---

## Lisad tab — Keskkonnaluba (KOTKAS)

**Loa number**
KOTKAS süsteemis antud keskkonnakaitseloa number.

**Menetluse number**
KOTKAS süsteemis antud keskkonnakaitseloa menetluse number.

**Kuupäev**
Loa andmise kuupäev või taotluse menetlusse võtmise kuupäev.
