# Critters — The Beginning

An original Japanese-inspired browser monster-collecting RPG.

## Play
Visit **https://spluxec.github.io/critters/**. GitHub Pages publishes `main` from `/(root)`. The game saves to your browser's local storage.

## Implemented through the current development phases
- New Adventure: choose the original male or female player sprite and name your character.
- Top-down tile navigation, NPC interaction and a research laboratory.
- Rock, Water or Electric **starter type placeholders**, with the childhood rival choosing the advantaged starter.
- Tutorial rival battle with no money penalty, even on a loss.
- Starting Village → rice-field Route 1 → first small town → bamboo Route 2 → foothills Route 3 → traditional Garden Town.
- Optional Hidden Forest reachable from Route 2; Mountain Cave requires the first badge's Critter Index vegetation cutter.
- Wild encounters drawn from the 200-species habitat registry, four equipped moves from the 312-move library, type effectiveness across the expanded type chart, switching, potions and revives.
- Capture beam with higher success when the target has lower HP. Maximum eight active Critters; excess captures automatically go to home storage.
- Experience only for participating Critters, levels, HP, trainer rewards, loss penalty and blackout recovery.
- Critter Centers heal party, allow storing/retrieving Critters, and install/remove up to four basic modules.
- Shops sell potions, revives and basic Critter Index modules. Modules affect battle values automatically.
- Route trainers with interaction/sight triggers and optional rematches.
- Childhood rival battle at the entrance to the first Grass Gym; defeat not required to proceed.
- First Grass Gym: three trainers, garden mechanism and an overgrown maze, plus a four-Critter level 13–18 leader. The first badge unlocks cutting vegetation.
- Browser-local saves and Continue compatible with previous prototypes.

## Controls
- Arrow keys or WASD: move
- E / Enter: interact or advance dialogue
- I: Critter Index
- On mobile: directional pad, Talk / Use and Index buttons
- Save Game button, or save through the Critter Index

## Current limitations
This is a substantial playable prototype, not the finished full game. The 200-species and 312-move draft libraries are integrated into wild encounters, regional trainer battles and the searchable Critter Index. Original artwork and final creator-approved species designs are still pending. The starter and rival-starter placeholders remain until official starter designs are assigned. The four-move combat model and module values are simplified initial implementations; full status mechanics, smart enemy strategy, exploration collectibles, detailed NPC quests and production audio/art remain in later phases. The Garden Town cutting unlock is functional for the Mountain Cave entrance; additional vegetation-cut interactions will be placed as maps expand.

All approved type relationships are retained in the 15-type matchup data. The selected single-player Gym uses 1v1 battles; 2v2 trainer-only encounters remain future work.

## Release scope
The approved initial release targets the first Grass Gym badge, with optional exploration after that milestone.

## Phase 9 — Species gameplay integration (November 2026)
The Index reads the 200-species registry and 312-move library, including habitat filters, learnsets, stats, discovered/captured records and party species names. Regional trainer teams now select distinct non-legendary draft species from their areas while keeping their approved types and levels. Tutorial and rival starters remain placeholders. The game preserves fallback type-based encounters and moves when catalogs cannot load.

## Phase 10 — Battle stability (November 2026)
- Damage-over-time conditions now tick after both teams complete their actions, including faint checks and logged HP loss.
- 2v2 action selection validates legal active targets and prevents two teammates from reserving the same switch-in.
- Empty ally-target menus fall back safely to self, while enemy targeting never substitutes the acting ally.
- Trainer AI can consider ally-targeting moves for both deployed teammates.
- Existing type effectiveness, PP, 1v1 wild encounters and trainer-only 2v2 rules remain unchanged.
