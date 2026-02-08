import strategyGuides from "../data/strategyGuides.json";
import cardMeta from "../data/cardMeta.json";

export function generateCoaching(analysis, playStyle) {
  if (!analysis) {
    return 'No analysis provided; run analyzer first.';
  }

  const avgCost = parseFloat(analysis.avgCost) || 4;
  const cardCount = analysis.total || 0;
  const colorCount = Object.keys(analysis.inkColors || {}).length;
  const songs = analysis.songCount || 0;
  const cards = analysis.cards || {};
  
  let coaching = `=== DECK COACHING REPORT ===\n`;
  coaching += `Playstyle: ${playStyle.toUpperCase()}\n\n`;
  
  // Deck Composition Check
  coaching += `📊 DECK COMPOSITION\n`;
  coaching += `Total Cards: ${cardCount}/60 ${cardCount !== 60 ? '⚠️ Must be exactly 60!' : '✓'}\n`;
  coaching += `Unique Cards: ${analysis.uniqueCount}\n`;
  coaching += `Average Cost: ${avgCost.toFixed(2)}\n`;
  coaching += `Ink Colors: ${colorCount}\n`;
  coaching += `Songs: ${songs}\n\n`;
  
  // Playstyle-Specific Suggestions
  coaching += `🎯 PLAYSTYLE OPTIMIZATION (${playStyle.toUpperCase()})\n`;
  const aggGuide = strategyGuides.playstyleGuides.aggro;
  const controlGuide = strategyGuides.playstyleGuides.control;
  const midGuide = strategyGuides.playstyleGuides.midrange;
  
  if (playStyle === 'aggro' || playStyle === 'balanced') {
    if (avgCost > 4) {
      coaching += `• Avg cost is high (${avgCost.toFixed(2)}) - ${aggGuide.curveAdjustment}\n`;
      coaching += `  → Swap: High-cost cards → 2-cost creatures for early pressure\n`;
    }
    if (cardCount < 60) {
      coaching += `• Need ${60 - cardCount} more cards - fill with efficient low-cost creatures\n`;
    }
    coaching += `• ${aggGuide.goal} ${aggGuide.strategy}\n`;
    coaching += `• Mulligan: ${aggGuide.mulligan}\n\n`;
  }
  if (playStyle === 'control' || playStyle === 'balanced') {
    if (avgCost < 4) {
      coaching += `• Avg cost is low (${avgCost.toFixed(2)}) - ${controlGuide.curveAdjustment}\n`;
      coaching += `  → Swap: Low-cost creatures → Board wipes or high-impact threats\n`;
    }
    coaching += `• ${controlGuide.goal} ${controlGuide.strategy}\n`;
    coaching += `• Mulligan: ${controlGuide.mulligan}\n\n`;
  }
  if (playStyle === 'midrange' || playStyle === 'balanced') {
    if (avgCost >= 4 && avgCost <= 4.5) {
      coaching += `• Avg cost is balanced (${avgCost.toFixed(2)}) - perfect for midrange\n`;
    } else if (avgCost < 4) {
      coaching += `• Avg cost is low (${avgCost.toFixed(2)}) - ${midGuide.curveAdjustment}\n`;
    } else {
      coaching += `• Avg cost is high (${avgCost.toFixed(2)}) - ${midGuide.curveAdjustment}\n`;
    }
    coaching += `• ${midGuide.goal} ${midGuide.strategy}\n`;
    coaching += `• Mulligan: ${midGuide.mulligan}\n\n`;
  }
  
  // TAILORED MULLIGAN ENGINE (Based on actual deck cards)
  coaching += `⏱️ MULLIGAN STRATEGY & TURN-BY-TURN GUIDE\n`;
  
  // Build data about cards in the actual deck
  const deckCards = analysis.cards || {};
  const cardsByType = { creatures: [], spells: [], items: [], songs: [] };
  const cardsByCost = {};
  
  // Classify and organize actual deck cards
  Object.entries(deckCards).forEach(([cardName, count]) => {
    const cardKey = cardName.toLowerCase();
    const cardInfo = cardMeta[cardKey];
    if (cardInfo) {
      const cost = cardInfo.cost || 0;
      if (!cardsByCost[cost]) cardsByCost[cost] = [];
      cardsByCost[cost].push({ name: cardName, count, info: cardInfo });
      
      if (cardInfo.type) {
        const typeStr = cardInfo.type.toLowerCase();
        if (typeStr.includes('song')) cardsByType.songs.push({ name: cardName, count });
        else if (typeStr.includes('spell')) cardsByType.spells.push({ name: cardName, count });
        else if (typeStr.includes('item')) cardsByType.items.push({ name: cardName, count });
        else cardsByType.creatures.push({ name: cardName, count });
      } else {
        cardsByType.creatures.push({ name: cardName, count });
      }
    }
  });
  
  // Get curve information
  const costOne = cardsByCost[1] || [];
  const costTwo = cardsByCost[2] || [];
  const costThreeFour = (cardsByCost[3] || []).concat(cardsByCost[4] || []);
  const costFivePlus = Object.keys(cardsByCost).filter(c => c >= 5).flatMap(c => cardsByCost[c]);
  
  // MULLIGAN RECOMMENDATIONS based on actual cards
  coaching += `📊 MULLIGAN STRATEGY:\n`;
  coaching += `Keep (GOOD HAND):\n`;
  
  if (costOne.length > 0) {
    const examples = costOne.slice(0, 2).map(c => c.name).join(', ');
    coaching += `  ✓ 1-Drop openers: ${examples}\n`;
  }
  if (costTwo.length > 0) {
    const examples = costTwo.slice(0, 2).map(c => c.name).join(', ');
    coaching += `  ✓ 2-Drop progression: ${examples}\n`;
  }
  if (costThreeFour.length > 0) {
    const examples = costThreeFour.slice(0, 1).map(c => c.name).join(', ');
    coaching += `  ✓ Curve fillers (cost 3-4): ${examples}\n`;
  }
  
  coaching += `\nMulligan (WEAK HAND):\n`;
  
  // Find cards to mulligan away
  const highCostCards = costFivePlus.slice(0, 3).map(c => c.name).join(', ');
  if (highCostCards) {
    coaching += `  ✗ High-cost duplicates (cost 5+): ${highCostCards}\n`;
  }
  
  const mulliganDuplicates = Object.entries(deckCards).filter(([_, count]) => count >= 3).slice(0, 2).map(([name]) => name).join(', ');
  if (mulliganDuplicates) {
    coaching += `  ✗ 3+ copies of same card: ${mulliganDuplicates}\n`;
  }
  
  const allSpells = cardsByType.spells.slice(0, 2).map(c => c.name).join(', ');
  if (allSpells && cardsByType.creatures.length > 15) {
    coaching += `  ✗ Hands with only spells/no creatures: ${allSpells}\n`;
  }
  
  coaching += `\n`;
  
  // TURN-BY-TURN GAMEPLAY based on actual deck composition
  coaching += `🎯 TURN-BY-TURN GAMEPLAY GUIDE:\n`;
  
  if (costOne.length > 0) {
    const t1Card = costOne[0].name;
    coaching += `TURN 1: Play ${t1Card} (cost 1) - Start your board. Get ink ready for turn 2.\n`;
  } else {
    coaching += `TURN 1: Pass or play 1-cost if available. Build your board presence safely.\n`;
  }
  
  if (costTwo.length > 0) {
    const t2Card = costTwo[0].name;
    coaching += `TURN 2: Add ink + play ${t2Card} (cost 2) - Growing your board. `;
    if (playStyle === 'control') {
      coaching += `Be ready to challenge if threatened.\n`;
    } else {
      coaching += `Push early pressure.\n`;
    }
  } else {
    coaching += `TURN 2: Add ink + continue board development. Play best available creature.\n`;
  }
  
  if (costThreeFour.length > 0) {
    const t34Card = costThreeFour[0].name;
    coaching += `TURN 3-4: Add ink + play ${t34Card} (cost 3-4) - Fill your curve. Make strategic trades to maximize value.\n`;
  } else {
    coaching += `TURN 3-4: Add ink + focus on favorable trades. Balance tempo vs card advantage.\n`;
  }
  
  if (costFivePlus.length > 0) {
    const finisher = costFivePlus[0].name;
    coaching += `TURN 5+: Play ${finisher} (cost 5+) - Your finisher enters play. `;
    if (playStyle === 'aggro') {
      coaching += `Push for lethal damage. Control the board aggressively.\n`;
    } else if (playStyle === 'control') {
      coaching += `Stabilize. Lock the board until you can take over.\n`;
    } else {
      coaching += `Ask: Am I the beatdown? If yes, push damage. If no, stabilize.\n`;
    }
  } else {
    coaching += `TURN 5+: Deploy your strongest cards. Lock the board and aim to close out the game.\n`;
  }
  
  coaching += `\n`;
  
  // Count singleton cards for consistency analysis
  const singletonCount = Object.values(deckCards).filter(count => count === 1).length;
  
  // TAILORED CARD RECOMMENDATIONS (Based on actual deck cards)
  coaching += `🔄 DECK TUNING ANALYSIS\n`;
  const inks = analysis.inkColors || {};
  
  // Map color names to Lorcana ink types if needed
  const colorMap = {
    'Red': 'Ruby',
    'Blue': 'Sapphire', 
    'Green': 'Emerald',
    'Black': 'Amethyst',
    'White': 'Amber',
    'Ruby': 'Ruby',
    'Sapphire': 'Sapphire',
    'Emerald': 'Emerald',
    'Amethyst': 'Amethyst',
    'Amber': 'Amber',
    'Steel': 'Steel'
  };
  
  const colorKeys = Object.keys(inks).sort((a, b) => inks[b] - inks[a]).slice(0, 2); // Max 2 colors
  const primaryColorRaw = colorKeys[0] || 'None';
  const secondaryColorRaw = colorKeys[1] || 'None';
  
  const primaryColor = colorMap[primaryColorRaw] || primaryColorRaw;
  const secondaryColor = colorMap[secondaryColorRaw] || secondaryColorRaw;
  
  coaching += `Primary Ink: ${primaryColor} (${inks[primaryColorRaw] || 0} cards)\n`;
  if (secondaryColor !== 'None') {
    coaching += `Secondary Ink: ${secondaryColor} (${inks[secondaryColorRaw] || 0} cards)\n`;
  }
  coaching += `\n`;

  // ADVANCED TRADING CARD STRATEGY (keeping the rest of the original coaching logic)
  coaching += `📈 ADVANCED TRADING CARD STRATEGY & RESOURCE MANAGEMENT:\n`;
  coaching += `\nPOSITIONING STRATEGY (When to Attack vs Defend):\n`;
  coaching += `  1. BEFORE ATTACKING: Ask these questions:\n`;
  coaching += `     • Can I kill them in 2 more turns? (YES = attack with evasion/power)\n`;
  coaching += `     • Am I losing the board race? (YES = trade creatures to stabilize)\n`;
  coaching += `     • Do I have better value elsewhere? (YES = don't attack, protect your board)\n`;
  coaching += `  2. CHALLENGE RHYTHM: When to block vs not:\n`;
  coaching += `     • Block if: Their creature is bigger, or you trade up (1 for 2 value)\n`;
  coaching += `     • Don't block if: You need life total for lethal math, or you're ahead\n`;
  coaching += `     • Worst blocks: Trading 1-drop for 1-drop (equal trades rarely help)\n`;
  coaching += `  3. DAMAGE ALLOCATION: Every hit counts\n`;
  coaching += `     • Turn 1-3: Minimize creature damage (block good trades)\n`;
  coaching += `     • Turn 4+: Take hits if you have stabilization (answers/healing)\n`;
  coaching += `     • Life total = resource (manage it like ink)\n`;
  coaching += `\nTEMPO EXCHANGES (Card Advantage vs Tempo Tradeoffs):\n`;
  coaching += `  TEMPO = Speed (getting threats out fast)\n`;
  coaching += `  CARD ADVANTAGE = Quantity (more cards than opponent)\n`;
  coaching += `  1. TEMPO PLAY: Quick deployment\n`;
  coaching += `     • Example: Play 2-cost creature turn 2 vs holding for 3-cost turn 3\n`;
  coaching += `     • When it wins: You're racing (trying to kill turn 5-6)\n`;
  coaching += `     • When it loses: You're behind (they stabilize faster than you)\n`;
  coaching += `  2. CARD ADVANTAGE PLAY: Patience\n`;
  coaching += `     • Example: Play creature that draws a card (even if slower)\n`;
  coaching += `     • When it wins: Long games (turn 6+)\n`;
  coaching += `     • When it loses: Fast games (you get run over before advantage matters)\n`;
  coaching += `  3. MID-GAME TEMPO: Turns 3-4 are critical\n`;
  coaching += `     • Play 1-2 threats per turn (force multiple answers)\n`;
  coaching += `     • Bad for them: Can't answer all your threats efficiently\n`;
  coaching += `     • Good for you: Forces them to blank-turn or take damage\n`;
  coaching += `\nRESOURCE MANAGEMENT (Ink, Cards, Life Total):\n`;
  coaching += `  INK MANAGEMENT:\n`;
  coaching += `    • Early game: Play 1 ink per turn MINIMUM (keep options open)\n`;
  coaching += `    • Mid game: Accelerate inking ONLY if you have threats to play\n`;
  coaching += `    • Late game: Full inks let you play multiple threats (huge tempo swing)\n`;
  coaching += `    • DON'T over-ink early just because you can\n`;
  coaching += `  HAND SIZE:\n`;
  coaching += `    • Small hand = vulnerable. They know what you can play.\n`;
  coaching += `    • Big hand = better options, can pivot strategies\n`;
  coaching += `    • Draw creatures are MVP (create hand advantage)\n`;
  coaching += `  BOARD STATE:\n`;
  coaching += `    • Board = your tempo resource. Control it.\n`;
  coaching += `    • 1 creature ahead = advantage (trade favorably)\n`;
  coaching += `    • 2+ creatures ahead = you're winning (protect board)\n`;
  coaching += `\nMULCH/DISCARD OPTIMIZATION:\n`;
  coaching += `  • Discard cards are EFFICIENT removal (cost-effective)\n`;
  coaching += `  • Timing: Use discard when opponent has good hand (big advantage)\n`;
  coaching += `  • Targets: Remove threats that are hard to answer, or card draw creatures\n`;
  coaching += `  • When NOT to discard: If they're at high lore + about to win anyway\n`;
  coaching += `\nSYNERGY PAYOFFS (When to prioritize them):\n`;
  coaching += `  • Single synergy (1 piece): DON'T build around it\n`;
  coaching += `  • Consistent synergy (3+ pieces): YES, lean into it\n`;
  coaching += `  • Payoff creature: Play it when you have pieces online\n`;
  coaching += `  • Don't over-synergize: A 2/2 creature is still just 2/2\n`;

  coaching += `\n`;

  // GENERAL DECK-BUILDING PRINCIPLES
  coaching += `🧠 GENERAL DECK-BUILDING WISDOM & PRINCIPLES:\n`;
  coaching += `\nCURVE THEORY & CONSISTENCY:\n`;
  coaching += `  MANA CURVE (Cost distribution):\n`;
  coaching += `  • Ideal distribution: 4 cost-1 | 6 cost-2 | 6 cost-3-4 | 6 cost-5+ | Rest = answers\n`;
  coaching += `  • Your average cost (${avgCost.toFixed(2)}): ${avgCost > 4.5 ? 'TOO HIGH (slow)' : avgCost < 3 ? 'TOO LOW (weak finishers)' : 'GOOD (balanced)'}\n`;
  coaching += `  • Smooth curve = consistent plays every turn\n`;
  coaching += `  • Two-humped curve = early drops + finishers (gaps in middle)\n`;
  coaching += `\nCONSISTENCY vs POWER:\n`;
  coaching += `  • CONSISTENCY = Always have a play. More 2-ofs than 1-ofs.\n`;
  coaching += `  • POWER = Each card is maximum impact. More 1-ofs (risky).\n`;
  coaching += `  • Current deck: ${singletonCount > 8 ? 'TOO MANY SINGLETONS' : 'Good consistency'} (${singletonCount} 1-ofs)\n`;
  coaching += `  • Fix: Shift duplicates from 1-of -> 2-of for better hands\n`;
  coaching += `\nTHREAT vs ANSWER RATIO:\n`;
  coaching += `  • THREATS (creatures/damage): Should be 55-60% of deck\n`;
  coaching += `  • ANSWERS (removal/stabilization): Should be 20-30%\n`;
  coaching += `  • UTILITY (draw/tutors): Should be 10-20%\n`;
  coaching += `  • Your mix: ${cardsByType.creatures.length > 40 ? 'Too many threats' : cardsByType.creatures.length < 30 ? 'Too few threats' : 'Balanced'} creatures detected\n`;
  coaching += `\nSYNERGY vs STAPLES BALANCE:\n`;
  coaching += `  • SYNERGY: Cards that work together (multiplied value)\n`;
  coaching += `  • STAPLES: Best cards universally (always good)\n`;
  coaching += `  • Balance: 60% staples + 40% synergy pieces\n`;
  coaching += `  • Mistake: Building around 1 synergy at the cost of bad cards\n`;
  coaching += `\nCARD DRAW vs THREATS SPLIT:\n`;
  coaching += `  • Draw creatures: Should be 3-6 copies (depends on archetype)\n`;
  coaching += `  • Threats: Should be 30+ copies (majority)\n`;
  coaching += `  • Answers: Should be 8-15 copies\n`;
  const songsCount = cardsByType.songs?.length || 0;
  coaching += `  • Your breakdown: ${songsCount > 0 ? `Has ${songsCount} songs (check Singer ratio)` : 'No songs detected'}\n`;
  coaching += `\nMULLIGAN PATTERNS FOR THIS DECK:\n`;
  coaching += `  • KEEP (Good hand): Turn-1 creature + 2-drop + land\n`;
  coaching += `  • MULLIGAN (Weak hand): No creatures OR all spells OR all high-cost\n`;
  coaching += `  • Specific to YOU (${primaryColor}/${secondaryColor}):\n`;
  const primaryLower = primaryColorRaw && primaryColorRaw !== 'None' ? primaryColorRaw.toLowerCase() : '';
  if (primaryLower === 'ruby') {
    coaching += `    - KEEP: 1-cost Rush creature (Moana/Rapunzel) + any 2-drop\n`;
    coaching += `    - MULLIGAN: No 1-drops, or only high-cost creatures\n`;
  } else if (primaryLower === 'sapphire') {
    coaching += `    - KEEP: Draw creature (Elsa/Olaf) + blocker or threat\n`;
    coaching += `    - MULLIGAN: No draw creatures, hand looks weak\n`;
  } else if (primaryLower === 'emerald') {
    coaching += `    - KEEP: Ramp creature (cost 1-2 mana generator) + follows\n`;
    coaching += `    - MULLIGAN: No ramp, all high-cost, looks slow\n`;
  } else {
    coaching += `    - KEEP: Curve + any good starter\n`;
    coaching += `    - MULLIGAN: Weak openings, missing curve\n`;
  }
  coaching += `\nCARD SELECTION PRINCIPLES:\n`;
  coaching += `  • NEVER: Include a card just because it's 'good'\n`;
  coaching += `  • ALWAYS: Ask 'Does this card fit my strategy?'\n`;
  coaching += `  • SYNERGY TEST: Does this card trigger synergy or get triggered?\n`;
  coaching += `  • SLOT OPPORTUNITY COST: Is this better than the 60th-best card?\n`;
  coaching += `  • Example: A 3/3 creature is average. Only include if it does something extra.\n`;
  coaching += `\nCOMMON DECKBUILDING MISTAKES:\n`;
  coaching += `  1. Too many colors (${colorCount > 3 ? 'YES, you have this problem' : 'No, you are fine'})\n`;
  coaching += `     - Decreases consistency\n`;
  coaching += `     - Hard to cast spells that need specific inks\n`;
  coaching += `     - Stick to 2 main colors\n`;
  coaching += `  2. Bad mana curve (detected: ${avgCost > 4.5 || avgCost < 3 ? 'YES' : 'No'})\n`;
  coaching += `     - No plays early = you lose before your deck works\n`;
  coaching += `     - Add more cost-1 and cost-2 creatures\n`;
  coaching += `  3. Too many finishers\n`;
  coaching += `     - Playing multiple cost-5+ cards means mana issues\n`;
  coaching += `     - Need 4-6 total, not 10+\n`;
  coaching += `  4. Ignoring format staples\n`;
  coaching += `     - Every meta has key cards EVERYONE plays\n`;
  coaching += `     - You NEED copies of format staples\n`;
  coaching += `  5. Over-synergizing\n`;
  coaching += `     - A bad card that synergizes is still bad\n`;
  coaching += `     - Only add if card is good + synergizes\n`;
  coaching += `\nIMPROVEMENT PATH (Next steps):\n`;
  coaching += `  1. WEEK 1: Fix mana curve (get to 3.5-4.0 average)\n`;
  coaching += `  2. WEEK 2: Reduce colors to 2, increase consistency\n`;
  coaching += `  3. WEEK 3: Study meta, add 2-3 tech cards\n`;
  coaching += `  4. WEEK 4: Play 10 games, refine based on results\n`;
  coaching += `  5. MONTH 2: Repeat weekly adjustments\n`;

  coaching += `\n`;

  // Final Notes
  coaching += `📝 FINAL TIPS\n`;
  coaching += `• Test this deck in 5+ games before adjusting\n`;
  coaching += `• Track which cards you mulligan away (signs of bad includes)\n`;
  coaching += `• Adjust sideboard first, then mainboard\n`;
  coaching += `• Play matchups multiple times before changing strategy\n`;
  coaching += `• Remember: Small advantages compound into huge leads\n`;

  return coaching;
}
