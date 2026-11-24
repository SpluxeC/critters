# Critters battle sprite handoff

This PR uploads the finished sprite files only. It does not put new Critters into encounters or change any live gameplay. The live roster was checked against main at `f64554f697e1fa256185b272c5369d7de0c5816a`. The assets below have no confirmed mapping to current species IDs. They must not be assigned by similar name or type alone.

| Design | Art location | Confirmed design notes |
|---|---|---|
| Bloomtail | `assets/critters/pending-battle/bloomtail-{front,back}.png` | Grass/Electric leaf snail |
| Foamlark | `assets/critters/pending-battle/foamlark-{front,back}.png` | Water/Psychic floating jellyfish |
| Granipup | `assets/critters/pending-battle/granipup-{front,back}.png` | Rock/Steel painted-dog pup |
| Luminix | `assets/critters/pending-battle/luminix-{front,back}.png` | Electric firefly |
| Reeflet | `assets/critters/pending-battle/reeflet-{front,back}.png` | Pure Grass leaf katydid; do not restore old Water/Grass typing |
| Fire bat Stage 1 (unnamed) | `assets/critters/pending-battle/fire-bat-stage-1-{front,back}.png` | Hornless pure Fire; only Stage 2 gains Flying; no Stage 2 sprites here |
| Jewel Beetle (three stages) | `assets/critters/route-one-designs/route-1/beetle-stage-{1,2,3}-front.png` | Matching backs are already under `assets/critters/battle-backs/route-1/`; keep separate from the firefly and Venom moth |

For the live step: coordinate exact existing stable species IDs or an approved roster change, set only matching front/back art fields for existing species, and verify both sides in battle. Preserve player sprites, saves, current encounters and progression. Do not repurpose a slot or invent evolution links. No existing PNG, registry file, or code was changed by this PR.
