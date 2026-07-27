# 🏆 Competitive Meta Integration

## Overview
Inkweaver now includes **real-time competitive meta data** from TCGPlayer tournament results! The coaching system now provides up-to-date deck recommendations and strategies based on actual tournament performance.

## Rotation Update (Jul 25, 2026)

- Core Constructed legality has been updated to include set 13 (sets 5-13).
- Infinity remains the full released-set card pool, subject to active ban list constraints.
- Card and rulings data were refreshed from the upstream card database and propagated to local derived files.

## Data Source
**DLC Circuit Results (Richmond + February Winterspell events)**
- Top-cut meta breakdowns
- Winning deck strategies
- Card choices and tech decisions
- Matchup and trend information

## What's New

### 1. Format-Specific Meta Guidance
The AI coaching now shows you the current competitive landscape for your chosen format:

#### **Infinity & Core Constructed**
- **Top 3 Tier Decks** with win rates and key cards
- **Current meta breakdown** (Emerald Sapphire, Amber Emerald Dogs, Amethyst Steel/Sapphire)
- **Meta tips** based on tournament results
- **Deck positioning** - see how your deck compares to the meta

#### **Sealed/Chaos**
- **Priority system** for limited play (1. Removal, 2. Curve, 3. Bombs, 4. Card Advantage, 5. Synergies)
- **Optimal deck size** recommendations (40-42 cards ideal)
- **Color strategy** guidance (play 4-5 colors if needed)
- **Common mistakes** to avoid

### 2. Intelligent Deck Comparison
When comparing two decks, the system now:
- Identifies meta tier for each deck (S-tier, A-tier, B-tier, Off-Meta)
- Shows which meta archetype each deck matches
- Provides matchup-specific advice based on competitive play patterns

### 3. Current Meta Snapshot (as of Feb 28, 2026)

**🥇 S-Tier:**
- **Emerald/Sapphire Control** - Deck to beat, ~26% of top cut
  - Key Cards: Tipo, Sail the Azurite Sea, Clarabelle, Basil, Prince Phillip
  - Strategy: Ink acceleration → card draw → haymakers

**🥈 A-Tier:**
- **Ruby/Steel Winterspell Tempo** - ~18% of top cut, strong tempo conversion in Winterspell events
   - Key Cards: Darkwing Duck - Dashing Gadgeteer, Launchpad - Trusty Sidekick, Winterspell
   - Strategy: Efficient curve pressure + flexible interaction

- **Amber/Emerald Dogs** - ~14% of top cut, still strong vs slower Sapphire starts
  - Key Cards: Lady/Tramp variants, Bobby Zimuruski
  - Strategy: Flood board, pressure early, fuel Tramp - Street-Smart Dog

- **Amethyst/Sapphire** - ~16% of top cut, ink acceleration
  - Key Cards: Demona, Hades, Into the Unknown, Basil
  - Strategy: Accelerate to deploy threats early, beat Steel

- **Amethyst/Steel** - ~13% of top cut, still reliable into aggro
  - Key Cards: Calhoun, Captain Hook, Strength of a Raging Fire
  - Strategy: Curve 1-2-3-4, stabilize, grind value

**🥉 B-Tier:**
- **Sapphire/Steel Control** - ~10%, solid into creature-heavy tables
- **Amethyst/Emerald Hyper-Aggro** - ~8%, budget option with fast openers

## How It Works

### Data File: `src/data/competitiveMeta.json`
```json
{
  "formats": {
    "infinity": { "topDecks": [...], "playTips": [...] },
    "coreConstructed": { "topDecks": [...] },
    "sealed": { "strategy": {...}, "playTips": [...] }
  },
  "universalTips": {
    "mulligan": [...],
    "gameplay": [...],
    "deckBuilding": [...]
  }
}
```

### Integration Points in `App.jsx`

1. **Import** (Line ~7):
   ```jsx
   import competitiveMeta from "./data/competitiveMeta.json";
   ```

2. **Meta Guidance Section** (After format selection ~line 650):
   - Shows top 3 decks for Infinity/Core
   - Shows sealed strategy priorities for Sealed/Chaos
   - Includes format-specific play tips

3. **Deck Positioning** (Before curve breakdown ~line 1000):
   - Matches user's deck colors to meta archetypes
   - Shows tier, strengths, weaknesses, mulligan guide
   - Identifies off-meta brews

4. **Comparison Meta Context** (In comparison mode ~line 540):
   - `getDeckMetaTier()` function checks colors against meta decks
   - Returns tier (S/A/B/Off-Meta) and archetype information
   - Updates matchup analysis with meta positioning

## Key Features

### ✅ Always Current
Meta data is timestamped and sourced from recent tournaments

### ✅ Format-Aware
Different advice for Infinity, Core Constructed, and Sealed/Chaos

### ✅ Actionable Insights
- Specific card recommendations from winning decks
- Mulligan guides based on meta archetypes
- Matchup-specific strategies

### ✅ Beginner-Friendly
Explains WHY certain decks are strong and HOW to play against them

## Updating the Meta

To update with new tournament data:

1. **Fetch latest results** from TCGPlayer, Dreamborn.ink, or official Lorcana events
2. **Edit** `src/data/competitiveMeta.json`
3. **Update**:
   - `lastUpdated`: Current date
   - `source`: Tournament name/location
   - `topDecks`: Add/remove/reorder based on performance
   - `playTips`: Adjust for new strategies

No code changes needed - the coaching system reads directly from the JSON!

## Example Output

```
🏆 Current Competitive Meta:
─────────────────────────────────────────────────────
Based on recent DLC Richmond tournament results:

🥇 1. Emerald/Sapphire Control (Emerald/Sapphire)
   Tournament-winning deck. Accelerates ink then slams haymakers.
   Key Cards: Tipo - Growing Son, Sail the Azurite Sea, Clarabelle - Light on Her Hooves

🥈 2. Amber/Emerald Dogs (Amber/Emerald)
   Fast aggressive deck with high skill ceiling. Floods board early.
   Key Cards: Lady - Decisive Dog, Tramp - Enterprising Dog, Tramp - Street-Smart Dog

💡 Meta Tips:
   • The format is dominated by Amethyst shells - pack answers for them
   • Ink acceleration (Sapphire) or fast aggro (Emerald) are the two viable strategies
   • Emerald Sapphire is the deck to beat - have a plan for it

🎯 META POSITIONING:
Your Emerald/Sapphire deck matches the S-tier "Emerald/Sapphire Control" archetype!
Strategy: Accelerate ink with Tipo/Sail, draw cards with Clarabelle, control board with removal
Strengths: Card advantage, Late game power, Flexible answers
Weaknesses: Vulnerable early game, Loses to fast aggro, Hand disruption hurts
Mulligan Guide: Keep Tipo, Sail the Azurite Sea, or Donald Duck - Perfect Gentleman
```

## Benefits

### For Players:
- Know what decks you'll face at tournaments
- Understand why certain decks are strong
- Get matchup-specific advice
- Learn from actual winning strategies

### For Deck Builders:
- See if your brew matches a meta archetype
- Identify gaps in your strategy vs top decks
- Learn key cards from successful tournament runs
- Adapt sealed strategies from competitive limited play

---

**Last Updated:** February 28, 2026  
**Data Source:** DLC Circuit Results (Richmond + February Winterspell events)  
**Next Update:** After the next major DLC result set or post-Winterspell meta shift
