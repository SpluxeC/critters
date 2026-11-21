# Critters — Live Move System (v36)

**Status: INTEGRATED INTO BATTLES.** `data/moves.json` contains **312 original moves**: 16 each across all 18 Critter types (including Normal, Steel, and Ground), plus 24 Typeless/universal skills. This library is loaded directly at runtime. No need to edit `game.js` to change existing move names, descriptions, stats or effects supported by the engine.

The playable game fetches `data/moves.json` and `data/critters.json` with no-store caching at startup. Refresh the browser after deploying edits. If the data is temporarily inaccessible, combat uses safe fallback moves and does not destroy the save.

## Files Kyle should edit

- **`data/moves.json`** — master definition of every move. Edit `name`, `power`, `accuracy`, `pp`, `description`, `effect`, `type`, `target`, or `priority` here.
- **`data/critters.json`** — live species registry. Add a new object to the `species` array as each original Critter is uploaded.
- **`data/critter-learnset-template.json`** — copyable example structure (not itself a registered species).
- **`game.js`** — executes moves, targeting, PP, status, AI, and level-up learning; do not edit for ordinary move tweaks.

The master files are loaded on every fresh game page visit; Kyle does not need to write new move-combat functions for existing effect IDs.

## Add a Critter with its own level-up moves

Add this **illustrative example only** to the `species` array in `data/critters.json`, replacing the name, ID, type and learnset with Kyle's actual submitted Critter:

```json
{
  "speciesId": "replace-with-original-species-id",
  "name": "Replace with original name",
  "types": ["Water"],
  "role": "balanced",
  "art": {"spritePath": "assets/critters/replace-with-original-species-id.png"},
  "levelUp": [
    {"level": 1, "moveId": "opening-flick"},
    {"level": 5, "moveId": "ripple-jab"},
    {"level": 9, "moveId": "brook-dart"},
    {"level": 16, "moveId": "drench-mark"},
    {"level": 25, "moveId": "tidewell"}
  ]
}
```

**Do not register this example verbatim.** Each species ID must be unique and permanent. The `types` field uses approved type names; the first entry is currently the species' combat type. The second type (if added later) is metadata until dual-type damage rules are explicitly approved. A Critter added by game code with `critter("replace-with-original-species-id", level)` automatically receives its species name, primary type, and learned moves from this registry. Adding an entry does **not** automatically place it in a wild encounter pool or grant it an art asset; Kyle still needs to integrate its sprite and encounter placement.

## In-game behavior now live

- Each Critter has **up to four equipped moves**; on level-up the most recently learned legal moves replace older moves beyond that capacity.
- The battle action panel shows move names, type, category, power and **remaining PP**. Using a move spends one PP; Critter Centers restore all PP and HP.
- Damage, accuracy, attack/defense/accuracy/evasion modifiers, conditions, poison/scorch/bleed/haunt damage ticks, healing, recoil, recharge, terrain, ally shields, and team effects use one shared executor.
- Team-turn **2v2** and wild **1v1** use the same move/target/PP rules. Team-turn order remains player team first and opponent team second; move priority and Speed affect ordering **within** each team.
- Opponents choose from their legal moves. If none has PP, a safe basic fallback is used.
- The Critter Index now has a **Moves** encyclopedia screen to browse types and view moves.
- Previously saved Critters with `Strike`, `<Type> Pulse`, `Guard`, and `Focus` are migrated to legal move IDs, without altering party capacity, capture data, or established type strengths/weaknesses.

## Change moves later without breaking saves

**Keep `id` stable once it has been assigned to a species.** You can rename `name`, rebalance power, accuracy, PP, descriptions and supported effects safely. Each game load picks up the latest move definition. If a move ID is deleted or retired, the game drops the unavailable move and adds available basic moves rather than crashing. A species referencing a retired ID should still have its learnset updated to a replacement ID.

Move format:

```json
{
  "id": "ripple-jab",
  "name": "Ripple Jab",
  "type": "Water",
  "category": "physical",
  "power": 35,
  "accuracy": 100,
  "pp": 30,
  "target": "enemy",
  "priority": 0,
  "requiredLevelGuide": 1,
  "effect": null,
  "description": "A quick close-range strike powered by the user's own momentum."
}
```

`requiredLevelGuide` is a general balance reference only. Species learn at the **explicit levels in their own `levelUp` list**, not the guide level.

### Supported effect IDs

`raise_stat`, `lower_stat`, `ailment`, `terrain`, `recoil`, `recharge`, `switch`, `team_buff`, `guard`, `heal`, `reveal`, `team_guard`, `cure_status`.

Where present, `chance` is a percentage. Stat stages are bounded, and timed terrain expires after its configured turns. Some deeper mechanics (e.g. stat formulas, status tuning, timing, dual types, move animations, and encounter availability) may be rebalanced later.

## Original type chart preserved

Fire, Water, Grass, Rock, Electric, Ice, Flying, Shadow, Ghost, Dragon, Venom, Beast, Primordial, Psychic, Fighting. `Typeless` is a universal move tag, not a sixteenth elemental Critter type.

The approved starter triangle remains **Water beats Rock; Rock beats Electric; Electric beats Water**. The complete existing type chart is still defined in `game.js`.

## Normal, Steel and Ground expansion (v36)

All three are **real Critter types**, not aliases for Typeless. The encyclopedia includes their moves under separate type buttons. The previous 15 type strengths and weaknesses and the Water → Rock → Electric → Water starter triangle have not been changed.

- **Normal:** broadly neutral, with a weakness to Fighting. Straightforward physical attacks, sound-based special attacks, and small self-support options. New examples: Quick Nudge, Tail Flick, Paw Tap, Echo Bark.
- **Steel:** strong attacking Rock and Ice; vulnerable to Fire, Fighting, and Ground. Heavy physical strikes, beams, armor, and defensive support. New examples: Tin Tap, Chrome Beam, Steel Hammer.
- **Ground:** strong attacking Electric, Steel, and Venom; vulnerable to Water, Grass, and Ice. Burrowing attacks, earth impacts, and terrain-themed support. New examples: Dust Kick, Clay Shot, Quake Stomp, Faultline.

The 200-Critter registry assigns at least one of these three types to **52 species**: 21 with Normal, 15 with Steel, and 16 with Ground. Each affected species has **three curated moves** of its new type at level-up thresholds, and the remaining original move assignments stay available. Stats, PP, effects, and levels can still be revised in JSON; permanent species IDs and evolution chains should be preserved.

**Typeless stays move-only.** It does not become a Critter type and it does not have an elemental multiplier. Original-art placeholders are untouched.
