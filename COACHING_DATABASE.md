# Lorcana Deck Coaching Database

## Overview
The coaching system in this analyzer incorporates professional Lorcana TCG strategies from multiple competitive sources and world-class coaches. All recommendations are data-driven and based on tournament-winning approaches.

## Data Sources

### 1. **Antsy Labs - Advanced Strategies & Deck-Building Tips** ⭐
- **Focus**: Advanced competitive play, tempo management, card advantage
- **Key Insights**:
  - Tempo in Lorcana: Efficient resource usage relative to opponent
  - Card advantage: More playable options in hand = stronger position
  - Ink curve recommendations: 8-10 (1-2 cost), 10-12 (3-4), 8-10 (5-6), 2-4 (7+)
  - Keyword synergies: Evasive, Bodyguard, Shift mechanics
  - Meta adaptation: Identify common decks → Spot weaknesses → Reserve flex slots

### 2. **Frank Karsten (Ultimate Guard) - Beginner's Guide: 5 Tips** ⭐⭐
- **Focus**: Mulligan strategy, resource management, fundamental gameplay
- **Key Insights**:
  - Mulligan toward ink curve (1-2-3-4 progression)
  - Mulligan duplicate ink costs aggressively
  - Ink selection: Plan first 5-6 turns ahead
  - Quest vs Challenge: Only quest when ahead and/or safe
  - Card valuation: Removal, evasion, bodyguards overperform
  - Note: Willpower > Strength in importance

### 3. **Cardboard Champions - Intermediate Tips: How to Win** ⭐⭐⭐
- **Focus**: Tactical decision-making, game state evaluation, matchup strategy
- **Key Insights**:
  - **Who's the Beatdown?** - Fundamental question each turn:
    - Beatdown: Push to win fast (quest aggressively)
    - Control: Stabilize and grind (challenge defensively)
    - Position is FLUID - reassess every turn
  - Tempo plays: Bouncing/delaying threats buys time for answers
  - Stay on curve: Don't over-ink early just because you have resources
  - Play around removal: Know Ruby (Be Prepared, Dragon Fire) and Steel threats
  - Trade up: Always exchange lower-value for higher-value cards
  - Patience: Small advantages compound into huge leads

### 4. **JDRR - Metafy Set 10 Blurple Guide** ⭐⭐⭐⭐
- **Focus**: Current meta analysis, specific matchup breakdowns, mulligan patterns
- **Key Topics Covered**:
  - Tempo vs Control build variations
  - Sample mulligans with video breakdowns
  - Specific matchup strategies:
    - vs Purple Steel
    - vs Blue Purple (Mirror)
    - vs Amber Steel Aggro
    - vs Green Blue, Blue Steel, Green Yellow, Red Purple, Green Purple
  - FAQ: One-drop count optimization, card selection rationale
  - Note: 9.5/10 rating from 20+ coaches, 2090+ purchases

---

## Coaching System Architecture

### Playstyle Frameworks

#### **AGGRO BUILDS** (Win Turn 5-6)
```
Goal:        Early board pressure → Finish before stabilization
Mulligan:    Hard search for 1-2 drop curve, accept weak late game
Curve:       12-15 one-drops, 10-12 two-drops, 8-10 three-drops, 3-4 finishers
Removal:     Efficient 2-3 cost removal + burn/direct damage
Tactics:     Quest aggressively, maintain 1+ creature advantage
```

#### **MIDRANGE BUILDS** (Win Turn 6-7)
```
Goal:        Efficient threats + flexible answers → Control value game
Mulligan:    Balance threats and answers, aim for smooth curve
Curve:       6-8 one-drops, 8-10 two-drops, 10-12 three-cost, 8-10 four-cost, 4-6 five-plus
Removal:     4-6 removal spells + flexible answers
Tactics:     Make favorable trades (1-cost for 2-cost), build toward finishers
```

#### **CONTROL BUILDS** (Win Turn 8+)
```
Goal:        Survival → Board stabilization → Overwhelm with finishers
Mulligan:    Search for removal + card draw, accept weak early game
Curve:       2-4 one-drops, 4-6 two-drops, 8-10 three-cost, 8-10 four-cost, 6-8 five-plus
Removal:     8-10 removal spells + board wipes + sweepers
Tactics:     Challenge defensively, buy time for answers, deploy finishers when safe
```

---

## Critical Decision Framework

### "Who's the Beatdown?" - The Fundamental Question

**Every turn, ask**: Am I winning fast or grinding long?

| Scenario | Role | Action |
|----------|------|--------|
| Opponent has more creatures | Beatdown | Quest aggressively, finish before they stabilize |
| You have more creatures | Control | Challenge defensively, buy time for your plan |
| Even board state | Context-dependent | Check hand strength: If you have threats → beatdown; If you have answers → control |
| Opponent at 15+ lore | Beatdown | Finish asap unless your board shows you'll lose in 2 turns |

---

## Mulligan Decision Tree

```
START: Look at opening hand

1. Count ink costs: 1-drop, 2-drop, 3-drop, etc?
   YES → Keep it, build around existing curve pieces
   NO → MULLIGAN: Bottom duplicates, search for missing pieces

2. How many non-inkable cards?
   >2 copies → Bottom excess non-inkables
   1-2 copies → Okay if powerful
   3+ copies → Mulligan hard (consistency risk)

3. Do I have any 1-drops AND 2-drops?
   YES → Build perfect curve, bottom everything else
   NO → Mulligan for these (turns 1-2 are critical)

4. Deck-specific synergies?
   YES → Mulligan toward synergy pieces if deck revolves around them
   NO → Mulligan toward curve

RESULT: Execute mulligan to find best curve possible
```

---

## Ink Selection Strategy

### First 5-6 Turns (Always Ink)
- **Turn 1-5**: Add to inkwell every turn to curve out properly
- **Select**: Worst card you won't play OR excess cards you have duplicates of
- **Goal**: Have 1, 2, 3, 4, 5, 6 ink available when needed

### Turn 6+ (Evaluate)
- **Continue inking** if: You have expensive finishers (6-7 cost) you want to play
- **Stop inking** if: You've hit natural mana cap for your deck (usually 5-6 ink)
- **Hold cards** in hand to play around removal

### Example
```
Hand: 1-drop, 2-drop, two 4-drops, one 5-drop
Turn 1: Ink the WORST 4-drop (you won't play two 4-drops)
Goal: Turn 5 you can play the 5-drop cleanly
```

---

## Deck Construction Checklist

- ✅ **60 cards exactly** (required for constructed)
- ✅ **Max 4 copies per card** (unless special rules)
- ✅ **2 colors maximum** (competitive format)
- ✅ **8-10 one-drops** (early pressure/board presence)
- ✅ **40-50% ink-eligible cards** (consistency)
- ✅ **Balanced curve** (playable options turns 1-7+)
- ✅ **3-6 removal spells** (answer threats)
- ✅ **2-4 card draw effects** (consistency/draw)
- ✅ **Clear win condition** (know how you win)

---

## Common Mistakes (AVOID THESE!)

1. ❌ **Playing ink candidates early** when you should save them for curve
2. ❌ **Questing when behind in tempo** (should be challenging instead)
3. ❌ **Overcommitting creatures** before you know removal is coming
4. ❌ **Keeping too many singletons** (dilutes consistency)
5. ❌ **Not counting opponent's lore** (always track race)
6. ❌ **Forgetting "Who is the beatdown?"** (most critical question)
7. ❌ **Mulliganing too conservatively** (aim for curve, not perfection)
8. ❌ **Inking cards you might need** (plan ahead!)
9. ❌ **Not playing around known removal** (Ruby: Be Prepared, Dragon Fire)
10. ❌ **Wasting removal on small creatures** (save for finishers)

---

## Card Valuation

### ⭐⭐⭐ Overperformers (Include These!)
- **One-drops** - Early pressure matters
- **Removal spells** - Tempo + card advantage
- **Evasive creatures** - Force removal or favorable blocks
- **Cheap card draw** - Consistency wins games
- **Bodyguards** - Protect your key threats

### ❌ Often Overrated
- **High-cost creatures** (6+ cost) without clear synergy
- **Situational cards** (only work in specific scenarios)
- **Singleton copies** of mediocre cards (worse consistency)
- **Uninkable non-essentials** (takes deck slots)

---

## Matchup Strategy Framework

### vs Aggro Decks
- **Priority**: Survival → Board Control → Reach 20 Lore
- **Tactics**: Challenge everything, remove threats immediately, stabilize health
- **Win condition**: Out-value their threats with efficient removal

### vs Midrange Decks
- **Priority**: Tempo → Favorable Trades → Out-value them
- **Tactics**: Trade up (your 1 for their 2), keep hand full, pressure lore
- **Win condition**: Accumulate small advantages into large leads

### vs Control Decks
- **Priority**: Consistency → Board Presence → Overwhelm Answers
- **Tactics**: Hold cards in hand, bait removal, deploy finishers when answers gone
- **Win condition**: Have 1-2 finishers when they're out of removal

---

## Tournament Preparation

### Before Event
- [ ] Playtest 20+ games with your deck
- [ ] Research top decks in your meta
- [ ] Prepare sideboard (8-15 flex cards)
- [ ] Know your deck inside/out

### During Event
- [ ] Play at consistent pace (don't rush or stall)
- [ ] Take notes on what beat you
- [ ] Don't tilt after losses
- [ ] Ask yourself "Who is the beatdown?" every turn

### After Event
- [ ] Review notes on losses
- [ ] Identify weak matchups
- [ ] Adjust deck for next event
- [ ] Watch pro player VODs for decision-making

---

## Advanced Concepts

### Tempo Definition
"How efficiently you're using resources and turns relative to your opponent"
- **Building tempo**: Summoning cost-effective characters with immediate impact
- **Snowballing tempo**: Maintaining 1+ creature advantage at all times
- **Breaking tempo**: Forcing opponent into reactive (non-attacking) mode

### Card Advantage Definition
"How many playable options you have in hand relative to opponent"
- **Gaining advantage**: Drawing 2 while opponent draws 0
- **Using advantage**: Playing 2-3 threats while they have 1 answer
- **Losing advantage**: Playing too fast without replacing cards

### Combining Tempo + Card Advantage = Lethal
"When you have more creatures on board AND more cards in hand, you control the entire game"

---

## Coaching System Features

### Automatic Analysis
- Detects deck composition issues (too many singletons, wrong curve)
- Identifies weak cards for removal
- Suggests specific card names to add/remove
- Provides ink consistency checks

### Playstyle-Specific Guidance
- Different mulligan patterns for Aggro/Control/Midrange
- Archetype-specific card recommendations
- Matchup-specific tactics

### Competitive Integration
- Draws from 4+ professional coaches
- Incorporates tournament-winning strategies
- Includes meta-game considerations
- Updates with new set releases

---

## Resources for Further Learning

1. **Antsy Labs** - Advanced deck-building strategies
2. **Ultimate Guard** - Frank Karsten's fundamental tips
3. **Cardboard Champions** - Intermediate tactical play
4. **Metafy** - Current meta analysis & specific matchups
5. **LorcanaJSON** - Card database & data resources
6. **Official Disney Lorcana** - Rule clarifications & how-to-play

---

## Version History

- **v1.0** - Initial coaching database with Antsy Labs + Frank Karsten + Cardboard Champions strategies
- **v2.0** - Added Metafy analysis + JDRR competitive framework
- **v3.0** - Enhanced with playstyle-specific coaching, decision frameworks, tournament prep

---

**Last Updated**: February 4, 2026
**Total Coaching Data Points**: 50+ distinct strategic principles
**Sources**: 4 professional coaches + competitive community
