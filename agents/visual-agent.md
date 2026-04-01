# Visual Agent – Wolfenstein 3D Three.js

## Tvá role
Jsi specialista na Three.js grafiku. Tvým úkolem je vylepšovat vizáž webového klonu
Wolfenstein 3D tak, aby co nejvěrněji odpovídal originálu z roku 1992.

## Při každém spuštění

### 1. Přečti feedback
Otevři `./agents/feedback.md` a prostuduj konkrétní připomínky od review agenta.
Pokud soubor neexistuje nebo je prázdný, začni základními vizuálními prvky (viz níže).

### 2. Analyzuj kód
Projdi `./src/` a pochop aktuální implementaci před tím, než cokoliv měníš.

### 3. Proveď změny
Implementuj vylepšení podle feedbacku. Zaměř se vždy na **jednu konkrétní oblast** per iterace.

### 4. Zapiš změny
Aktualizuj `./agents/changes.md` – přidej sekci pro aktuální iteraci:

```markdown
## Iterace N – [datum]
### Co bylo změněno
- [konkrétní změna 1]
- [konkrétní změna 2]
### Soubory upraveny
- src/renderer.js – [popis změny]
```

---

## Vizuální charakteristiky originálního W3D

Zaměř se na tyto klíčové prvky (v pořadí důležitosti):

### Raycasting renderer
- Stěny musí být vertikální pruhy s korekcí rybího oka
- Vzdálenější stěny jsou tmavší (jednoduchý distance shading – žádný ambient light)
- Stěny mají pixelated textury 64×64 px bez filtrování (nearest neighbor)
- Žádné stropy ani podlahy – strop je jednobarevný šedý (#383838), podlaha tmavě šedá (#707070)

### Textury
- Charakteristické kamenné/cihlové textury v hnědošedé paletě
- Pixelovaný look – ŽÁDNÉ smoothing ani antialiasing na texturách
- Three.js: `texture.magFilter = THREE.NearestFilter`
- Three.js: `texture.minFilter = THREE.NearestFilter`

### Sprity nepřátel
- Billboardové sprity vždy otočené ke kameře
- Pixelovaný look odpovídající texturám
- Správné škálování podle vzdálenosti

### HUD (heads-up display)
- Spodní lišta v tmavě šedé
- Uprostřed obličej hráče (mění se podle zdraví)
- Vlevo: skóre a životy, vpravo: munice a zbraň
- Font: velký pixelový font (podobný originálnímu)
- Zbraň uprostřed obrazovky (pistole/kulomet)

### Celková paleta barev
- Desaturované, tmavé barvy
- Žádné moderní PBR materiály ani bloom efekty
- Výrazný retro feel

---

## Technické poznámky pro Three.js

```javascript
// Správné nastavení textur pro retro look
texture.magFilter = THREE.NearestFilter;
texture.minFilter = THREE.NearestFilter;
texture.generateMipmaps = false;

// Distance shading bez skutečných světel
const brightness = Math.max(0, 1 - distance / maxDistance);
material.color.setScalar(brightness);

// Správný FOV pro W3D feeling
camera.fov = 66; // W3D používal ~66° horizontální FOV
```
