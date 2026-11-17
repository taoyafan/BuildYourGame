# 办公室样板生成记录

使用内置 image_gen，手绘概念图为风格参考；输出保留原始 PNG，运行切片由主程序处理。人物透明背景已确认：背景 RGB 预览可能显示棕色，但其 alpha 为零，应以合成结果验收。

## 房间底图

```text
Use case: stylized-concept.
Production game asset: empty room BACKGROUND ONLY for Chinese game studio management mobile game. Use attached image only as STYLE reference: preserve its warm hand-drawn 2D gouache/watercolor color blocks, fine brown ink outlines, cream plaster and honey wood, restrained paper grain, cozy adult indie studio atmosphere. NOT a UI mockup.
Output a single wide landscape background at 1400x760 or exactly equivalent aspect 35:19. Edge-to-edge rectangular image, no frame.
Shallow elevated FRONTAL orthographic room view, not isometric. Simple cream warm plaster back wall occupies EXACTLY upper 50% image. A horizontal wooden baseboard exactly at mid-height. Honey wooden floor occupies EXACTLY lower 50%, broad simplified horizontal boards and subtle perspective seams, calm enough behind tiny sprites. Very subtle sunlight from left, no spotlight. Uniform uncluttered wall and floor to allow dynamic equipment and wall props on top.
Absolutely NO windows, NO doors, NO furniture, NO characters, NO desks, NO chairs, NO screens, NO calendars, NO shelves, NO wall art, NO stars, NO UI, NO lettering. No foreground frame or corner walls. Do NOT copy any interface from reference. This backdrop will be split into independent wall and floor textures at 50% height and resized to 700x380 production pixels; make clean crisp silhouettes and details readable when small. Gently varied hand-painted material, not noisy texture, not photorealistic.
```

## 道具图集

```text
Use case: stylized-concept.
Production asset SPRITE SHEET for hand-drawn 2D studio management game. The attached image is a STYLE reference only. Match its warm cream, honey oak, muted forest-green and slate colors, fine hand-ink outlines, matte watercolor gouache, adult cozy indie studio feel. Not a UI screen.
Create one square 1536x1536 PNG with a REAL TRANSPARENT BACKGROUND. Exactly 3 columns by 3 rows, uniform 512x512 cells, no drawn grid, no lettering, no labels, no numbers. Every object fully isolated, centered in its own cell, with at least 48px empty transparent padding around its silhouette. Nothing crosses a cell boundary. Objects have orthographic shallow elevated FRONT view, not isometric; simple clear shapes readable at very small mobile size.
Cell order left-to-right top-to-bottom:
1. A tall rectangular studio WINDOW: honey wooden slim frame, pale blue sky and soft tiny distant foliage, closed pane, simplified. Fully rectangular object, no surrounding wall.
2. A wide landscape wall-mounted MONITOR OUTER FRAME, dark charcoal warm ink edges, thin honey wood accent, tiny centered bracket below. Broad blank inner display aperture TRANSPARENT, nothing drawn inside it. Width about 390px height225px in its cell.
3. A horizontal rounded honey wood STAR-RATING PLAQUE blank, width400px height75px, cream inset face, NO stars, NO writing.
4. A portrait WHITEBOARD CALENDAR, muted wood border, clean warm white face, simple faint 4x4 pale grey-blue grid, small muted brick red top tabs, no numbers or words. Approx 280x340px.
5. A portrait EMPTY achievement BOOKSHELF with honey wood frame and two shelves, flat clean front, no books and no trophies, approx300x340px.
6. A small green leafy studio PLANT in simple terracotta pot, approx240x330px.
7. A plain dark-grey fabric OFFICE CHAIR, FRONT of chair back visible, short seat, stem and simplified five-foot base; no arms, no person, about220x330px. SAME viewing angle as desks below.
8. A honey oak WORK DESK, frontal shallow elevated view: broad clean tabletop, slightly visible upper surface, four plain legs with rear legs understated. NO chair, NO equipment, no mug. Approx410px wide260px tall, allow a character's chest behind the tabletop. This layer will cover lower body of character.
9. A tabletop COMPUTER with dark charcoal monitor, muted green blank display, small stand and keyboard below; one plain small cream coffee mug at right. No desk or person. Approx270px wide220px tall. This group will be placed OVER tabletop in production.
All objects reuse exactly the same outline thickness/material scale. No baked room, no text, no shadows extending beyond each cell. Preserve true alpha, no checkerboard pattern or white matte. This is a modular production atlas; do not assemble a room.
```

## 人物动作图集

```text
Use case: stylized-concept.
Production CHARACTER ANIMATION SPRITE SHEET for original cozy indie game studio management mobile game. Use attached hand-drawn concept as STYLE AND CHARACTER reference: adult young male coder with round dark glasses, tousled dark brown hair, olive green casual shirt; warm fine brown ink contours, matte gouache colors, subtle watercolor texture. Match the LEFT male coworker in reference. Adult chibi proportions, not baby, charming expressive eyes.
Output one landscape PNG, real transparent alpha, intended 1536x1152. EXACT regular grid 3 columns by 2 rows; each cell is exactly the same 512x576 canvas, grid lines invisible. No text or labels anywhere, no checkerboard. Same actor at EXACTLY identical scale, seat/hip registration and head position in every populated cell, center each at x256 within cell. Leave 60px transparent margins. Consistent FRONT view with very slight top-down elevation, shoulders face viewer, face visible. Whole seated actor head through bent knees is drawn, modest large head, no chair, no furniture, no monitor, no keyboard, no desk, no shadow. Both hands extend naturally forward toward an imaginary keyboard slightly below chest. The wooden desk will be drawn as separate foreground over waist/lower body. Hands should remain near torso so they can be composited behind tabletop.
Cell1 top-left: IDLE relaxed open eyes, neutral calm mouth, shoulders relaxed, hands resting.
Cell2 top-middle: WORK frame0, looking slightly down at imaginary monitor below face, left wrist slightly raised to type.
Cell3 top-right: WORK frame1, same pose, left wrist down, right wrist slightly raised, head 2px lower.
Cell4 bottom-left: WORK frame2, slight focused blink, right wrist down, both hands near typing line, head returns center.
Cell5 bottom-middle: WORK frame3, eyes open, small focused smile, hands return toward frame0 so loop closes smoothly.
Cell6 bottom-right: completely EMPTY and transparent, no actor.
The movements MUST be very small and loopable: stable identity, NO hairstyle changes, NO clothing changes, no shifting whole character, no head deformation, no large waving or gesturing. All five characters aligned on exactly same hip baseline and same pixel scale. Both hands visible, sensible anatomy. No tools held. These frames will be used at 128x144 PNG each after engineering normalization; draw bold readable silhouettes and simplify tiny texture. No UI and no scenery. True transparent background.
```

## 人物透明边缘处理

```text
Use case: background-extraction.
Edit the supplied CHARACTER SPRITE SHEET ONLY to remove its background and ALL brown atmospheric haze, soft glows, halos, shadows and vignette between and around the five characters. The ENTIRE canvas outside the actual solid character silhouettes must have alpha exactly ZERO, including between the two rows and within the empty bottom-right cell. No faint brown pixels floating outside hair, no drop shadow.
Preserve the original canvas size, EXACT grid positions of all five character poses, all poses/face identity/colors/ink lines, clothes and hands unchanged. Preserve hair silhouette antialiasing naturally. Do NOT move, resize, redraw, crop or recenter any character. Do NOT add/checkerboard/white/black background. Actual production transparent PNG cutout only, no glow.
```
