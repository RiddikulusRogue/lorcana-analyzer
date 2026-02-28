# 🎨 Playstyles & Cross-TCG Comparison System

## Overview
The Lorekeeper now provides comprehensive playstyle analysis for your Lorcana deck, including how it compares to similar strategies in other trading card games (Magic, Yu-Gi-Oh!, Pokémon TCG, etc.).

## Data Source: `src/data/playstyles.json`

The playstyles database contains:
1. **Lorcana Playstyles** - 7 core strategies with Lorcana examples
2. **Cross-TCG Comparisons** - How each playstyle appears in other major TCGs
3. **Universal Framework** - Why these archetypes exist in all TCGs
4. **Glossary** - Common TCG terminology

---

## Lorcana Playstyles

### ⚡ Ink Acceleration / Ramp
**Win Condition:** Overpower opponents with superior resources  
**Core Mechanic:** Accelerate ink early, deploy powerful threats

**Lorcana Example:** Emerald/Sapphire Control
- Key Cards: Tipo, Sail the Azurite Sea, Clarabelle, Prince Phillip
- Turn 1-2: Build ink with accelerators
- Turn 3+: Deploy finishers and answers
- Strengths: Card advantage, late game power
- Weaknesses: Vulnerable early, loses to fast aggro

**Cross-TCG Equivalents:**
- 🃏 Magic: Green Ramp (Llanowar Elves, Cultivate, big threats)
- 🎮 Yu-Gi-Oh!: Blue-Eyes (acceleration → fusions → big monsters)
- 🎮 Yu-Gi-Oh!: Synchron decks (Tuner synchronization)
- ⚡ Pokémon: Malamar (ability-based energy acceleration)

**Why it works everywhere:** Resource acceleration is the most powerful strategy in TCGs - if you can cheat the cost curve, you win.

---

### ⚔️ Aggro / Fast Attack
**Win Condition:** Deal 20 damage before opponent stabilizes  
**Core Mechanic:** Flood board with low-cost characters, output early lore damage

**Lorcana Examples:**
- **Amber/Emerald Dogs:** Lady, Tramp variants, Under the Sea
  - Playstyle: Flood board with synergistic cheap creatures
  - Skill Level: Medium-High (tight decision-making)

- **Amethyst/Emerald Hyper-Aggro:** 28 one-cost creatures + Enigmatic Inkcaster
  - Playstyle: Output maximum lore per turn with consistent curve
  - Skill Level: Low-Medium (straightforward strategy)

**Cross-TCG Equivalents:**
- 🃏 Magic: Red Aggro (Goblin Guide, Lightning Bolt)
- 🃏 Magic: White Weenie (cheap aggressive creatures)
- 🎮 Yu-Gi-Oh!: Infernoid (burn + aggression)
- 🎮 Yu-Gi-Oh!: Red-Eyes (aggressive creature focus)
- ⚡ Pokémon: Pikachu VMAX, Regigigas (cheap snowball creatures)

**Why it works everywhere:** The earliest advantage is often an insurmountable lead.

---

### ⚖️ Midrange / Balanced
**Win Condition:** Use superior value and board control to grind out wins  
**Core Mechanic:** Play efficient creatures at every cost, accumulate value

**Lorcana Examples:**
- **Amethyst/Steel:** Calhoun, Captain Hook, Strength of a Raging Fire
  - Curve 1-2-3-4 efficiently
  - Generate card advantage through board trades
  - Perfect against aggro, loses to ink acceleration

- **Amber/Amethyst Lantern:** Lantern + removal suite
  - Flexible toolbox with Mowgli as catchall answer
  - Balances ramp (Lantern) with removal (Amber tools)
  - Underexplored playstyle

**Cross-TCG Equivalents:**
- 🃏 Magic: Jund (efficient creatures + flexible removal)
- 🃏 Magic: GX Midrange (Tarmogoyf, midgame threats)
- 🎮 Yu-Gi-Oh!: Swordsoul (balanced creatures + synergy)
- 🎮 Yu-Gi-Oh!: Tearlaments (removal while advancing board)
- ⚡ Pokémon: Lugia VSTAR (balanced approach), Raichu (mid-curve beats)

**Why it works everywhere:** The natural evolution - balanced decks beat extreme strategies.

---

### ⏰ Tempo / Disruption
**Win Condition:** Keep opponent off-balance while you attack  
**Core Mechanic:** Use challenges, hand disruption, and tempo creatures

**Lorcana Example:** Steel/Sapphire Tempo
- Cheap creatures they can't challenge
- Basil for hand disruption
- Into the Unknown for tempo removal
- Strengths: Forces bad trades, controls pace
- Weaknesses: Dies to evasive threats

**Cross-TCG Equivalents:**
- 🃏 Magic: Blue Tempo (Murktide, evasive creatures)
- 🃏 Magic: Delver (cheap disruption + pressure)
- 🎮 Yu-Gi-Oh!: Dark World (hand disruption via Grapha)
- 🎮 Yu-Gi-Oh!: Tearlaments (disruption while advancing)
- ⚡ Pokémon: Dialga VSTAR (disruption + control)

**Why it works everywhere:** Timing advantage is as valuable as card advantage.

---

### 🛡️ Control / Lockdown
**Win Condition:** Survive until endgame, then deploy unbeatable threats  
**Core Mechanic:** Heavy removal/disruption, then win with high-impact cards

**Lorcana Example:** Emerald/Sapphire with Control Shell
- Prince Phillip (big board wipes)
- Malicious, Mean and Scary + Basil (targeted removal + hand disruption)
- Clarabelle (card advantage)
- Strengths: Answers everything, late game power
- Weaknesses: Dies to early aggro, hand disruption hurts

**Cross-TCG Equivalents:**
- 🃏 Magic: UW Control (Counterspell, Wrath of God)
- 🃏 Magic: Blue-based control (permanent answers)
- 🎮 Yu-Gi-Oh!: Paleozoic Dinosaur (floodgate control)
- 🎮 Yu-Gi-Oh!: Skill Drain control (lock strategies)
- ⚡ Pokémon: Turbo Pikachu with disruption

**Why it works everywhere:** If you can answer everything, eventually you win.

---

### 📚 Card Advantage / Value
**Win Condition:** Outresource opponent until they run out of answers  
**Core Mechanic:** Play creatures that replace themselves or generate cards

**Lorcana Example:** Clarabelle Value Decks
- Build ink → Play Clarabelle → Draw 4+ cards
- Use extra cards for more threats/removal
- Creates inevitability through resources
- Strengths: Overwhelming card advantage
- Weaknesses: Dies before Clarabelle, hand disruption hurts

**Cross-TCG Equivalents:**
- 🃏 Magic: Esper Control with draw (card advantage engines)
- 🃏 Magic: Mulldrifter builds (creatures that replace themselves)
- 🎮 Yu-Gi-Oh!: Pot of Prosperity (draw advantage)
- 🎮 Yu-Gi-Oh!: Spright (generates tokens + draw power)
- ⚡ Pokémon: Draw-heavy decks (Miltank, Junk Hunt), VSTAR decks

**Why it works everywhere:** More options = better decisions.

---

### 🔗 Combo / Synergy
**Win Condition:** Execute key synergy combinations for overwhelming value  
**Core Mechanic:** Cards work together for multiplicative rather than additive value

**Lorcana Examples:**
- **Enigmatic Inkcaster Combo:** 28 one-costs trigger Inkcaster twice = free lore generation
  - Amethyst Chromicon refills hand
  - Creates multiplying lore advantage

- **Tramp Dog Synergies:** Tramp - Street-Smart Dog fueled by other dogs
  - Yzma/Bobby discard outlets smooth draws
  - Creatures do double duty (aggro + fuel)

**Cross-TCG Equivalents:**
- 🃏 Magic: Storm (multiple spells = big effect)
- 🃏 Magic: Combo decks (Jeskai Murktide, Living End)
- 🎮 Yu-Gi-Oh!: Synchron (Tuners + non-Tuners)
- 🎮 Yu-Gi-Oh!: Spright (small creatures = big effects)
- 🎮 Yu-Gi-Oh!: Tearlaments (mill synergies)
- ⚡ Pokémon: Lost Box (setup/synergy)

**Why it works everywhere:** Finding the right combination of cards creates unbeatable board states.

---

## How Playstyles Appear in Coaching

### 1. Automatic Playstyle Detection
The coaching system analyzes your deck to determine its primary playstyle:
- **Average cost** - High? Likely acceleration. Low? Likely aggro.
- **Removal count** - Lots of removal? Control. Few? Aggro/Combo.
- **Color combination** - Sapphire/Emerald usually accelerates, Amber/Emerald usually attacks

### 2. Playstyle Breakdown Section
```
🎓 PLAYSTYLE BREAKDOWN:
Your deck appears to be: ⚡ Ink Acceleration / Ramp
Description: [Full strategy explanation]
Core Mechanic: [How this strategy wins]

🔀 Cross-TCG Equivalents (If you play other TCGs):
  🃏 Magic: The Gathering → Green Ramp decks
  🎮 Yu-Gi-Oh! → Blue-Eyes + Synchron combos
  ⚡ Pokémon TCG → Malamar energy acceleration
  💡 In all TCGs: Uses resource acceleration to cheat threats into play
```

### 3. Playstyle-Specific Tips
At the end of coaching, see strategic tips specific to your playstyle:
```
💡 PLAYSTYLE-SPECIFIC TIPS (Ink Acceleration / Ramp):
   • Prioritize ink accelerators early - they enable everything
   • Have a payoff card in mind before accelerating
   • Keep cheap blockers to survive initial aggression
   • Hold disruption for their payoff turn
```

---

## Universal Archetype Framework

All trading card games use the same 6 core archetypes:

| Archetype | Win Condition | MTG Example | Yu-Gi-Oh Example | Pokémon Example | Lorcana Example |
|-----------|---------------|-----|-----|-----|-----|
| **Aggro** | Fast damage | Red Deck Wins | Infernoid | Pikachu | Amber/Emerald Dogs |
| **Control** | Survive & win late | UW Control | Skill Drain | Dialga | Emerald/Sapphire Control |
| **Midrange** | Superior value | Jund | Swordsoul | Lugia VSTAR | Amethyst/Steel |
| **Tempo** | Pace control | Blue Murktide | Dark World | Dialga Disruption | Sapphire/Steel Tempo |
| **Ramp** | Accelerate → Apply Pressure | Green Ramp | Blue-Eyes | Malamar | Emerald/Sapphire Ramp |
| **Combo** | Synergistic Explosion | Storm | Spright | Lost Box | Enigmatic Inkcaster |

**Key Insight:** The strategies are the same across games. Only the mechanics change.

---

## Using This for Transition Players

### Coming from Magic: The Gathering?
- Green Ramp → Emerald/Sapphire Acceleration
- Red Aggro → Amber/Emerald Dogs
- UW Control → Emerald/Sapphire Control
- Blue Tempo → Sapphire/Steel Tempo
- **Key Difference:** No instant-speed spells (no counterspells or instants)

### Coming from Yu-Gi-Oh!?
- Blue-Eyes → Emerald/Sapphire (acceleration + big threats)
- Dark World → Sapphire/Amethyst (hand disruption)
- Swordsoul → Amethyst/Steel (balanced midrange)
- Spright → Enigmatic Inkcaster (synergistic explosion)
- **Key Difference:** Much simpler resource system (ink, not multiple summon types)

### Coming from Pokémon TCG?
- Malamar → Emerald/Sapphire (energy acceleration)
- Pikachu Aggro → Amber/Emerald Dogs (fast pressure)
- Lugia Setup → Amethyst/Steel (balanced midrange)
- Lost Box → Enigmatic Inkcaster Combos
- **Key Difference:** No evolving stage system; all creatures different sizes

---

## Playstyle Glossary

- **Acceleration:** Speeding up resource generation (mana/ink/energy) beyond normal rate
- **Synergy:** Cards that work together for more value than individual cards
- **Tempo:** Controlling the game by being ahead on resource efficiency/board state  
- **Value:** Generating more resources/advantage than opponent per card
- **Pressure:** Forcing opponent to deal with your board state
- **Stabilize:** Returning to a safe board state after being behind
- **Overextend:** Playing more creatures than necessary, vulnerable to mass removal
- **Grinding:** Winning through small advantages accumulated over many turns
- **Haymaker:** A large threat that takes over the game single-handedly
- **Evasion:** Creatures that can't be blocked by certain types of creatures

---

## Integration in Coaching

When you consult The Lorekeeper:
1. **Format recommendation** shows top meta decks and their playstyles
2. **Deck analysis** determines your playstyle automatically
3. **Playstyle breakdown** explains your strategy and TCG equivalents
4. **Strategy tips** give specific guidance for your playstyle
5. **Mulligan guide** reflects your playstyle
6. **Turn-by-turn gameplan** follows your playstyle's curve

---

## Updating Playstyles

To add new playstyles or update cross-TCG comparisons:

1. Edit `src/data/playstyles.json`
2. Add under `lorcanaPlaystyles` object:
   ```json
   "newPlaystyle": {
     "name": "Playstyle Name",
     "emoji": "🎯",
     "description": "...",
     "coreMechanic": "...",
     "lorcanaExamples": [...],
     "tips": [...],
     "crossTCGComparison": {...}
   }
   ```
3. No code changes needed - coaching reads from JSON!

---

## Example Output

```
🎓 PLAYSTYLE BREAKDOWN:
Your deck appears to be: ⚡ Ink Acceleration / Ramp
Description: Accelerate ink early (turns 1-2) to deploy powerful threats ahead of schedule. Win condition: overpower opponents with superior card advantage and bigger threats.
Core Mechanic: Use Sapphire/Emerald cards to add extra ink, then deploy expensive finishers early

🔀 Cross-TCG Equivalents (If you play other TCGs):
  🃏 Magic: The Gathering → Green Ramp / Mana Acceleration (Black Lotus, Llanowar Elves, Cultivate)
  🎮 Yu-Gi-Oh! → Blue-Eyes Engine (card draw + fusion for big monsters), Synchron decks (Synchro Summoning)
  ⚡ Pokémon → Malamar (ability-based acceleration), Arcanine (energy acceleration)
  💡 In all TCGs: Uses resource acceleration (ink/mana/energy) to cheat big threats into play faster than normal curve

💡 PLAYSTYLE-SPECIFIC TIPS (Ink Acceleration / Ramp):
   • Prioritize ink accelerators early - they enable everything
   • Have a payoff card in mind before accelerating (draw, removal, threat)
   • Keep cheap blockers to survive initial aggression
   • Hold disruption for their payoff turn
```

---

**Last Updated:** February 9, 2026  
**Coverage:** 7 Lorcana playstyles, 3+ TCG comparisons each, Universal framework
