# 生成提示词

## cottageBasePrompt

```text
Create a production BACKGROUND LAYER for the referenced cozy hand-painted cottage office, landscape composition exactly 1200x570 pixels. STYLE reference: warm lovely hand-inked gouache, honey wood, cream plaster, soft sun from left, gentle paper texture. Render an EMPTY ROOM WITHOUT ANY desks, chairs, people, laptops, cups, notebooks or freestanding workstation furniture. Lower 55 percent is completely clear warm wooden floor for later character/table layers, floor begins around y=245, no rug or objects in the central floor area. Wall occupies upper 45 percent. Five visible wall objects with distinct functions and beautiful believable perspective: left large sunlit window at x20..230 y20..225, framed LARGE game-preview screen x270..630 y30..220 (screen interior muted flat dark forest green, NO landscape/content); small horizontal wooden star-rating plaque x680..880 y20..70 (BLANK empty inner plaque, NO stars); framed calendar x670..895 y90..230 (blank pale cream interior with faint empty grid, NO dates or text); attractive empty three-level trophy cabinet x950..1160 y30..245 (NO trophies on shelves). Green potted vine can sit atop cabinet, a few small books along wall allowed without blocking five objects. Right/left outermost 60px are crop-safe decoration only: do not place functional objects or entrances there. Clear hierarchy beautiful painterly architectural illustration, cozy compact independent cottage, match reference materials. No UI, no labels, no text, no watermarks. Important complete clear foreground for FOUR separate later workstations (two rows two columns), not a finished room with desks. Background opaque.
```

## cottageFurniturePrompt

```text
Production furniture asset atlas for the attached cozy cottage office style, TRUE transparent background, exactly 2x2 equal square cells, no text or grid. Four INDEPENDENT objects only, each complete and no overlap. TOP LEFT: one front-view warm honey wooden office desk with thick desktop seen slightly from above, straight front and tapered perspective sides, beautiful painted grain. Essential desk's SOLID closed wooden FRONT PANEL goes ALL THE WAY TO FLOOR and across full width between side legs, NO OPEN space under the front, no chair or contents. TOP RIGHT: one office chair seen from FRONT, dark warm charcoal padded back and subtle brown frame, no desk or person, backrest low and wide rather than tall executive chair. BOTTOM LEFT: one open laptop seen from BEHIND the screen, warm dark graphite back lid, thin base visible at bottom, NO screen visible, no bright logo. BOTTOM RIGHT: one matching closed laptop lying flat slightly seen from above, graphite gray. Soft sunlight upper left, warm brown hand-inked outlines and lovely gouache grain, NOT photoreal. Each object floats on real transparency with no ground/shadow slab. Match reference cottage, intended to be composited as chair behind seated character, desk and laptop in front. No extra objects, no people, no room. Desk substantially wider than chair; standalone object scales arbitrary, extraction later.
```

## cottageCabinetPrompt

```text
Edit only the rightmost trophy cabinet in this empty cottage room background. Move the whole cabinet and its potted vine LEFT by about 130 pixels (roughly 7 percent of image width), narrow the cabinet by 15 percent if needed, and leave the rightmost 130 pixels as plain cream wall and wooden floor crop-safe margin. The cabinet must remain fully visible after trimming 6.25% from each side of the image. Keep it separate from calendar with a small gap, retain all three empty shelves, doors and handles. Repaint old cabinet area seamlessly as plain wall/floor. Keep window, preview screen, blank star plaque, blank calendar, lighting, wood floor and everything else exactly unchanged. No furniture, no people or text. Wide landscape output with same aspect ratio as input.
```


