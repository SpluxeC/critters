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

## Phase 15 — Exploration and world discoveries (v44)
- Added optional glowing landmark discovery markers on Route 2 (Bamboo Wayfinder), Hidden Forest (Shrine), Route 3 (Mountain Lookout), Mountain Cave (Crystal Alcove), and Garden Town outskirts (Memorial).
- Walking over a landmark triggers a one-time description and reward (Potions, Revives, or credits) without blocking movement or modifying the maps' collision footprints.
- Each discovery is saved in the existing `s.discoveries` collection; returning to a collected location grants no duplicate reward.
- The Critter Index Records screen now lists landmark discoveries and completion count. Existing Route 1 finds, story progression, battles, and eight-member party cap remain unchanged.

## Evolution stones and expanded Critter Shops (v45)
- The First Town and Garden Town shops now sell twelve type stones for 220 credits each: Grass, Water, Fire, Rock, Electric, Ice, Flying, Shadow, Ghost, Venom, Psychic, and Fighting.
- Stones are stored in the Critter Index item inventory. Twelve authored draft Critter evolution paths now require the original minimum level **and** the corresponding stone: Thistlehop (Grass, Lv 23), Driftkip (Water, Lv 18), Emberling (Fire, Lv 18), Bouldibble (Rock, Lv 18), Coilfin (Electric, Lv 18), Rimesnout (Ice, Lv 18), Breezlet (Flying, Lv 12), Umbrapip (Shadow, Lv 18), Booquill (Ghost, Lv 18), Mirelet (Venom, Lv 12), Oracub (Psychic, Lv 18), and Sparlet (Fighting, Lv 18).
- To evolve, reach the specified minimum level, own the matching stone, and select **Use Stone & Evolve** in the Critter Index Party screen. One stone is consumed only on a successful evolution. Automatic level-up evolution cannot use a stone. All other evolution paths and conditions remain unchanged.
- The expanded shop keeps healing items and modules available; modules still require a Critter Center for installation. Existing save inventories are compatible.

## v46 — Normal, Steel and Ground evolution stones
- Added Normal Stone, Steel Stone, and Ground Stone to both existing Critter Shops for 220 credits each, bringing the current stone catalog to 15 types.
- Staticat requires Normal Stone and Lv 23; Granipup requires Steel Stone, Lv 23 and the first badge; Pebblit requires Ground Stone and Lv 12. These are editable draft evolution assignments.
- Existing evolution conditions remain cumulative: a stone never bypasses its minimum level, time, place, or badge requirements. All 200 species and existing inventory/save rules are preserved.

## Phase 16 — Cinematic world animation (v47)
- The rice paddies on Route 1 and in the starting village have layered, curved rice stalks with individual leaves and golden grain heads. Broad, traveling wind waves bend the plants smoothly over time; flooded paddy floors have subtle reflections and ripples.
- Tall grass and wooded foliage respond to the same deterministic wind field; ponds and streams have moving water highlights. Forest and bamboo environments get restrained moving sunbeams and haze, while cave lighting has a cooler tint.
- The improvements run entirely in the renderer. Map coordinates, collision, NPCs, interactions, encounters, saves, battles, evolution stones and the eight-Critter party maximum are unchanged. No new image assets are needed.
- JavaScript syntax was checked; live in-browser visual/performance testing remains necessary, particularly on mobile devices.

## Phase 17 — Battle visual overhaul (v48)
- Battle scenes now overlay type-colored animated attack trails, traveling energy cores and impact rings, with separate directions for ally and enemy actions and a miss-aware effect.
- A successful Critter Index capture-beam result displays a brief illuminated watch, beam, and registration animation in the battle completion panel.
- Evolution notifications have a celebratory shimmer. Responsive CSS and a reduced-motion fallback keep battle controls accessible.
- Animations are presentation-only and do not alter combat math, PP, action order, capture chances, evolution conditions or saves. No new Critter artwork is required.
- JavaScript syntax checks passed; end-to-end browser/mobile testing remains outstanding.

## Phase 18 — NPC side quests (v49)
- Four optional side quests are available through existing friendly NPCs: Rice Farmer on Route 1 (capture two Route 1 Critters after accepting; 90 credits and one Potion), Town Naturalist in First Town (capture two Route 2 Critters; one Grass Stone), Forest Guide in Hidden Forest (discover the Hidden Forest Shrine; one Ghost Stone), and Garden Caretaker in Garden Town (discover the Garden Memorial; one Water Stone).
- Speak with a quest NPC to accept or decline. Progress is recorded per quest; return to the same NPC to claim the one-time reward. Objectives are independent from trainer battles and do not block story progression.
- Quest progress and completion are displayed on the Critter Index Records screen. New quest state uses additive, old-save-friendly fields (`sideQuests`, `questCaptureCounts`) and preserves existing party, storage, evolution stones, and captures.
- A completed objective alone does not automatically grant a reward. Players must talk to the quest giver and explicitly claim it.
- The JavaScript syntax check passed; full gameplay and mobile interaction testing remain pending.

## Phase 19 — Gameplay stability and regression checks (v50)
- Fixed a real battle bug: when all PP is exhausted, Last Resort no longer permanently inserts itself into a Critter's four learned move slots, which previously could erase one learned attack. Last Resort remains available as a temporary fallback.
- Added a guard so captures do not proceed if the target is already unavailable.
- Added `tests/smoke.test.mjs`, a dependency-free Node.js regression test suite covering: game source syntax, 200-species / 312-move integrity, authored evolution links and stone IDs, capture odds, eight-member party overflow into home storage, cumulative stone-and-badge evolution requirements, optional quest progress, and the Last Resort regression.
- Added `.github/workflows/critters-tests.yml` to run these tests on future pushes and pull requests using Node 22.
- To run locally: `node --test tests/smoke.test.mjs`.
- Isolated runtime logic and data checks were performed through the connected repository tools. Full device/browser integration and GitHub Actions run results were not available for verification in this session.

## v51 — Three cinematic tree variants
- Added the three approved transparent tree designs as self-contained assets at `assets/trees/broadleaf.svg`, `assets/trees/tiered.svg`, and `assets/trees/round.svg`. They wrap compact PNG renditions so GitHub Pages can serve them without a build tool.
- All existing `T.tree` tiles now display one of the three leafy tree variants, selected deterministically from tile coordinates. Tree sprites have layered branches, textured bark and foliage and subtle wind-driven sway.
- Dense forest and bamboo areas use appropriately smaller tree art; more open regions display larger canopies. The collision footprint, tree locations, walking routes, terrain, NPCs, quests, and existing saves are unchanged.
- The original hand-drawn tree shapes remain available if the new assets have not loaded or fail to load. JavaScript syntax was checked, but live mobile-browser visual testing is still recommended.

## v52 — Classic-style battle screen
- The battle presentation now uses a scenic arena with layered hills, sky, clouds and foliage, side-by-side opposing and friendly Critters, and restyled type and health panels. Existing Critter placeholder icons remain until official artwork is added.
- At the beginning of each player action, players choose **Battle**, **Index**, or **Escape**. Escape uses exactly the existing Run action and is disabled in trainer battles.
- Battle reveals colorful attack cards arranged around the active Critter, with PP, type and (in 2v2) target names. Guard and Focus stay available as tactical battle actions; existing turn order, damage, move availability and 2v2 targeting are preserved.
- Index opens **Switch Critter**, **Use Item** (Potion/Revive), and (during wild battles) **Critter Index Capture Beam**. Back navigation returns to the preceding menu without consuming turns.
- UI changes are responsive for portrait and landscape phones and support reduced-motion preferences. The party remains capped at eight, and stored Critters remain accessible only at Critter Centers.
- Tests now include classic battle menu states, move buttons, Index controls and trainer Escape restrictions. This release has passed JavaScript parsing and isolated rendering/menu tests; physical device visual tests are still pending.

## v53 — Battle arenas reflect the map and indoor buildings
- The environment at the instant a battle starts is captured as an ephemeral scene snapshot: current area, tile terrain (rice, tall grass, stone, flowers, path, water or field) and world time phase. Battle transitions or subsequent world changes do not alter this scene mid-fight.
- Distinct scenic arena treatments now cover Starting Village and Route 1 rice paddies, First Town, Route 2 bamboo, Hidden Forest, Route 3 foothills, Mountain Cave, Garden Town, Grass Gym, Research Laboratory, Player Home, and Village Home. Caves use rocks/crystal textures rather than blue sky; laboratories, homes and gym battles use interior walls/flooring.
- Day, dawn, dusk, and night tint the outdoor scenes without changing battle logic, damage, PP, captures or the approved Battle / Index / Escape controls.
- The terrain variants and location labels are expressed as CSS classes on the battle arena; no world maps, collision or existing save fields are modified.
- Added regression checks for environment classification, snapshot independence, and CSS coverage across all areas. JavaScript syntax validation passed; real device/browser visual testing remains pending.

## v54 — Eight approved cinematic battle paintings integrated
- All eight creator-approved, **background-only** images are committed to `assets/battle-scenes/` as standalone self-contained web-ready SVG files (each wraps a compact JPEG rendition of the exact corresponding original painting). None of the temporary Pokémon-containing mockups is used, and the discarded blue-crystal/lantern cave image is explicitly excluded.
- **Rice Fields** (`rice-fields.svg`) is used for Starting Village and Route 1; **Bamboo Forest** (`bamboo-forest.svg`) for Route 2; **Hidden Forest** (`hidden-forest.svg`) for Hidden Forest; **Mountain Foothills** (`mountain-foothills.svg`) for Route 3; **revised natural Mountain Cave** (`mountain-cave.svg`) for the cave; **Town & Garden** (`town-garden.svg`) for First Town and Garden Town; **Grass Gym** (`grass-gym.svg`) for the Gym; and **Research Laboratory** (`research-lab.svg`) for the Lab.
- Battlefield artwork is selected from the existing battle-start environment snapshot, so moving regions never swaps backgrounds mid-battle. An existing procedural indoor backdrop remains for Player Home and Village Home, which did not receive a separate commissioned painting.
- The rice and bamboo images get a slightly closer crop, following creator feedback that opponents could look too distant. The images stay behind the live Critters, overlays, HP cards, attack buttons and Battle / Index / Escape menu.
- Existing day/dusk/night arena effects, move targeting, 1v1 and occasional 2v2, capture chances, eight-Critter party cap and saved progress are preserved.
- Regression tests verify that all eight asset files exist, contain actual image data, and are mapped to the intended regions. JavaScript syntax and static asset checks were run; in-browser/mobile rendering still needs device verification.

## v55 — Fullscreen cinematic battles and full-screen paused Critter Index
- The battle dialog now occupies the entire visible game viewport; the chosen cinematic painting fills the background edge-to-edge, with ally/enemy figures and HP panels layered over it.
- The opening Battle, Index, and Escape actions are vertically stacked over the bottom-right corner of the arena, rather than appearing below it. Attack buttons remain over the battlefield when Battle is selected. Layout accounts for phone safe areas and short landscape screens.
- Selecting Index opens the actual Critter Index as a **full-screen takeover**. The active encounter and queued actions stay in memory; inspecting tabs and returning to battle does **not** spend a turn.
- In battle, the Party tab offers **Switch into battle** for eligible reserves, the Bag tab offers Potion and Revive actions, and a wild battle's Index offers Capture Beam. Choosing one of those queues the original battle action and uses the existing team-turn combat rules.
- Battle Index intentionally hides evolution actions and Save / Return to Title; permanent party rearrangement, home storage retrieval and module maintenance remain Critter Center-only.
- The existing eight-approved cinematic backgrounds, individual arena mapping, 1v1 and occasional 2v2, eight-Critter party cap, evolution stones and existing saves are preserved.
- Added smoke tests for the full-screen UI and opening/closing the Index without changing active turn or pending actions. JavaScript syntax and isolated pause/restore checks passed; a full mobile-browser visual check is still recommended.

## v56 — Discovery-order Critter IDs (not separate display numbers)
- Species IDs **are** the Critter Index numbers: `cr-001-...` through `cr-209-...`, with no independent `number` field. This supersedes the earlier idea of keeping old internal IDs with separate display-order numbers.
- #001–#003: three-form **Water** starter family; #004–#006: **Rock**; #007–#009: **Electric**. Their final names, designs and artwork remain reserved for Cody and Kyle; each family currently has two level-up evolution links (three total forms, matching the nine reserved slots).
- Starter-exclusive moves registered in `data/moves.json`: **Tidal Heart** (Water), **Bedrock Vow** (Rock), and **Storm Promise** (Electric), learned at level 14 by every form of its respective lineage. Existing starter type advantage rules are preserved.
- #010–#209 are the original 200 draft world species, ordered by likely discovery location and minimum encounter level, with every one-/two-evolution family numbered directly next to its forms. Each existing creature retains its type, authored habitats, moves, evolution requirements, and restricted Dragon/Primordial/Beast status.
- Save migration runs after the full species catalog loads. A `legacySpeciesId` alias within each species entry safely translates old party and stored Critters, capture logs, evolution histories, and collection records to the new actual species IDs; no duplicate discovery numbering is maintained.
- The starter-selection and childhood rival systems now instantiate their reserved real species IDs, with a safe fallback if species data is still loading. Collection and Index search, entry cards, and evolution-chain labels parse numbers directly from IDs.
- New regression coverage checks real sequential IDs, family adjacency, unique starter move exclusivity, and old-save migration. Existing shop and battle functionality remains unchanged.
- **Total Index entries: 209** (200 existing drafted world species plus nine reserved starter forms). Original starter art is still pending.

## v57 — Critical pre-v56 starter migration hotfix
- **Do not infer a starter from the first party slot or from its type/level.** An ordinary same-type catch must remain an ordinary catch even if the original starter was moved to Home storage or reordered.
- A type-only Critter is assigned the reserved starter ID only if it has an explicit `starterOrigin: true` marker. Newly chosen starters receive that provenance flag automatically. Older type-only starters without reliable provenance remain **unidentified rather than guessed**; preserve them for manual review.
- Before pressing Continue on a save that has not completed the new ID migration, the game stores a non-overwriting raw localStorage backup at `critters-v1-before-species-id-migration`. The backup is separate from the primary `critters-v1` key.
- The ID remapping now executes before normalizing party/storage when Continue is clicked **and** after asynchronous species loading, covering either order of operations.
- Added regression tests for same-type catch in first slot, unmarked starter in Home, marked starter in Home, idempotence and backup wiring.
- **Important recovery limitation:** A previously loaded v56 save that has already autosaved the wrong starter ID cannot be reliably repaired from the resulting record alone. Do not overwrite known-good earlier backups; restore or manually identify a Critter using verifiable saved history before assigning starter provenance.

## v60 — Official starter names and Kyle's nine approved sprites
- Water: #001 **Bubblit**, #002 **Rillisk**, #003 **Tiderax**.
- Rock: #004 **Grumlet**, #005 **Craghorn**, #006 **Titanstag**.
- Electric: #007 **Zappit**, #008 **Voltimp**, #009 **Stormbrute**.
- Copy only the nine original pixel-art PNGs from `tune/starter-battle-sprites-20261121` into `main` at unchanged paths and content; do not merge unrelated branch code.
- Starter selection shows first-stage sprite and name; battle figures, Index collection portraits, Index tiles, party details, and watch slots render these sprites with type-icon fallbacks for other Critters.
- Save migration, authoritative IDs, starter signature moves, evolution rules, and portrait battle layout remain unchanged.

## v64 — Starter signatures at level 70 and universal level cap
- Water, Rock, and Electric starter signature moves unlock at level 70 for all three stages instead of level 14.
- All Critters cap at level 100, with no XP accumulation or further level-ups at maximum. Existing party and home storage saves are clamped and the party view displays MAX LEVEL rather than Level 101.
- Previously approved starter names remain until replacement names are approved.

## v65 — Provisional starter evolution names
- Water: #001 Drizzlet → #002 Riptalon → #003 Tidalisk.
- Rock: #004 Craglet → #005 Granibuck → #006 Monolithorn.
- Electric: #007 Sparkin → #008 Voltrix → #009 Tempestrike.
- These provisional names replace the v60 names for display and gameplay only. Species IDs, art paths, starter origin, evolution rules, saves, and level-70 signature moves remain unchanged. Existing saved Critter names are refreshed from species metadata.

## v66 — Natural random wild encounters
- Removed encounter-count and battle-count species unlocking. Every species authored for a region can be encountered from the beginning when its habitat overlaps the area's currently permitted level range; normal legendary badge restrictions still apply.
- Every eligible wild tile independently rolls that area's encounter probability rather than requiring a four-tile cooldown. The first Route 1 encounter guarantee remains for introductory progression.
- Species selection remains weighted by rarity, discovery status and day/night influences; original habitats, level bands, badges, saves, capture mechanics and the full Critter library remain intact. Legacy regional encounter counters are ignored, not deleted, for old-save compatibility.

## v67 — Battle interface refinement
- Battle, Index, and Escape are text-only, shorter buttons.
- Active allied HP cards appear beneath the player's Critter, above the battle narrator (including two allied cards in 2v2).
- The player's combat artwork is larger and positioned closer to the foreground; opponent placement remains unchanged.
- Attack and hit effects display once on resolution rather than replaying on Battle, Index, Back and other interface redraws. Ambient Critter hovering is disabled during battle menus.

## v68 — Battle narrator, health and overlay polish
- Allied active HP cards now use the opponent's original card colors and sit flush with the top of a full-width narrator strip.
- Battle, Index, and Escape are vertically stacked without gaps directly above the narrator, while the narrator extends edge-to-edge underneath.
- Removed redundant in-arena Critter name captions and the oval auras plus artificial arena ellipse overlays; battle sprites, background paintings, and genuine move effects remain intact.

## v69 — Visible build identifier
- Show the current v69 build label on the overworld and combat status header, correcting a stale v62 display that made successful battle deployments look unchanged.
- Refresh the game script query token for a clean asset request when loading the updated index page.
