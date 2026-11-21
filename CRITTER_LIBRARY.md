# Critters — 200-species master library (v27)

The master roster is live at `data/critters.json`. It contains exactly **200 draft Critters**. Names, art, stats, move selections, levels, roles and map habitats are all editable by Cody and Kyle. The Critter Index in the game shows the roster under **Moves → Critters** (adjacent tabs).

## Files

- `data/critters.json`: authoritative catalog. Each object in `species` is one Critter.
- `data/moves.json`: existing 264-move library. Use its stable move IDs in each Critter's `levelUp`.
- `data/critter-learnset-template.json`: starter schema when creating another Critter later.
- `game.js`: loads the registry, renders the searchable catalog, and uses habitat records to choose wild encounters.
- Original art: upload sprites to `assets/critters/`, then set the matching species' `art` to `{"status":"ready","spritePath":"assets/critters/your-id.png"}`.

## Species schema (example)

```json
{
  "speciesId": "cr-001-mosslilt",
  "number": 1,
  "name": "Mosslilt",
  "types": ["Grass"],
  "role": "balanced",
  "baseStats": {
    "hp": 22,
    "attack": 12,
    "defense": 8,
    "specialAttack": 11,
    "specialDefense": 13,
    "speed": 12
  },
  "habitats": [
    {
      "areaId": "route1",
      "areaName": "Route 1 — Rice Fields",
      "minLevel": 2,
      "maxLevel": 5,
      "rarity": "common"
    }
  ],
  "levelUp": [
    {"level": 1, "moveId": "opening-flick"},
    {"level": 4, "moveId": "leaf-nudge"}
  ],
  "art": {"status": "awaiting-upload", "spritePath": null}
}
```

The example explains the shape, not the complete actual Mosslilt entry; consult the JSON for its latest values.

**Important:** Keep `speciesId` stable once it exists in saves. Species `number` must remain unique from 1 to 200. Up to two types per species, and only one species across the entire roster may include each of **Dragon**, **Primordial**, and **Beast**; those three types may never be paired together. The reserved entries are #198 Drakoryn (Dragon/Fire), #199 Eonolith (Primordial/Rock), and #200 Feralune (Beast/Shadow). Cody and Kyle can redesign or rename those entries while preserving their special-type exclusivity.

## Base statistics

`baseStats` is the species' **level-one reference** with six attributes: HP, Attack, Defense, Special Attack, Special Defense, Speed. The game derives new species' maximum HP as its level-one HP plus four per gained level. Attack, Defense, Special Attack, Special Defense, and Speed are now **active battle stats**: each grows approximately 1.25 per level. Physical move damage uses Attack versus Defense; special move damage uses Special Attack versus Special Defense. Speed determines action order **within** each team's turn, while move priority still takes precedence. Existing saved HP is preserved during migration, and older type-only Critters receive neutral default stats.

## Habitats and encounters

Every species includes at least one map habitat and a wild level range. Supported habitat IDs:

- `route1` — Route 1 rice fields
- `route2` — Route 2 bamboo forest
- `forest` — optional Hidden Forest
- `route3` — Route 3 mountain foothills
- `cave` — Mountain Cave (requires the vegetation cutter)
- `garden` — Garden Town outskirts, encountered in flower patches

The existing encounter chance while entering encounter terrain is preserved; once an encounter triggers, the species is selected from the registry entries that name the player's current area. The `rarity` field weights encounters: common > uncommon > rare > legendary. A legendary creature is **not guaranteed** by its presence in the encyclopedia.

## Learnsets

Every draft Critter has eight level-up assignments through level 45. The game automatically equips the latest four legal learned moves at the Critter's level. Edit a learnset to adjust moves or learning levels, using the exact stable move IDs from `data/moves.json`. If you remove or rename an ID, provide a replacement in the species file; the game has a fallback for retired moves.

Wild Critters are instantiated from the registered species, so their names, first type, basic HP, and level-appropriate moves will be reflected in encounters. Both listed types now participate in defensive weakness and resistance calculation. Each type's original single-type effectiveness (2×, 0.5×, or 1×) is multiplied, allowing **4×, 2×, 1×, 0.5×, and 0.25×** results. A strong matchup against one type and a resisted matchup against the second cancel to 1×. The original type chart and Water > Rock > Electric > Water starter triangle are unchanged.

## Collaboration workflow

1. Choose any draft number/name and revise its identity when its original art is ready.
2. Keep its `speciesId` stable, set `types` (one or two), `baseStats` and `habitats`.
3. Assign eight or fewer suitable level-up moves using `moveId` + `level`.
4. Upload the final sprite to the repository; set `art.status` to `ready` and `art.spritePath` to the corresponding project-relative PNG.
5. Commit the changed JSON. Reload Critters and inspect **Critter Index → Critters** to check the entry and wild encounter.
6. Keep the special three-type uniqueness rule intact when rebalancing the roster.

The roster is draft content for art collaboration—not 200 finished, approved visual designs.

## Battle-stat rollout (v28)

- Each of the six base statistics is the reference value at **level 1**. Higher levels add +4 maximum HP and approximately +1.25 to Attack, Defense, Special Attack, Special Defense, and Speed per level (subject to rounding).
- Damage uses the relevant offensive and defensive stats; battlefield stat stages and existing Power Coil / Guard Plate / Weakening Field bonuses still apply.
- For dual-type defense, calculate effectiveness separately against each of the defender's two types, then multiply. There are no automatic immunities or new type advantages.
- Team-turn rules are preserved: players choose one action per active Critter, their team resolves actions, and then the opposing team acts. Speed and move priority order actions **within** each team.
- Older saves remain compatible. When a registered species' stats or types are edited in `data/critters.json`, the game refreshes its metadata on load while retaining saved HP and party arrangements.


## Discovery and Collection (v29)

The Critter Index keeps permanent **Unseen → Seen → Captured** progress for the 200 registered species. The progress key is the stable `speciesId`, **not** the display name or Pokédex-style number, so Cody and Kyle can rename a species or replace its artwork without resetting collection progress.

- **Unseen**: no recorded encounter. The reference encyclopedia still lists draft species and their planned habitats so collaborators can review the entire roster.
- **Seen**: the player has encountered that species as a wild Critter or in a trainer's team. The save stores first-seen area/day, last-seen area, and recorded encounter count.
- **Captured**: the player successfully used the Critter Index capture beam; the save stores first-capture area/day/level and capture count. Duplicate catches update the count but never increase **unique species** progress.
- **Collection filters**: the Critters tab supports All, Unseen, Seen only, and Captured, alongside type, habitat, and text search. Individual species pages include a discovery-history panel.
- **Progress**: Records shows `seen/200`, `captured/200`, percentage, and milestone rewards. Rewards are **manually claimed** and permanently recorded in `s.collection.claimedMilestones`. Claiming again is blocked, including after loading an old save.

| Unique captured species | Credits | Potions | Revives |
| ---: | ---: | ---: | ---: |
| 5 | 100 | 2 | 0 |
| 10 | 200 | 3 | 0 |
| 25 | 400 | 4 | 1 |
| 50 | 800 | 5 | 2 |
| 100 | 1,600 | 8 | 3 |
| 150 | 2,400 | 10 | 4 |
| 200 | 4,000 | 15 | 5 |

**Migration:** Previously saved party/storage entries and capture-log entries with valid `speciesId` values are credited as captured, without inventing missing encounter details. Legacy records containing only a generic type cannot be confidently assigned to an individual species. Those are preserved as existing save records but do not count toward the 200 unique species. Milestone rewards can be claimed retroactively in the Index if the backfilled unique count qualifies.

**No unrelated gameplay changes:** Battles, team turns, type strengths, encounter frequency, party capacity, home storage, original-art placeholders, and the 264-move library remain unchanged.

## Evolution and progression (v30)

**The 200-species cap stays fixed.** This draft roster links existing species into **12 three-stage evolution families** and **24 two-stage families**; 116 species remain standalone. The three restricted entries — Drakoryn (Dragon/Fire), Eonolith (Primordial/Rock), and Feralune (Beast/Shadow) — never evolve or serve as evolution targets. These draft lines may be redesigned when Cody and Kyle upload official art.

An evolving species has an editable entry in `data/critters.json`:

```json
"evolvesTo": {
  "speciesId": "cr-002-fernlet",
  "minLevel": 12
}
```

Conditional forms specify one additional requirement, for example:

```json
"evolvesTo": {
  "speciesId": "cr-003-bramblemuff",
  "minLevel": 28,
  "condition": {"kind": "night"}
}
```

Available `condition.kind` values:
- **none**: evolve at the stated minimum level.
- **`night`**: between 20:00 and 05:00 on the in-game world clock.
- **`day`**: between 07:00 and 17:00.
- **`badge`**: `{"kind":"badge","minimum":1}` requires that many earned badges.
- **`area`**: `{"kind":"area","areaId":"forest"}` requires the player to be standing in that map area.

On gaining a level that meets every condition, a Critter automatically evolves and a celebration is shown after battle. If it already meets the level threshold but missed a special condition, its **Critter Index → Party** card shows a condition hint and enables the **Evolve** button whenever the condition is met. Evolution does **not** require a Critter Center, consume items, or change the active party size.

Evolution preserves the individual Critter object (including XP, move PP where moves overlap, and its place in the party or home storage). It changes to the target species name, types and stats, updates the legal learned moves, and adjusts HP to reflect the new form while preserving existing missing HP. The prior evolution is kept in `evolutionHistory` in the saved Critter.

Evolution also registers the resulting form as **obtained** in the 200-species collection and counts it toward unique-species milestones, without increasing the capture-beam total or recording a fictional beam capture. An evolution-acquired form's `captures` is 0 and its `obtainedBy` is `evolution`. All original (pre-evolution) entries remain recorded.

The whole evolution graph is editable. If a chain is revised, use stable `speciesId` targets and matching `evolvesFrom` backlinks, avoid cycles, and preserve the one-only rule for Dragon, Primordial and Beast. Species not assigned a chain remain standalone, so no new species or new artwork is required.
