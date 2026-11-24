# Critters — master artwork inventory and production queue

Prepared 2026-11-24 from main revision `de3280f69d70f87970dfee5f49d262fe6c0368b4`. This is a development-only asset reference, not a new species design or gameplay specification.

## Reconciliation

- Main contained 52 asset paths (32 Critter PNGs). Development branches supplied 60 extra paths: 51 unique PNG blobs and 9 exact SHA matches to files already on main. The unique files are imported without changing their bytes. Duplicates are not copied.
- The 51 additions are 24 front/rear design pairs (48 images) plus three rear-only beetle images. These are **unassigned**; do not make them encounterable or attach evolution links until their mapping is approved. The source PRs [#1](https://github.com/SpluxeC/critters/pull/1) and [#2](https://github.com/SpluxeC/critters/pull/2) report 96×96 transparent PNG validation. The imported objects use the identical source SHAs, not resized or regenerated versions.
- All 15 ready species already have valid front and rear paths. Scruffin has two gender variants. Keep its existing species ID and cosmetic variants. The existing Falquill and Toxidot families retain their current implementation. Do not merge stale gameplay code from art branches.
- Registry: 215 species; 15 with registered artwork; 200 marked awaiting-upload. An awaiting-upload flag is not proof that no matching artwork exists elsewhere. Design-to-species approval remains necessary.
- Use the implemented registry names and stable IDs for production tracking. The earlier story-bible starter names (Bubblit/Rillisk/Tiderax; Grumlet/Craghorn/Titanstag; Zappit/Voltimp/Stormbrute) differ from the game. Do not rename or migrate them as part of an art audit.
- [Developer preview gallery](asset-gallery.html) displays existing active artwork and unassigned art without registering species or exposing a new player-facing menu.

## Registered art (front / rear)

| Stable species ID | Name | Front | Rear |
|---|---|---|---|
| cr-001-starter-water-1 | Drizzlet | [water.png](assets/critters/starters/water.png) | [water-starter-stage-1-back.png](assets/critters/battle-backs/starters/water-starter-stage-1-back.png) |
| cr-002-starter-water-2 | Riptalon | [water-starter-stage-2.png](assets/critters/gallery/water-starter-stage-2.png) | [water-starter-stage-2-back.png](assets/critters/battle-backs/starters/water-starter-stage-2-back.png) |
| cr-003-starter-water-3 | Tidalisk | [water-starter-stage-3.png](assets/critters/gallery/water-starter-stage-3.png) | [water-starter-stage-3-back.png](assets/critters/battle-backs/starters/water-starter-stage-3-back.png) |
| cr-004-starter-rock-1 | Craglet | [rock.png](assets/critters/starters/rock.png) | [rock-starter-stage-1-back.png](assets/critters/battle-backs/starters/rock-starter-stage-1-back.png) |
| cr-005-starter-rock-2 | Granibuck | [rock-starter-stage-2.png](assets/critters/gallery/rock-starter-stage-2.png) | [rock-starter-stage-2-back.png](assets/critters/battle-backs/starters/rock-starter-stage-2-back.png) |
| cr-006-starter-rock-3 | Monolithorn | [rock-starter-stage-3.png](assets/critters/gallery/rock-starter-stage-3.png) | [rock-starter-stage-3-back.png](assets/critters/battle-backs/starters/rock-starter-stage-3-back.png) |
| cr-007-starter-electric-1 | Sparkin | [electric.png](assets/critters/starters/electric.png) | [electric-starter-stage-1-back.png](assets/critters/battle-backs/starters/electric-starter-stage-1-back.png) |
| cr-008-starter-electric-2 | Voltrix | [electric-starter-stage-2.png](assets/critters/gallery/electric-starter-stage-2.png) | [electric-starter-stage-2-back.png](assets/critters/battle-backs/starters/electric-starter-stage-2-back.png) |
| cr-009-starter-electric-3 | Tempestrike | [electric-starter-stage-3.png](assets/critters/gallery/electric-starter-stage-3.png) | [electric-starter-stage-3-back.png](assets/critters/battle-backs/starters/electric-starter-stage-3-back.png) |
| cr-210-falquill | Falquill | [falcon-stage-1-front.png](assets/critters/route-one-designs/route-1/falcon-stage-1-front.png) | [falcon-stage-1-back.png](assets/critters/route-one-designs/route-1/falcon-stage-1-back.png) |
| cr-211-falrift | Falrift | [falcon-stage-2-front.png](assets/critters/route-one-designs/route-1/falcon-stage-2-front.png) | [falcon-stage-2-back.png](assets/critters/route-one-designs/route-1/falcon-stage-2-back.png) |
| cr-212-falgrath | Falgrath | [falcon-stage-3-front.png](assets/critters/route-one-designs/route-1/falcon-stage-3-front.png) | [falcon-stage-3-back.png](assets/critters/route-one-designs/route-1/falcon-stage-3-back.png) |
| cr-213-toxidot | Toxidot | [venom-larva-front.png](assets/critters/route-one-designs/venom-moth/venom-larva-front.png) | [venom-larva-back.png](assets/critters/route-one-designs/venom-moth/venom-larva-back.png) |
| cr-214-mothoxin | Mothoxin | [venom-owl-moth-front.png](assets/critters/route-one-designs/venom-moth/venom-owl-moth-front.png) | [venom-owl-moth-back.png](assets/critters/route-one-designs/venom-moth/venom-owl-moth-back.png) |
| cr-215-scruffin | Scruffin (female) | [aussie-red-merle-stage-1-front.png](assets/critters/route-one-designs/roster/aussie-red-merle-stage-1-front.png) | [aussie-red-merle-stage-1-back.png](assets/critters/route-one-designs/roster/aussie-red-merle-stage-1-back.png) |
| cr-215-scruffin | Scruffin (male) | [aussie-blue-merle-stage-1-front.png](assets/critters/route-one-designs/roster/aussie-blue-merle-stage-1-front.png) | [aussie-blue-merle-stage-1-back.png](assets/critters/route-one-designs/roster/aussie-blue-merle-stage-1-back.png) |

## Imported artwork awaiting species approval

| Design label (not a species name) | Front | Rear | Status |
|---|---|---|---|
| Aussie Blue Merle Stage 2 | [aussie-blue-merle-stage-2.png](assets/critters/gallery/aussie-blue-merle-stage-2.png) | [aussie-blue-merle-stage-2-back.png](assets/critters/battle-backs/roster/aussie-blue-merle-stage-2-back.png) | Unassigned artwork |
| Aussie Blue Merle Stage 3 | [aussie-blue-merle-stage-3.png](assets/critters/gallery/aussie-blue-merle-stage-3.png) | [aussie-blue-merle-stage-3-back.png](assets/critters/battle-backs/roster/aussie-blue-merle-stage-3-back.png) | Unassigned artwork |
| Aussie Red Merle Stage 2 | [aussie-red-merle-stage-2.png](assets/critters/gallery/aussie-red-merle-stage-2.png) | [aussie-red-merle-stage-2-back.png](assets/critters/battle-backs/roster/aussie-red-merle-stage-2-back.png) | Unassigned artwork |
| Aussie Red Merle Stage 3 | [aussie-red-merle-stage-3.png](assets/critters/gallery/aussie-red-merle-stage-3.png) | [aussie-red-merle-stage-3-back.png](assets/critters/battle-backs/roster/aussie-red-merle-stage-3-back.png) | Unassigned artwork |
| Electric Pronghorn Stage 1 | [electric-pronghorn-stage-1.png](assets/critters/gallery/electric-pronghorn-stage-1.png) | [electric-pronghorn-stage-1-back.png](assets/critters/battle-backs/roster/electric-pronghorn-stage-1-back.png) | Unassigned artwork |
| Electric Pronghorn Stage 2 | [electric-pronghorn-stage-2.png](assets/critters/gallery/electric-pronghorn-stage-2.png) | [electric-pronghorn-stage-2-back.png](assets/critters/battle-backs/roster/electric-pronghorn-stage-2-back.png) | Unassigned artwork |
| Fire Red Panda Stage 1 | [fire-red-panda-stage-1.png](assets/critters/gallery/fire-red-panda-stage-1.png) | [fire-red-panda-stage-1-back.png](assets/critters/battle-backs/roster/fire-red-panda-stage-1-back.png) | Unassigned artwork |
| Flying Microraptor Stage 1 | [flying-microraptor-stage-1.png](assets/critters/gallery/flying-microraptor-stage-1.png) | [flying-microraptor-stage-1-back.png](assets/critters/battle-backs/roster/flying-microraptor-stage-1-back.png) | Unassigned artwork |
| Flying Microraptor Stage 2 | [flying-microraptor-stage-2.png](assets/critters/gallery/flying-microraptor-stage-2.png) | [flying-microraptor-stage-2-back.png](assets/critters/battle-backs/roster/flying-microraptor-stage-2-back.png) | Unassigned artwork |
| Ghost Cat Stage 1 | [ghost-cat-stage-1.png](assets/critters/gallery/ghost-cat-stage-1.png) | [ghost-cat-stage-1-back.png](assets/critters/battle-backs/roster/ghost-cat-stage-1-back.png) | Unassigned artwork |
| Ghost Cat Stage 2 | [ghost-cat-stage-2.png](assets/critters/gallery/ghost-cat-stage-2.png) | [ghost-cat-stage-2-back.png](assets/critters/battle-backs/roster/ghost-cat-stage-2-back.png) | Unassigned artwork |
| Grass Glyptodont Stage 1 | [grass-glyptodont-stage-1.png](assets/critters/gallery/grass-glyptodont-stage-1.png) | [grass-glyptodont-stage-1-back.png](assets/critters/battle-backs/roster/grass-glyptodont-stage-1-back.png) | Unassigned artwork |
| Grass Glyptodont Stage 2 | [grass-glyptodont-stage-2.png](assets/critters/gallery/grass-glyptodont-stage-2.png) | [grass-glyptodont-stage-2-back.png](assets/critters/battle-backs/roster/grass-glyptodont-stage-2-back.png) | Unassigned artwork |
| Ice Winter Stoat Stage 1 | [ice-winter-stoat-stage-1.png](assets/critters/gallery/ice-winter-stoat-stage-1.png) | [ice-winter-stoat-stage-1-back.png](assets/critters/battle-backs/roster/ice-winter-stoat-stage-1-back.png) | Unassigned artwork |
| Psychic Aye Aye Stage 1 | [psychic-aye-aye-stage-1.png](assets/critters/gallery/psychic-aye-aye-stage-1.png) | [psychic-aye-aye-stage-1-back.png](assets/critters/battle-backs/roster/psychic-aye-aye-stage-1-back.png) | Unassigned artwork |
| Psychic Aye Aye Stage 2 | [psychic-aye-aye-stage-2.png](assets/critters/gallery/psychic-aye-aye-stage-2.png) | [psychic-aye-aye-stage-2-back.png](assets/critters/battle-backs/roster/psychic-aye-aye-stage-2-back.png) | Unassigned artwork |
| Rock Mastodon Stage 1 | [rock-mastodon-stage-1.png](assets/critters/gallery/rock-mastodon-stage-1.png) | [rock-mastodon-stage-1-back.png](assets/critters/battle-backs/roster/rock-mastodon-stage-1-back.png) | Unassigned artwork |
| Rock Mastodon Stage 2 | [rock-mastodon-stage-2.png](assets/critters/gallery/rock-mastodon-stage-2.png) | [rock-mastodon-stage-2-back.png](assets/critters/battle-backs/roster/rock-mastodon-stage-2-back.png) | Unassigned artwork |
| Shadow Borzoi Stage 1 | [shadow-borzoi-stage-1.png](assets/critters/gallery/shadow-borzoi-stage-1.png) | [shadow-borzoi-stage-1-back.png](assets/critters/battle-backs/roster/shadow-borzoi-stage-1-back.png) | Unassigned artwork |
| Shadow Borzoi Stage 2 | [shadow-borzoi-stage-2.png](assets/critters/gallery/shadow-borzoi-stage-2.png) | [shadow-borzoi-stage-2-back.png](assets/critters/battle-backs/roster/shadow-borzoi-stage-2-back.png) | Unassigned artwork |
| Venom Thorny Devil Stage 1 | [venom-thorny-devil-stage-1.png](assets/critters/gallery/venom-thorny-devil-stage-1.png) | [venom-thorny-devil-stage-1-back.png](assets/critters/battle-backs/roster/venom-thorny-devil-stage-1-back.png) | Unassigned artwork |
| Water Venom Otter Stage 1 | [water-venom-otter-stage-1.png](assets/critters/gallery/water-venom-otter-stage-1.png) | [water-venom-otter-stage-1-back.png](assets/critters/battle-backs/roster/water-venom-otter-stage-1-back.png) | Unassigned artwork |
| Water Venom Otter Stage 2 | [water-venom-otter-stage-2.png](assets/critters/gallery/water-venom-otter-stage-2.png) | [water-venom-otter-stage-2-back.png](assets/critters/battle-backs/roster/water-venom-otter-stage-2-back.png) | Unassigned artwork |
| Water Venom Otter Stage 3 | [water-venom-otter-stage-3.png](assets/critters/gallery/water-venom-otter-stage-3.png) | [water-venom-otter-stage-3-back.png](assets/critters/battle-backs/roster/water-venom-otter-stage-3-back.png) | Unassigned artwork |
| beetle stage 1 | Not available | [beetle-stage-1-back.png](assets/critters/battle-backs/route-1/beetle-stage-1-back.png) | Rear only; no approved front |
| beetle stage 2 | Not available | [beetle-stage-2-back.png](assets/critters/battle-backs/route-1/beetle-stage-2-back.png) | Rear only; no approved front |
| beetle stage 3 | Not available | [beetle-stage-3-back.png](assets/critters/battle-backs/route-1/beetle-stage-3-back.png) | Rear only; no approved front |

## Duplicate aliases intentionally not copied

| Source alias | Existing identical file |
|---|---|
| `assets/critters/gallery/aussie-blue-merle-stage-1.png` | [assets/critters/route-one-designs/roster/aussie-blue-merle-stage-1-front.png](assets/critters/route-one-designs/roster/aussie-blue-merle-stage-1-front.png) |
| `assets/critters/gallery/aussie-red-merle-stage-1.png` | [assets/critters/route-one-designs/roster/aussie-red-merle-stage-1-front.png](assets/critters/route-one-designs/roster/aussie-red-merle-stage-1-front.png) |
| `assets/critters/battle-backs/roster/aussie-blue-merle-stage-1-back.png` | [assets/critters/route-one-designs/roster/aussie-blue-merle-stage-1-back.png](assets/critters/route-one-designs/roster/aussie-blue-merle-stage-1-back.png) |
| `assets/critters/battle-backs/roster/aussie-red-merle-stage-1-back.png` | [assets/critters/route-one-designs/roster/aussie-red-merle-stage-1-back.png](assets/critters/route-one-designs/roster/aussie-red-merle-stage-1-back.png) |
| `assets/critters/battle-backs/route-1/falcon-stage-1-back.png` | [assets/critters/route-one-designs/route-1/falcon-stage-1-back.png](assets/critters/route-one-designs/route-1/falcon-stage-1-back.png) |
| `assets/critters/battle-backs/route-1/falcon-stage-2-back.png` | [assets/critters/route-one-designs/route-1/falcon-stage-2-back.png](assets/critters/route-one-designs/route-1/falcon-stage-2-back.png) |
| `assets/critters/battle-backs/route-1/falcon-stage-3-back.png` | [assets/critters/route-one-designs/route-1/falcon-stage-3-back.png](assets/critters/route-one-designs/route-1/falcon-stage-3-back.png) |
| `assets/critters/battle-backs/venom-moth/venom-larva-back.png` | [assets/critters/route-one-designs/venom-moth/venom-larva-back.png](assets/critters/route-one-designs/venom-moth/venom-larva-back.png) |
| `assets/critters/battle-backs/venom-moth/venom-owl-moth-back.png` | [assets/critters/route-one-designs/venom-moth/venom-owl-moth-back.png](assets/critters/route-one-designs/venom-moth/venom-owl-moth-back.png) |

## Route 1 coverage

21 registered encounter candidates: 3 ready and 18 awaiting art registration.

| Species ID | Name | Artwork status |
|---|---|---|
| cr-010-grovehorn | Grovehorn | awaiting-upload |
| cr-011-bloomtail | Bloomtail | awaiting-upload |
| cr-012-verdantusk | Verdantusk | awaiting-upload |
| cr-013-foamlark | Foamlark | awaiting-upload |
| cr-014-reeflet | Reeflet | awaiting-upload |
| cr-015-granipup | Granipup | awaiting-upload |
| cr-017-joltling | Joltling | awaiting-upload |
| cr-018-gliderill | Gliderill | awaiting-upload |
| cr-019-runnelot | Runnelot | awaiting-upload |
| cr-021-mistmew | Mistmew | awaiting-upload |
| cr-022-scorchub | Scorchub | awaiting-upload |
| cr-023-blazefin | Blazefin | awaiting-upload |
| cr-024-pebblit | Pebblit | awaiting-upload |
| cr-027-bouldibble | Bouldibble | awaiting-upload |
| cr-029-obsiduck | Obsiduck | awaiting-upload |
| cr-030-luminix | Luminix | awaiting-upload |
| cr-031-spindleleaf | Spindleleaf | awaiting-upload |
| cr-032-windoodle | Windoodle | awaiting-upload |
| cr-210-falquill | Falquill | ready |
| cr-213-toxidot | Toxidot | ready |
| cr-215-scruffin | Scruffin | ready |

## NPC asset audit

Existing integrated: `assets/male.png`, `assets/female.png`, `assets/npc-researcher.png`, `assets/npc-lab-assistant.png`, `assets/npc-characters.svg` (28 generic variants). The game currently uses dedicated professor/researcher and lab-assistant sheets, with the shared SVG as fallback. The other named roles below should not be described as individually integrated until files and render bindings are verified.

Eleven local project NPC sheets were recovered and checked: all are 128×128, contain alpha/transparency, and use a four-row, four-column layout (down/up/left/right, 32×32 cells). This is a technical check, not final animation or art approval.

| Local sheet | Status / next action |
|---|---|
| npc-professor.png | Alternate local art; retain working npc-researcher.png until replacement is approved. |
| npc-lab-assistant.png | Local sheet has incomplete/cropped frames; do not replace working asset. |
| npc-rival.png | Local candidate; upload and bind only to the childhood rival. |
| npc-mother.png | Local candidate; upload and bind to player-home mother. |
| npc-center-nurse.png | Local candidate; upload and bind to Center role. |
| npc-shopkeeper.png | Local candidate; front-row frame polish/review needed. |
| npc-rice-farmer.png | Local candidate; upload and bind to farmer role; occupation animations still needed. |
| npc-fisherman.png | Local candidate; side-row stray pixels and consistent frame review needed. |
| npc-gym-leader-grass.png | Local candidate; bind only to Grass Gym leader. |
| npc-gym-trainer-grass.png | Local candidate; review cropped front poses and frame consistency. |
| npc-gym-leader-water.png | Local candidate; reserve for future Water Gym, no new NPC placement. |

Local art is not included in this commit. Preserve working files and default fallback behavior. Walking and occupation animation require actual movement/task state; do not animate standing NPCs indiscriminately.

## Existing world art (retain)

- Tree variants: `assets/trees/broadleaf.svg`, `round.svg`, `tiered.svg`. Existing sway and collision are already implemented.
- Village house, laboratory, neighbor SVGs and regional map illustration.
- All eight battle backgrounds: rice-fields, bamboo-forest, hidden-forest, mountain-foothills, mountain-cave, town-garden, grass-gym, research-lab.
- Grass, paths, flowers, rocks, water, fences, flooring, interiors, environmental and battle effects are currently partly procedural. They are functional, not absent. Replace only with compatible reusable art after visual approval; preserve collision, transitions and saved state.

## Prioritized production queue (before regional expansion)

1. **Reconcile current artwork:** import unique files (this commit); resolve unassigned art against stable species IDs, review paired sprites; upload reviewed NPC files and test render bindings; retain existing starters unless creators explicitly approve a name change.
2. **Reusable terrain:** grass, dirt and stone paths with transitions; tall grass; animated water; shores/riverbanks; cliffs/elevation; rocks/boulders; shrubs, flowers, fences, walls, bridges, gates, cuttable vegetation, signs, stairs/ramps. Base map cell size 32px; exact atlas layout depends on autotile and rendering design.
3. **Starting Village / interiors:** reusable wood/stone floors, walls, beds, tables, chairs, kitchens, cupboards, shelving, windows, doors, lab stations/computers, starter display, lighting, Critter Center and item shop exteriors/interiors. Reuse existing three village building sprites.
4. **Early routes / Grass Gym:** paddy tiles and rice growth/sway, irrigation, farming and fishing tools, bamboo, forest plants/mushrooms, cave entrance/terrain, mountain formations, Grass Gym exterior and interior, hedge maze and switches, gate, badge, approved early Critter front/rear art. Keep existing battle backgrounds.
5. **NPC task art:** walking cycles, planting/harvesting, fishing cast/reel, research, equipment maintenance, Center service, stocking shelves, household tasks, trainer practice. Preserve idle poses.
6. **Subsequent regions, in order:** Water/coastal, Electric/industrial, Rock/mountain, Fire/volcanic, Ice/snow, Shadow/historic, Steel/metropolitan, regional league. Expand each into discrete asset rows after its map and encounter design.
7. **Story assets:** Team Eclipse recruits/commanders/supreme leader, excavations, ruins, artifacts and facilities at their first required milestone. Drakoryn, Eonolith, Feralune front/rear/cinematic art, Eclipse Engine, final headquarters, recovery variants and guardian trials. All three legendary art entries currently await upload.
8. **Postgame / polish:** rematch environments, Championship celebrations, epilogues, optional dungeons, additional effects and iconography.

## Completion gate

Do not confuse this source-art consolidation with playable integration. Species mapping, additional sprite cleanup/upload, final tileset production, NPC animation bindings, and runtime testing remain separate tasks. No registry, game.js, index.html, save format, encounters, stats, evolution mechanics, or existing artwork is altered by this inventory commit.

## v87 paired-art registration update (supersedes previous unassigned status)

22 new consecutive species IDs #216–237 use the 24 recovered front/rear pairs (two extra pairs are Scruffin-family coat variants). 37 species are now ready; 200 remain awaiting art. The three rear-only Beetle files remain unregistered. New names, stats and learnsets are draft; no new wild habitats or evolution rules were enabled. The nine existing starters now declare rear paths explicitly.

| ID | Draft name | Type | Art |
|---|---|---|---|
| cr-216-ruffguard | Ruffguard | Fighting | Both coats, front/rear |
| cr-217-barkwarden | Barkwarden | Fighting | Both coats, front/rear |
| cr-218-mossplate | Mossplate | Grass | Front/rear |
| cr-219-bramblevault | Bramblevault | Grass | Front/rear |
| cr-220-sparkhorn | Sparkhorn | Electric | Front/rear |
| cr-221-thundelope | Thundelope | Electric | Front/rear |
| cr-222-pebblusk | Pebblusk | Rock | Front/rear |
| cr-223-mastolith | Mastolith | Rock | Front/rear |
| cr-224-quilldash | Quilldash | Flying | Front/rear |
| cr-225-aerosaur | Aerosaur | Flying | Front/rear |
| cr-226-emberpuff | Emberpuff | Fire | Front/rear |
| cr-227-sludgip | Sludgip | Water/Venom | Front/rear |
| cr-228-toxotter | Toxotter | Water/Venom | Front/rear |
| cr-229-venomwake | Venomwake | Water/Venom | Front/rear |
| cr-230-thornix | Thornix | Venom | Front/rear |
| cr-231-wispurr | Wispurr | Ghost | Front/rear |
| cr-232-phantompaw | Phantompaw | Ghost | Front/rear |
| cr-233-mindwink | Mindwink | Psychic | Front/rear |
| cr-234-seerclaw | Seerclaw | Psychic | Front/rear |
| cr-235-duskhound | Duskhound | Shadow | Front/rear |
| cr-236-noctirush | Noctirush | Shadow | Front/rear |
| cr-237-froststoat | Froststoat | Ice | Front/rear |
