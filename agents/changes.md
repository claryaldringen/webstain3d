# Changes Log

## Iteration 1 — Visual Fidelity Pass

### 1. FOV corrected (src/renderer.js)
- Changed camera FOV from 75 to 66 degrees to match original Wolf3D's field of view

### 2. Distance fog added (src/renderer.js)
- Added `THREE.Fog(0x000000, 1, 16)` for distance-based darkening effect matching original Wolf3D's characteristic wall shading
- Changed scene background from black (0x000000) to ceiling color (CEILING_COLOR / 0x393939) so the fog blends naturally into the ceiling

### 3. Floor/ceiling materials upgraded (src/renderer.js)
- Changed floor and ceiling from `MeshBasicMaterial` to `MeshLambertMaterial` so they respond to lighting and fog

### 4. Procedural BJ face (src/hud.js)
- Replaced broken PNG-based face system (files didn't exist) with procedural canvas-drawn face
- Face shows BJ Blazkowicz with blond hair, blue eyes
- 5 states: healthy (grinning), hurt1 (slight frown), hurt2 (pain + blood), hurt3 (heavy damage + blood), dead (X eyes + blood)
- Pixelated style matching the original game's aesthetic

### 5. HUD styling updated (index.html)
- Background darkened from #545454 to #383838 (closer to original dark gray status bar)
- Value text color changed from white (#fff) to Wolf3D yellow (#FCFC54)
- Added text shadow for depth
- Label color adjusted to #989898
- Border color changed to #686868
- Face container background matches the procedural face background

### Files modified:
- `src/renderer.js` — FOV, fog, scene background, material types
- `src/hud.js` — complete rewrite with procedural face generation
- `index.html` — HUD bar CSS styling

## Iteration 2 — Review Fixes

### 1. Floor/ceiling materials reverted to MeshBasicMaterial (src/renderer.js)
- Changed back from MeshLambertMaterial to MeshBasicMaterial with `fog: false`
- Wolf3D had flat solid color floor/ceiling with no distance shading on them

### 2. Fog parameters adjusted (src/renderer.js)
- Fog color changed from 0x000000 (pure black) to 0x1a1a1a (very dark gray)
- Fog near distance changed from 1 to 2
- Fog far distance changed from 16 to 22
- More subtle, gradual darkening matching Wolf3D's distance shading behavior

### 3. AmbientLight removed (src/renderer.js)
- Removed unnecessary AmbientLight since all materials are MeshBasicMaterial (ignore lights)
- Fog handles distance darkening on its own

### 4. HUD embossed border (index.html)
- Added beveled border effect (lighter top/left, darker bottom/right) matching original W3D status bar

### 5. Face background color (src/hud.js)
- Changed from #505050 to #585858 to better match original

### Files modified:
- `src/renderer.js` — materials, fog, light removal
- `index.html` — border bevel
- `src/hud.js` — face background color

## Iteration 3 — Low-Res Rendering & Door Textures

### 1. Low-resolution rendering (src/renderer.js)
- Fixed renderer to render at 640x400 internal resolution (2x original Wolf3D 320x200)
- `this.renderer.setSize(640, 400)` replaces dynamic window-size rendering
- Camera aspect ratio locked to 640/400
- `onResize()` no longer changes renderer size — only updates camera projection matrix
- This is the single biggest visual change: the game now looks chunky and retro instead of smooth and modern

### 2. Pixelated canvas scaling (index.html)
- Added `image-rendering: pixelated` and `image-rendering: crisp-edges` to `#game-canvas` CSS
- The low-res 640x400 canvas scales up to fill the viewport with sharp nearest-neighbor filtering
- No blurry bilinear interpolation — pixels stay crisp like the original

### 3. Procedural door textures (src/doors.js)
- Added `createDoorTexture()` function generating a 64x64 canvas texture
- Gray metal base (#787878) instead of flat brown
- Dark frame border around edges
- Horizontal metal plate lines with highlights
- Rivets on left and right columns with specular highlights
- Gold-colored door handle on the right side with keyhole
- Subtle per-pixel noise for texture variation
- Normal doors now use this textured material; gold/silver key doors keep their solid colors
- Texture uses NearestFilter for pixelated look

### Files modified:
- `src/renderer.js` — fixed-resolution rendering at 640x400
- `index.html` — pixelated image-rendering CSS on canvas
- `src/doors.js` — procedural gray metal door texture

## Iteration 4 — Directional Wall Shading & Aspect Ratio

### 1. N/S vs E/W directional wall shading (src/map.js)
- In `buildGeometry()`, changed face grouping key from `wallId` to `${wallId}_ew` or `${wallId}_ns` based on face orientation
- E/W facing walls now get their material color multiplied by 0.75 (darkened to 75% brightness)
- This replicates Wolf3D's signature visual effect where east/west walls appear darker than north/south walls
- Creates visible depth and orientation cues in corridors, matching the original game's look

### 2. Aspect ratio preservation (index.html)
- Added `max-width: calc((100vh - 60px) * 1.6)` to `#game-canvas` CSS
- Added `margin: 0 auto` for horizontal centering
- On ultra-wide monitors, the game is now pillarboxed (black bars on sides) instead of stretched
- Maintains approximate 4:3 / 16:10 proportions matching the original Wolf3D experience

### Files modified:
- `src/map.js` — directional wall shading in buildGeometry()
- `index.html` — aspect ratio CSS on canvas

## Iteration 5 — Screen Overlays Wolf3D Polish

### 1. Title screen redesigned (index.html)
- Solid black background instead of semi-transparent dark overlay
- Large blocky red title "WEBSTAIN 3D" with letter-spacing and text-shadow
- Subtitle "A Wolfenstein 3D Tribute" in gray
- Fake menu items: "New Game" highlighted in Wolf3D yellow (#FCFC54), grayed-out Sound/Control/Quit
- Arrow marker (►) on New Game like original Wolf3D menu selector
- Blinking "PRESS ANY KEY TO START" in yellow
- Copyright footer in dark gray

### 2. Death screen redesigned (index.html)
- Dark red background (rgba(128,0,0,0.85)) instead of generic dark overlay
- "YOU ARE DEAD" in bright red with black text-shadow
- Blinking "PRESS ANY KEY" prompt in yellow

### 3. Level complete screen redesigned (index.html)
- Deep blue background (rgba(0,0,80,0.9)) matching Wolf3D's blue inter-level screens
- "FLOOR COMPLETE!" in Wolf3D yellow
- Stats area styled with yellow monospace text at 18px
- Blinking "PRESS ANY KEY" prompt in gray

### 4. Pause screen redesigned (index.html)
- Near-black background (rgba(0,0,0,0.9))
- "PAUSED" in large yellow monospace text
- "Press ESC to resume" in gray

### 5. Weapon overlay verified (src/weapons.js)
- Weapon canvas overlay at bottom: 60px, z-index: 10 — correctly positioned below screen overlays (z-index: 100)
- DOM-based overlay unaffected by Three.js low-res rendering
- No changes needed

### Files modified:
- `index.html` — all four screen overlays (title, death, complete, pause)

## Iteration 6 — Key Door Textures & HUD Polish

### 1. Gold door procedural texture (src/doors.js)
- Added `createGoldDoorTexture()` generating a 64x64 canvas texture
- Gold metal base (#C8A028) with darker gold frame border (#7C6010)
- Inner frame highlight for beveled look
- Horizontal plate lines with gold-toned highlights
- Gold rivets with specular highlights on left and right columns
- Center keyhole emblem: raised plate with circular keyhole top and vertical slot below
- Per-pixel noise for texture variation
- NearestFilter for pixelated rendering
- Replaces flat `MeshBasicMaterial({ color: 0xFFD700 })`

### 2. Silver door procedural texture (src/doors.js)
- Added `createSilverDoorTexture()` generating a 64x64 canvas texture
- Silver metal base (#A0A0A8) with darker silver frame (#606068)
- Same structural elements as gold door but in silver/gray palette
- Center keyhole emblem matching silver tones
- Replaces flat `MeshBasicMaterial({ color: 0xC0C0C0 })`

### 3. HUD number styling (index.html)
- `.hud-value` font-size increased from 24px to 28px for chunkier appearance
- Added `letter-spacing: 2px` for wider, bolder number display
- Enhanced text-shadow to `2px 2px 0 #000, 1px 1px 0 #444` for more depth
- Better matches Wolf3D's large bold status bar numbers

### 4. Weapon overlay positioning verified (src/weapons.js)
- Weapon canvas overlay at `bottom: 60px` correctly sits above the 60px HUD bar
- DOM-based positioning is independent of Three.js 640x400 internal resolution
- 128x128 canvas rendered at 256x256 CSS pixels provides good visibility
- No changes needed

### Files modified:
- `src/doors.js` — gold and silver door procedural textures, updated init() to use them
- `index.html` — HUD value font-size, letter-spacing, text-shadow

## Iteration 7 — Final Polish

### 1. Level complete stats reformatted (src/main.js)
- Stats now display "Time: XX seconds" instead of "Time: XXs"
- Kill Ratio and Treasure shown as percentages with "%" suffix
- Score zero-padded to 7 digits (e.g., "0000500") matching Wolf3D's score display
- Each stat line has `margin: 6px 0` for consistent spacing
- Stats inherit yellow monospace styling from parent `#level-stats` container

### 2. Body background verified (index.html)
- `body { background: #000; }` confirmed present — widescreen pillarboxing shows black bars
- No changes needed

### 3. Low-res rendering verified (src/renderer.js)
- `setSize(640, 400)` and `setPixelRatio(1)` confirmed intact
- Camera aspect locked to `640 / 400`
- `onResize()` only updates camera projection matrix, does not resize renderer
- All textures use `NearestFilter` for pixelated rendering
- Canvas CSS has `image-rendering: pixelated` and `crisp-edges`
- No changes needed

### 4. Syntax verification passed
- All 14 JS source files pass `node -c` syntax check with no errors

### Files modified:
- `src/main.js` — level complete stats formatting

## Iteration 9 — Gray Stone Texture, Green Ceiling Lamps, Guard Blue Boots

### 1. Gray stone wall texture rewritten (src/textures.js)
- Completely rewrote `grayBrickWall()` to match Wolf3D reference screenshots
- 16x8 block grid with staggered/offset brick pattern (like red brick but gray)
- Cool gray tone with slight blue tint (R:102, G:104, B:110 base)
- Dark mortar background (48, 50, 54) with clear 1px mortar lines
- Strong 3D beveling: lighter top+left edges (+28/+32), darker bottom+right edges (-24/-28)
- Per-block shade variation for natural stone look
- Small surface imperfections (pitting) on random pixels
- Subtle noise layer (3) for texture

### 2. Green ceiling lamp entity type added (src/textures.js, src/items.js, data/level1.json)
- New `drawLamp()` function in textures.js draws a 64x64 green hanging lamp sprite
  - Gray chain/wire hanging from top center
  - Emerald green dome shade (wide at bottom, narrow at top) with highlight/shadow
  - Yellow/white light glow underneath with bright bulb center
- `generateSpritePlaceholder()` now routes `label === 'lamp'` to `drawLamp()`
- `items.js` `init()` handles `subtype === 'lamp'` as non-collectible ceiling decorations
  - Uses `anchorBottom: false` and `offsetY: 0.15` to position near ceiling
  - Skips adding to collectible items array
- 14 lamp entities scattered across rooms and hallways in level1.json

### 3. Guard boot color changed to blue (src/textures.js)
- Boot fill changed from `P.dk1` (dark brown [40,28,20]) to dark blue [40,44,120]
- Boot shine highlight changed to [60,68,160]
- Boot soles changed to [24,28,80]
- Boot straps changed to [50,56,140]
- Matches Wolf3D reference where guards have distinctly blue boots

### Files modified:
- `src/textures.js` — gray stone texture rewrite, lamp sprite function, guard blue boots
- `src/items.js` — lamp entity handling as non-collectible ceiling decoration
- `data/level1.json` — 14 lamp entities added to level

## Iteration 11 — Nazi Decorations & Wood Panel Polish

### 1. Nazi flag wall texture rewritten (src/textures.js — naziFlagWall)
- Brighter red background (200, 24, 24) instead of (180, 20, 20)
- White circle radius reduced to 18px for better proportion within the flag
- Swastika completely redrawn with clean geometry: central vertical bar (4px wide), central horizontal bar (4px wide), and 4 arm extensions at the ends
- Previous implementation had overlapping rectangles that created a messy, unrecognizable shape
- Dark red border frame (100, 8, 8) with 3px thickness instead of 2px
- Added inner border bevel: bright red highlight on top/left edges, darker on bottom/right

### 2. Wood panel texture improved (src/textures.js — woodPanelWall)
- Base color warmed up from (120, 80, 32) to (132, 88, 38)
- Now renders 4 distinct planks, each 16px wide, with slight color variation between planks
- Each plank has its own wood grain pattern using per-plank sine offsets
- Clear plank division lines: dark groove on left edge, light highlight on right edge
- Nail details now placed at center of each plank (4 nails per plank row) instead of only at edges
- Overall warmer, more natural brown appearance matching Wolf3D reference

### 3. Nazi eagle wall texture improved (src/textures.js — naziEagleWall)
- Eagle head now has distinct beak (gold-colored, pointing right) and head highlight
- Wing shape more defined: gradual widening from neck outward with 5 progressive layers
- Wing tips have feathered detail with individual highlight pixels
- Body torso has highlight stripe for 3D definition
- Talons more detailed with 3 segments each, gripping the wreath
- Wreath significantly improved: thicker ring (radius 5-8 instead of 4-7), brighter gold (210, 185, 50 base)
- Wreath has sinusoidal brightness variation for laurel leaf illusion
- Added explicit laurel leaf highlight pixels around the wreath circumference
- Tiny swastika inside wreath redrawn with proper arm extensions

### Files modified:
- `src/textures.js` — naziFlagWall(), woodPanelWall(), naziEagleWall() all rewritten

## Iteration 13 — Dynamic Viewport Adaptation

Context: The renderer was changed from fixed 640x400 to 50% of viewport size with pixelated CSS upscaling. This iteration fixes visual elements that broke or need adjustment with the new dynamic rendering.

### 1. Weapon overlay scales with viewport (src/weapons.js)
- Changed weapon overlay from fixed `width: 256px; height: 256px` to `width: 25vw; height: 25vw`
- Added `max-width: 320px; max-height: 320px` to prevent weapon being too large on big screens
- Added `min-width: 160px; min-height: 160px` to keep weapon visible on small viewports
- Bottom offset changed from fixed `64px` to `clamp(48px, 6vh, 72px)` to match dynamic HUD height
- Weapon now scales proportionally with the viewport, matching how the original Wolf3D weapon always occupied a consistent screen proportion

### 2. Canvas aspect ratio constraint restored (index.html)
- Added `max-width: calc((100vh - clamp(48px, 6vh, 72px)) * 1.6)` to game canvas
- Added `margin: 0 auto` for horizontal centering when pillarboxed
- On ultrawide monitors, the game is now pillarboxed (black bars) instead of stretched horizontally
- Maintains ~16:10 proportions matching original Wolf3D experience
- Height uses same dynamic HUD clamp value for consistency

### 3. HUD scales with viewport (index.html)
- HUD bar height changed from fixed `64px` to `clamp(48px, 6vh, 72px)`
- HUD value font-size changed from fixed `26px` to `clamp(18px, 3vh, 30px)`
- HUD label font-size changed from fixed `9px` to `clamp(7px, 1vh, 10px)`
- On small screens (e.g. phones), HUD shrinks to 48px to leave more room for the game view
- On large screens, HUD grows up to 72px for comfortable readability
- Text scales proportionally within these bounds

### 4. Floor color lightened (src/constants.js)
- Changed FLOOR_COLOR from `0x707070` to `0x7C7C7C`
- Reference screenshots (especially `SHA697bfd_Wolfenstein3D.jpg` and `wolfenstein-3d.jpg`) show a slightly lighter medium-gray floor than #707070
- New color `#7C7C7C` better matches the perceived floor brightness in the references

### Files modified:
- `src/weapons.js` — weapon overlay responsive sizing and positioning
- `index.html` — canvas aspect ratio constraint, responsive HUD sizing
- `src/constants.js` — floor color lightened to #7C7C7C

## Iteration 14 — Pistol Barrel, Guard Proportions, Lamp Size

### 1. Pistol barrel redrawn with chrome ring detail (src/weapons.js)
- Completely rewrote `drawPistol()` to make the barrel more prominent and chrome-like
- Barrel is now thicker (10px wide instead of 6px) with visible stacked ring ridges
- Chrome rings alternate between highlight (#A8A8B0) and shadow (#70707C) bands every 2-3px
- Center chrome sheen highlights (#B8B8C4) on each ring for metallic shine
- Bore opening is larger (6x4px) with a visible rim around it
- Bore rim rendered in medium gray (#606068) for depth
- Front sight sits above the bore
- Hand, arm, and grip scaled up proportionally to match the larger barrel
- Toggle mechanism (Luger feature) made more visible with brighter highlight
- Muzzle flash enlarged to match the bigger barrel profile
- Overall matches the original Wolf3D pistol where the barrel is very prominent at bottom-center

### 2. Guard sprite proportions enlarged (src/enemies.js)
- Width increased from 0.8 to 0.9 (90% of tile width)
- Height increased from 0.9 to 0.95 (95% of wall height)
- In the reference screenshots, guards appear as large, stocky figures that fill most of the vertical space
- The larger proportions better match the imposing guard presence seen in the original game

### 3. Green ceiling lamp sprites enlarged (src/items.js)
- Lamp width/height increased from 0.5 to 0.7 (40% larger)
- Offset Y adjusted from 0.15 to 0.1 to keep lamps properly positioned near ceiling
- In reference screenshots (189296.png, wolfenstein-3d.jpg), the green hanging lamps are quite prominent decorative elements
- The larger size makes them more visually impactful and recognizable from a distance

### Syntax check
- All 3 modified files pass `node -c` syntax validation: weapons.js, enemies.js, items.js

### Files modified:
- `src/weapons.js` — pistol barrel redrawn with chrome rings and larger proportions
- `src/enemies.js` — guard sprite width 0.8->0.9, height 0.9->0.95
- `src/items.js` — lamp sprite size 0.5->0.7, offsetY 0.15->0.1

## Iteration 15 — SS Green Ammo Pouches, Guard Rolled Sleeves, Dog Contrast

### 1. SS soldiers: bright green ammo pouches on chest (src/textures.js)
- Added 6 bright green magazine carrier pouches on the SS officer's chest (3 left, 3 right)
- Pouches use bright green palette: base [40,140,40] / [48,160,48], flap tops [28,100,28]
- Each pouch has a highlight stripe ([60,180,60] / [68,200,68]) for 3D definition
- Bottom shadow line [24,80,24] grounds the pouches against the uniform
- Positioned at y:80-88, between chest pockets and belt, matching reference SRP82b3f1_w3d.jpg
- These are the most visually distinctive element of the SS officer in the original game

### 2. Guard arms: rolled-up sleeves showing skin (src/textures.js)
- Replaced full brown-uniformed arms with short sleeves + exposed skin
- Upper portion (y:67-74) retains brown uniform fabric (short sleeve)
- Lower portion (y:75-86) now shows skin tones (P.sk1, P.sk2) for exposed biceps
- Added muscle highlight strips (P.sk0) on each arm for visible musculature
- Skin shadow on inner arm (P.sk2) for depth
- Hands remain unchanged (P.sk1/P.sk0)
- Matches reference 189296.png where guards have visible skin-colored upper arms

### 3. Dog sprite: darker palette for more contrast (src/textures.js)
- Darkened all 5 dog palette entries (dg0-dg4) by approximately 20-25%
- dg0: [188,148,72] -> [160,124,56] (highlight fur)
- dg1: [156,116,52] -> [128,92,40] (main body)
- dg2: [128,92,36] -> [100,72,28] (shadow areas)
- dg3: [100,72,24] -> [76,52,16] (dark saddle)
- dg4: [76,52,16] -> [52,36,8] (darkest areas)
- Creates a more compact, darker German Shepherd matching reference appearance

### Syntax check
- `src/textures.js` passes `node -c` syntax validation with no errors

### Files modified:
- `src/textures.js` — SS green ammo pouches, guard rolled sleeves with skin, darker dog palette

## Iteration 16 — Wall Color Correction, Guard Proportions, Fog Tightening

### 1. Blue stone wall texture darkened and de-saturated (src/textures.js)
- Base block color changed from (80, 80, 116) to (96, 98, 106) — much more gray, less blue/purple
- Mortar/grout darkened from (44, 44, 60) to (36, 38, 42)
- Shade variation range reduced from 20 to 16 for more uniform appearance
- Result: walls now appear as dark gray stone with subtle cool tint, matching Wolf3D reference

### 2. Guard brown uniform palette darkened (src/textures.js)
- br0: [172,132,72] -> [156,116,60]
- br1: [140,108,52] -> [132,96,44]
- br2: [116,84,40] -> [108,76,32]
- br3: [92,68,28] -> [84,60,20]
- br4: [68,48,16] -> [60,40,12]
- Overall darker, more saturated brown matching reference guard uniforms

### 3. Stahlhelm enlarged and darkened (src/textures.js)
- Helmet now uses local darker steel-gray palette (hd0-hd3) instead of shared P.hm values
- Crown widened from 28px to 32px, dome from 36px to 40px, lower dome from 40px to 48px
- Brim widened from 44px to 52px and made thicker (5px instead of 4px)
- Helmet starts at y=0 instead of y=2, extending higher
- Ventilation bumps repositioned for wider dome
- Face position shifted down 2px (y=20 to y=22) to accommodate larger helmet

### 4. Guard arm separation improved (src/textures.js)
- Added 2px dark shadow strips between arms and torso on both sides
- Arms moved further outward (left arm at cx-36, right at cx+28) for visible gap
- Arms made slightly wider (8px instead of 6px) for more presence
- Luger pistol repositioned to match new right arm placement
- Creates clear silhouette with distinct arm/body boundary

### 5. Fog range tightened (src/renderer.js)
- Near distance: 2 -> 1.5
- Far distance: 20 -> 16
- Distant walls now darken more noticeably, matching Wolf3D's characteristic distance shading

### Syntax check
- Both `src/textures.js` and `src/renderer.js` pass `node -c` syntax validation

### Files modified:
- `src/textures.js` — blue stone wall colors, guard brown palette, Stahlhelm size/color, arm separation
- `src/renderer.js` — fog near/far parameters

## Iteration 17 — Guard Detail Refinements, Gray Brick Warmth

### 1. Guard arm-body shadow strips widened and darkened (src/textures.js)
- Shadow strips between arms and torso widened from 2px to 4px
- Color changed from P.dk1 (dark brown) to near-black [16,12,8]
- Creates much stronger visual separation between arms and body at all render sizes

### 2. Guard collar edge color corrected (src/textures.js)
- Changed collar edge from bright yellow-tan [188,148,84] to P.br0 [140,100,48]
- Now matches the uniform brown palette instead of standing out as an unrealistically bright stripe

### 3. Guard leg gap widened and darkened (src/textures.js)
- Center gap between legs widened from 4px to 6px
- Gap color darkened from P.br4 [52,36,8] to [36,24,8] for stronger shadow
- Left and right leg widths adjusted (14px -> 13px) to accommodate wider gap
- Right leg highlight repositioned to match

### 4. Gray brick wall warmed up (src/textures.js)
- Base block color changed from cool gray [102,104,110] to warm gray [110,106,98]
- Mortar color changed from cool gray [48,50,54] to warm gray [52,48,44]
- Now clearly distinguishable from blue stone wall (type 1) which retains its cool blue-gray tint
- The warm vs cool distinction matches Wolf3D's two distinct gray stone textures

### 5. Red brick wall verified (src/textures.js)
- Red-brown base [148,52,42] with +/-15 shade variation — looks correct
- Mortar/grout at [140,130,110] — proper light tan mortar for red brick
- Beveling and streak patterns create good visual depth
- No changes needed

### 6. Cache bust updated (index.html)
- Script tag version changed from ?v=16 to ?v=17

### Syntax check
- `src/textures.js` passes `node -c` syntax validation

### Files modified:
- `src/textures.js` — guard arm shadows, collar color, leg gap, gray brick warmth
- `index.html` — cache bust v16 -> v17
