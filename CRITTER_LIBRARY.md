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

`baseStats` is the species' **level-one reference** with six attributes: HP, Attack, Defense, Special Attack, Special Defense, Speed. The current game derives the new species' HP as its base HP plus four per level gained. Other base stats are exposed for browsing and later balancing, without replacing the existing damage formula. This avoids silently changing approved battles during the catalog rollout.

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

Wild Critters are instantiated from the registered species, so their names, first type, basic HP, and level-appropriate moves will be reflected in encounters. A second type is currently displayed as species metadata; the approved single-type weakness calculation has not been expanded to combined dual-type effectiveness.

## Collaboration workflow

1. Choose any draft number/name and revise its identity when its original art is ready.
2. Keep its `speciesId` stable, set `types` (one or two), `baseStats` and `habitats`.
3. Assign eight or fewer suitable level-up moves using `moveId` + `level`.
4. Upload the final sprite to the repository; set `art.status` to `ready` and `art.spritePath` to the corresponding project-relative PNG.
5. Commit the changed JSON. Reload Critters and inspect **Critter Index → Critters** to check the entry and wild encounter.
6. Keep the special three-type uniqueness rule intact when rebalancing the roster.

The roster is draft content for art collaboration—not 200 finished, approved visual designs.
