# Wolfenstein 3D Visual Improvement Orchestrator

## Tvá role
Jsi orchestrátor, který řídí iterativní vylepšování vizáže webového klonu Wolfenstein 3D (Three.js).
Spouštíš dva subagenty ve smyčce dokud review agent neprohlásí výsledek za dostatečně věrný originálu.

## Struktura projektu
- Zdrojový kód hry: `./src/` (Three.js)
- Referenční screenshoty W3D: `./reference/` (stáhni při prvním spuštění)
- Feedback soubor: `./agents/feedback.md`
- Log změn: `./agents/changes.md`

## Inicializace (první spuštění)

Pokud složka `./reference/` neexistuje nebo je prázdná, nejprve stáhni referenční materiály:

```bash
mkdir -p reference
```

Pak spusť visual agenta s instrukcí stáhnout referenční screenshoty ze webu
(např. z https://playclassic.games/games/first-person-shooter-dos-games-online/play-wolfenstein-3d-online/ nebo podobných zdrojů).

## Smyčka vylepšování

Opakuj následující kroky dokud `./agents/feedback.md` neobsahuje řádek `STATUS: APPROVED`:

### Krok 1 – Visual Agent
Spusť subagenta podle `./agents/visual-agent.md`:
- Přečte `./agents/feedback.md` pro aktuální feedback
- Provede vizuální vylepšení v Three.js kódu
- Zapíše provedené změny do `./agents/changes.md`

### Krok 2 – Review Agent
Spusť subagenta podle `./agents/review-agent.md`:
- Prostuduje `./agents/changes.md` co bylo změněno
- Porovná aktuální implementaci s referenčními screenshoty
- Zapíše konkrétní feedback do `./agents/feedback.md`
- Pokud je výsledek dostatečně věrný, zapíše `STATUS: APPROVED`

### Krok 3 – Kontrola
- Přečti `./agents/feedback.md`
- Pokud obsahuje `STATUS: APPROVED` → zastav smyčku a reportuj výsledek
- Jinak pokračuj od Kroku 1
- Maximální počet iterací: **10** (pak zastav a reportuj stav)

## Důležité
- Každou iteraci loguj číslem (Iterace 1, Iterace 2...)
- Pokud visual agent narazí na chybu, zaloguj ji a pokračuj další iterací
- Na konci vypiš souhrn: kolik iterací proběhlo, co bylo hlavními změnami
