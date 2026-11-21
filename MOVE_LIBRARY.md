# Critters — Original Move Master Library (v1)

**264 original moves**: 16 per each of the game's **15 established Critter types** (240), plus **24 Typeless/universal techniques**.

This is an original move catalog with familiar genre mechanics, **not a renamed copy of the Pokémon move database**.

## Status

**Design library only.** Data is stored at `data/moves.json`. The live v25 battle system still uses its existing four baseline actions and is deliberately unchanged. Implement the move engine as a separate, tested phase once actual Critter species are being added.

## Data schema

Every move has `id`, `name`, `type`, `category` (`physical`, `special`, `status`), `power` (0 for status), `accuracy` (percent), `pp`, `target` (`enemy`, `self`, `ally`, `ally_team`, `field`), `priority`, `requiredLevelGuide`, `effect` (optional machine-readable future mechanic), and `description`.

**Typeless** means a universal technique. It does not introduce a sixteenth Critter elemental type, nor any change to the established weakness rules.

`requiredLevelGuide` is a power-curve suggestion, **not a global learnset assignment**. Critters' specific learn levels should be designed case-by-case by role, story placement, evolution, and balance. Do not force each species to learn every move of its type.

## Type coverage

- **Fire**: Cinder Tap, Embercoil, Kindle Heart, Ash Veil, Furnace Claw, Blazeline, Singe Mark, Coalguard, Scorch Lunge, Magma Whorl, Heat Haze, Pyre Talon, Flare Torrent, Wildfire Rhythm, Volcanic Rend, Sunforge Surge
- **Water**: Ripple Jab, Brook Dart, Tidal Calm, Mist Curtain, Current Lash, Foam Burst, Drench Mark, Reef Shell, Undertow Grip, Rainneedle, Floodplain, Breaker Fang, Tidewell, Riverstep, Abyss Break, Moonwell Deluge
- **Grass**: Leaf Nudge, Pollen Stitch, Green Vigor, Frond Screen, Briar Swipe, Clover Gust, Spore Tangle, Bark Shelter, Thornpath, Sunpetal, Verdant Field, Vine Scythe, Canopy Ray, Rootbound Tempo, Ironwood Crash, Elderbloom
- **Rock**: Pebble Knock, Quartz Ray, Stone Resolve, Grit Cloud, Crag Tackle, Shardbeam, Gravel Snare, Bedrock Brace, Flint Hammer, Geode Burst, Seismic Ridge, Obsidian Edge, Crystal Fault, Mountain Stance, Boulderfall, Continental Split
- **Electric**: Spark Nudge, Circuit Flicker, Coil Charge, Static Blur, Arc Talon, Voltstream, Nerve Jolt, Grounding Field, Ion Rush, Plasma Needle, Storm Net, Thunderhook, Skywire Flash, Surge Cycle, Overcurrent, Tempest Conduit
- **Ice**: Frost Nip, Snowmelt Ray, Cold Focus, Hail Screen, Rime Claw, Glacier Lance, Chillbind, Permafrost Skin, Sleet Slash, Prism Flurry, Whiteout, Icicle Rend, Frozen Arc, Winter Stillness, Avalanche Rush, Polar Crown
- **Flying**: Feather Jab, Gale Whisper, Updraft Poise, Dustwing, Wingline Cut, Zephyr Needle, Airlock Gust, Tailwind Shroud, Skyhook, Cloudpiercer, Crosswind, Raptor Dive, Cyclone Sweep, Aerial Rhythm, Stormtalon, Horizon Break
- **Shadow**: Shade Scratch, Dusk Thread, Quiet Resolve, Blindfold Mist, Umbral Talon, Gloam Dart, Dread Whisper, Nightmantle, Eclipse Slice, Blackglass Beam, Long Shadow, Nocturne Rend, Void Lantern, Cloakstep, Abyssal Hook, Midnight Bloom
- **Ghost**: Specter Tap, Wisp Murmur, Spirit Focus, Fading Curtain, Phantom Clasp, Ectoshard, Haunt Mark, Graveglass Ward, Veil Ripper, Moonlit Echo, Haunted Ground, Soulhook, Hollow Star, Afterimage Waltz, Grim Reprise, Beyondlight
- **Dragon**: Scale Knock, Wyrm Gleam, Ancient Bearing, Drake Glare, Fangwheel, Draconic Pulse, Dominion Cry, Scale Bastion, Clawstorm, Comet Breath, Elder Territory, Skybreaker, Primal Flare, Dragonstep, Crownshatter, Genesis Roar
- **Venom**: Toxin Pin, Mire Spray, Bitter Focus, Noxious Screen, Fang Drip, Venom Hiss, Septic Sting, Antidote Skin, Corrode Claw, Sporegas, Poison Marsh, Viper Rend, Miasma Lance, Viral Surge, Acidfall, Plague Bloom
- **Beast**: Paw Swat, Howl Burst, Pack Resolve, Predator Stare, Rending Pounce, Primal Yowl, Territory Mark, Hideguard, Razor Stampede, Hunter's Call, Wildground, Feral Tusk, Predator's Roar, Instinct Dance, Alpha Maul, Savage Dominion
- **Primordial**: Relic Jab, Origin Spark, Firstlight Focus, Ageveil, Epoch Knuckle, Ancient Glyph, Timemark, Amber Aegis, Rift Cleave, Genesis Beam, Cradle Realm, Monolith Crush, Origin Current, Aeon Rhythm, Timeworn Rupture, First Dawn
- **Psychic**: Mind Tap, Thought Needle, Calm Center, Blurred Senses, Psyche Push, Neuron Prism, Confound, Thoughtwall, Willbreaker, Astral Line, Dreamfield, Mindscythe, Starlit Idea, Clairvoyant Beat, Cerebral Crash, Infinite Focus
- **Fighting**: Training Jab, Spirit Thrust, Battle Breath, Feint Stare, Breaker Kick, Force Palm, Pressure Lock, Iron Guard, Spiral Elbow, Kinetic Wave, Challenge Ring, Comet Uppercut, Focused Impact, Second Wind, Final Roundhouse, Victory Burst
- **Typeless**: Opening Flick, Measured Blow, Roundhouse Sweep, Breakthrough, Last Stand, Quickstep, Steady Breath, Brace Up, Battle Sense, Tactical Swap, Field Rally, Cover Partner, Restore Spark, Second Breath, Taunting Cry, Watchful Eye, Echo Strike, Vibration Wave, Resonance Burst, Helping Signal, Clean Slate, Disrupt Pattern, Parting Shield, Fortune Step

## Effects

The effect objects are **future engine contracts**. Allowed current IDs in this dataset: `raise_stat`, `lower_stat`, `ailment`, `terrain`, `recoil`, `recharge`, `switch`, `team_buff`, `guard`, `heal`, `reveal`, `team_guard`, `cure_status`. Type-themed conditions include `scorch`, `drench`, `entangle`, `stagger`, `jolt`, `chill`, `disorient`, `dread`, `haunt`, `intimidate`, `poison`, `bleed`, `fracture`, `confuse`, `stagger`. Their exact durations, stacking rules, battle feedback, 1v1/2v2 behavior and status immunities must be formally implemented and tested before enabling them.

Suggested defaults for balancing (not committed gameplay rules): 4 total move slots per Critter, move PP reset via Critter Centers, learnsets including an early reliable action, and late moves with meaningful costs rather than strictly higher power.

## Species template and onboarding

Use `data/critter-learnset-template.json` as a **template**, not an actual Critter. For each uploaded Critter:

1. Record its **unique species ID**, name, type(s), art reference, and gameplay role.
2. Assign level-up moves by **move IDs**, using early/mid/late progression rather than copying an existing franchise learnset. A mixed-type Critter can learn compatible moves from both types and occasional Typeless moves.
3. Set explicit levels for each assignment; keep chronological ordering and allow revisions to balance.
4. Verify no duplicate level/move pairs, unknown move IDs, or types not present in the game.
5. Do not change party size, watch storage, strengths/weaknesses, or current battles without a separate implementation request.

Example: `"levelUp": [{"level": 1, "moveId": "opening-flick"}, {"level": 5, "moveId": "ripple-jab"}]`. Example only.

## Implementation handoff

When ready to activate the library: build a single move executor for player and opponent, validate effect IDs, implement PP/accuracy/effect timers, capture and AI interactions, and use the same targeting rules for 1v1 and team-turn 2v2. Add gradual save migration for existing placeholder moves. Avoid changes to battle design until that phase is explicitly approved.
