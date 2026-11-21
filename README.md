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

## Phase 11 — Capture and party management (November 2026)
- Maximum active party size is **8**. New captures join the party when space is available and automatically go to home storage otherwise.
- Capture Beam displays an estimated catch percentage based on wild Critter HP; chances still use the existing formula.
- Critter Center maintenance displays species names and lets players move party members up or down, send them home, and retrieve stored Critters while preserving at least one active partner.
- Save migration keeps any excess party entries in home storage instead of discarding them.
- Party editing and retrieving Critters remain exclusive to Critter Centers.

## Phase 12 — Critter Center storage and watch maintenance (November 2026)
- Home storage browser supports name/type/level search, stored-order/name/level sorting, and 16-entry pages for large collections.
- Stored Critters can swap directly with a selected party slot even with eight active members. Reordering, sending home, and retrieving remain Center-only.
- Module maintenance now shows all four watch sockets, owned/equipped quantities, module descriptions, and safer installation/removal checks.
- These changes reuse the existing saved party, storage, and module arrays without altering the eight-Critter party limit.

## Phase 13 — Wild encounter and regional balancing (November 2026)
- Wild encounter rates are tuned for Routes 1–3, Hidden Forest, Garden Town outskirts, and Mountain Cave. After a wild encounter, at least four additional eligible wild-terrain steps must pass before another random encounter. The first Route 1 encounter remains guaranteed after five exploration steps.
- Wild species are selected from the existing authored habitat registry, with per-region starting level bands: Route 1 (2–5), Route 2 (5–10), Hidden Forest (7–14), Route 3 (10–18), Garden outskirts (12–20), and Mountain Cave (15–22).
- With additional badges beyond the first, the encounter-level ceiling of advanced regions increases by two levels per badge, capped at twelve extra levels. High-level species become eligible for wilderness revisits when their original habitat ranges overlap the new ceiling.
- Existing rarity, discovery novelty, day/night type influence, and first-badge legendary gating remain intact. All 200 species records and their original habitat entries remain unchanged. The encounter cooldown counter is saved compatibly with old browser saves.

## Phase 13 follow-up — smaller starting wild rosters (v42)
- Each of the 200 authored species retains its single original home region; no species or habitat records were deleted or reassigned.
- Instead of making every resident eligible immediately, the starting wild roster contains up to 9 species on Route 1, 12 on Route 2, 12 in Hidden Forest, 13 on Route 3, 12 near Garden Town, and 13 in Mountain Cave (subject to the area's level limits and existing legendary restrictions).
- Every eight wild encounters within a particular region unlock four more eligible resident species for that same region. Wild-encounter progress is saved per region, so exploration gradually reveals more species without making them appear in other locations.
- The existing weighted rarity system remains in force (rare species have far lower weights than common residents). The Critter Index describes this regional discovery behavior.

## Phase 14 — Progression, leveling and evolution polish (v43)
- In the Critter Index Party screen, each active Critter now displays its current XP, XP required for the next level, a visual progress bar, and its next authored level-up move (when one exists).
- Defeating a Critter now reports level-ups, newly learned moves, and evolutions in the battle log.
- Existing XP rewards, level thresholds (level × 12), per-level HP growth (+4), four equipped moves, and authored conditional evolution chains are preserved. The eight-Critter party limit and old save schema are unchanged.
