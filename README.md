# Critters — The Beginning

An original Japanese-inspired browser creature-collecting RPG. This is **Phase 1**, not the full first-gym chapter.

## Implemented
- Choose the male or female original player character and enter a name at the start.
- Walk around a starter village with directional character sprites, traditional buildings, rice fields and NPCs.
- Enter a research laboratory; talk to the researcher and choose Rock, Water or Electric as a placeholder starter type.
- Friendly tutorial rival battle prototype. Rival chooses the type advantage; no money penalty for losing.
- Early Critter Index menu with eight party slots and four buff/debuff slots.
- Browser-local saving with a Continue option.
- Keyboard and touch controls.

## Controls
- WASD or arrow keys: walk
- E or Enter: interact, talk, continue dialogue
- I: open Critter Index
- Save Game button: save adventure
- Mobile: on-screen movement pad and action buttons

## Playing
Host the root folder as a static website, or use GitHub Pages. Keep both files in `assets/` beside `index.html`.

In the GitHub repository, navigate to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, select **main** and **/(root)**, then save. When GitHub Pages deploys successfully, the expected website address is `https://spluxec.github.io/critters/`.

## Phase 2 — Route 1 (implemented)
- Walk east from the starting village after completing the research-lab tutorial.
- Explore Route 1 countryside, rice fields and tall grass.
- Random wild encounters with temporary type-based Critter placeholders.
- Attack, flee or use the Critter Index capture beam; lower target HP improves capture chances.
- Party size is limited to eight; overflow captures go directly to home storage.
- Participating Critters earn experience and can level up. Fainted parties return to the village, healed.
- Existing saves receive the new party/storage fields on load.

## Planned next
The small town, Routes 2 and 3, Critter Centers, comprehensive 15-type battles, module effects, optional exploration, second rival battle and first Grass Gym. The creators are still designing the original 25 Critters, so species, evolutions and starter visuals are intentionally placeholders.

The currently implemented battle is a simplified tutorial demo, not the finalized battle system.