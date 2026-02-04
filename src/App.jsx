import { useState, useEffect } from "react";
import { analyzeDeck } from "./logic/deckAnalyzer";
import strategyGuides from "./data/strategyGuides.json";
import cardMeta from "./data/cardMeta.json";

export default function App() {
  const [deckText, setDeckText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [saved, setSaved] = useState([]);
  const [serverEnabled, setServerEnabled] = useState(false);
  const [aiCoaching, setAiCoaching] = useState('');
  const [playStyle, setPlayStyle] = useState('balanced');

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("lorcana_saved_decks") || "[]");
      setSaved(s);
    } catch (e) {
      setSaved([]);
    }
    if (serverEnabled) {
      fetch((import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/api/decks').then(r=>r.json()).then(d=>setSaved(d)).catch(()=>{})
    }
  }, []);

  const handleAnalyze = () => {
    const result = analyzeDeck(deckText);
    setAnalysis(result);
  };

  const handleSave = () => {
    const name = prompt("Save name:", "My Deck") || "My Deck";
    const item = { id: Date.now(), name, deckText, analysis, createdAt: new Date().toISOString() };
    if (serverEnabled) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
      fetch(`${apiUrl}/api/decks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: item.name, deckText: item.deckText, analysis: item.analysis }) })
        .then(r=>r.json()).then(savedItem=>{ setSaved(prev=>[savedItem, ...prev]); alert('Saved to server') }).catch(()=>alert('Server save failed'))
      return
    }
    const next = [item, ...saved];
    localStorage.setItem("lorcana_saved_decks", JSON.stringify(next));
    setSaved(next);
    alert("Deck saved locally")
  };

  const handleLoad = (item) => {
    setDeckText(item.deckText || "");
    setAnalysis(item.analysis || null);
  };

  const handleDelete = (id) => {
    if (serverEnabled) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
      fetch(`${apiUrl}/api/decks`).then(r=>r.json()).then(d=>{ const next = d.filter(x=>x.id!==id); setSaved(next) }).catch(()=>{})
      return
    }
    const next = saved.filter(s => s.id !== id);
    localStorage.setItem("lorcana_saved_decks", JSON.stringify(next));
    setSaved(next);
  };

  const handleDownload = () => {
    const data = { deckText, analysis };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lorcana-analysis.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Lorcana Deck Analyzer</h1>

      <textarea
        rows={10}
        style={{ width: "100%", marginBottom: "1rem" }}
        placeholder="Paste your decklist here..."
        value={deckText}
        onChange={(e) => setDeckText(e.target.value)}
      />

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleAnalyze}>Analyze Deck</button>
        <button onClick={handleSave} disabled={!analysis}>Save Deck</button>
        <button onClick={handleDownload} disabled={!analysis}>Download Analysis</button>
        <label style={{ marginLeft: 8 }}><input type="checkbox" checked={serverEnabled} onChange={e=>setServerEnabled(e.target.checked)} /> Use server</label>
        <select value={playStyle} onChange={(e)=>setPlayStyle(e.target.value)} disabled={!analysis} style={{padding:4}}>
          <option value="aggro">Aggro (Fast Win)</option>
          <option value="midrange">Midrange (Balanced)</option>
          <option value="control">Control (Late Game)</option>
          <option value="balanced">Balanced Analysis</option>
        </select>
        <button onClick={()=>{
          if (!analysis) {
            setAiCoaching('No analysis provided; run analyzer first.');
            return;
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
          
          const styleKey = playStyle === 'balanced' ? 'midrange' : playStyle;
          
          // ANALYZE WHAT'S MISSING FROM THE DECK
          coaching += `📋 CURVE & COST ANALYSIS:\n`;
          coaching += `  Cost 1: ${costOne.length} card${costOne.length !== 1 ? 's' : ''} (${costOne.map(c => c.name).join(', ') || 'NEED MORE'})\n`;
          coaching += `  Cost 2: ${costTwo.length} card${costTwo.length !== 1 ? 's' : ''} (${costTwo.map(c => c.name).join(', ') || 'NEED MORE'})\n`;
          coaching += `  Cost 3-4: ${costThreeFour.length} cards\n`;
          coaching += `  Cost 5+: ${costFivePlus.length} cards (finishers)\n\n`;
          
          // Identify curve gaps
          coaching += `⚠️ CURVE GAPS TO FIX:\n`;
          if (costOne.length === 0) {
            coaching += `  → CRITICAL: No cost-1 creatures. Add 2-4 one-drops for early presence\n`;
          } else if (costOne.length < 4) {
            coaching += `  → Add more cost-1 creatures (need 4-6 total)\n`;
          }
          
          if (costTwo.length === 0) {
            coaching += `  → CRITICAL: No cost-2 creatures. Add 2-4 two-drops for turn-2 plays\n`;
          } else if (costTwo.length < 4) {
            coaching += `  → Add more cost-2 creatures (need 4-6 total)\n`;
          }
          
          if (costThreeFour.length < 6) {
            coaching += `  → Add mid-cost creatures (cost 3-4) to fill turns 3-4\n`;
          }
          
          if (costFivePlus.length === 0) {
            coaching += `  → CRITICAL: No high-cost finishers. Add 4-6 cost-5+ creatures to close games\n`;
          } else if (costFivePlus.length < 3) {
            coaching += `  → Add more finishers (cost 5+) - need 4-6 total\n`;
          }
          coaching += `\n`;
          
          // TYPE MIX ANALYSIS
          if (cardsByType.creatures.length > 0) {
            coaching += `📊 CREATURE COUNT: ${cardsByType.creatures.length} creatures detected\n`;
          }
          if (cardsByType.spells.length > 0) {
            coaching += `  Spells: ${cardsByType.spells.length} (${cardsByType.spells.map(s => s.name).join(', ')})\n`;
          }
          if (cardsByType.items.length > 0) {
            coaching += `  Items: ${cardsByType.items.length} (${cardsByType.items.map(i => i.name).join(', ')})\n`;
          }
          if (cardsByType.songs.length > 0) {
            coaching += `  Songs: ${cardsByType.songs.length} (${cardsByType.songs.map(s => s.name).join(', ')}) - Ensure you have singers!\n`;
          }
          coaching += `\n`;
          
          // SPECIFIC CARDS TO CONSIDER REMOVING
          coaching += `🗑️ CARDS TO CONSIDER REMOVING:\n`;
          const duplicates = Object.entries(deckCards).filter(([_, count]) => count >= 3).slice(0, 3);
          if (duplicates.length > 0) {
            coaching += `  → Reduce 3-4x copies: ${duplicates.map(([name, count]) => name).join(', ')}\n`;
          }
          
          const singletons = Object.entries(deckCards).filter(([_, count]) => count === 1).slice(0, 4);
          if (singletons.length > 4) {
            coaching += `  → Too many singletons (${singletons.length} found). Cut to 1-2 per deck.\n`;
          }
          
          if (costFivePlus.length > 8) {
            coaching += `  → Too many high-cost cards. Consider cutting some 5+ cost creatures.\n`;
          }
          coaching += `\n`;
          
          // COLOR-SPECIFIC RECOMMENDATIONS
          coaching += `✨ ${primaryColor}-FOCUSED IMPROVEMENTS:\n`;
          if (primaryColorRaw === 'ruby') {
            coaching += `  → Look for: Rush creatures (attack immediately), Evasive threats\n`;
            coaching += `  → Priority fills: Cost-1 rushers, cost-2 damage dealers, finishers\n`;
            if (playStyle === 'aggro') {
              coaching += `  → Mulligan for: 1-drop + 2-drop openers\n`;
            }
          } else if (primaryColorRaw === 'amber') {
            coaching += `  → Look for: Healing/recovery, board control, stabilization\n`;
            coaching += `  → Priority fills: Healing creatures, removal, defensive walls\n`;
            if (playStyle === 'control') {
              coaching += `  → Mulligan for: Early defenders or draw\n`;
            }
          } else if (primaryColorRaw === 'sapphire') {
            coaching += `  → Look for: Card draw, resource generators, tempo threats\n`;
            coaching += `  → Priority fills: Draw creatures, tutors, efficient creatures\n`;
            if (playStyle === 'control') {
              coaching += `  → Mulligan for: Draw engines\n`;
            }
          } else if (primaryColorRaw === 'emerald') {
            coaching += `  → Look for: Ramp creatures, mana generators, efficient threats\n`;
            coaching += `  → Priority fills: Ramp creatures, value generators\n`;
            if (playStyle === 'aggro') {
              coaching += `  → Mulligan for: 1-drop ramp into explosive plays\n`;
            }
          } else if (primaryColorRaw === 'steel') {
            coaching += `  → Look for: High-power creatures, defensive keywords\n`;
            coaching += `  → Priority fills: Power creatures, defensive walls\n`;
          }
          
          if (secondaryColor !== 'None') {
            coaching += `\n🌟 ${secondaryColor}-SYNERGY ADDITIONS:\n`;
            if (secondaryColorRaw === 'sapphire') {
              coaching += `  → Add: Draw/card advantage creatures to support ${primaryColor}\n`;
            } else if (secondaryColorRaw === 'emerald') {
              coaching += `  → Add: Ramp/mana creatures for explosive plays\n`;
            } else if (secondaryColorRaw === 'ruby') {
              coaching += `  → Add: Aggressive damage threats\n`;
            } else if (secondaryColorRaw === 'amber') {
              coaching += `  → Add: Healing/recovery for durability\n`;
            } else if (secondaryColorRaw === 'steel') {
              coaching += `  → Add: High-power creatures for late game\n`;
            }
          }
          coaching += `\n`;
          
          // TACTICAL STRATEGY SECTION
          coaching += `🎮 COMPETITIVE TACTICS:\n`;
          const beatdownGuide = strategyGuides.intermediateTips.whoIsTheBeatdown;
          const tempoGuide = strategyGuides.intermediateTips.tempoPlays;
          coaching += `  1. WHO'S THE BEATDOWN? ${beatdownGuide.description}\n`;
          if (playStyle === 'aggro') {
            coaching += `     → You're the beatdown: Quest aggressively, finish before they stabilize\n`;
          } else if (playStyle === 'control') {
            coaching += `     → You're usually control: Challenge defensively, buy time for answers\n`;
          } else {
            coaching += `     → Position is fluid: Ask this question every turn\n`;
          }
          coaching += `\n`;
          coaching += `  2. TEMPO & CARD ADVANTAGE\n`;
          coaching += `     → Tempo: Use resources efficiently, build 1+ creature advantage\n`;
          coaching += `     → Card Advantage: Draw more cards than opponent (hand size matters)\n`;
          coaching += `     → Combine both: Control the flow of the game\n`;
          coaching += `     → Removal timing: Use before opponent's synergies trigger\n\n`;
          coaching += `  3. STAY ON CURVE\n`;
          coaching += `     → Plan: 1-drop turn 1, 2-drop turn 2, etc.\n`;
          coaching += `     → Don't over-ink early game just because you can\n`;
          coaching += `     → Keep reserve ink for curve plays\n\n`;
          
          if (primaryColor === 'Ruby' || primaryColor === 'Steel') {
            coaching += `  4. ⚠️ EXPECT REMOVAL (${primaryColor} meta threats)\n`;
            if (primaryColor === 'Ruby') {
              coaching += `     → Watch for: Be Prepared (board wipe at 7 ink), Dragon Fire (4 copies likely)\n`;
            } else {
              coaching += `     → Watch for: Grab Your Sword, Smash, Fire the Cannons\n`;
            }
            coaching += `     → Tactic: Don't overcommit weak characters, bait removal before deploying threats\n\n`;
          }
          
          coaching += `  5. TRADE UP\n`;
          coaching += `     → Always trade 1-cost for 2-cost (you're ahead)\n`;
          coaching += `     → Avoid equal trades unless you're already winning\n`;
          coaching += `     → Remove higher-value opponent cards when possible\n\n`;
          
          // DETAILED DECK ISSUES & SPECIFIC FIXES
          coaching += `📋 DETAILED CARD ANALYSIS:\n`;
          const cardsList = Object.entries(cards);
          const avgCardCost = analysis.avgCost ? parseFloat(analysis.avgCost) : 4;
          const singletonCount = cardsList.filter(([_, count]) => count === 1).length;
          const threeOfCount = cardsList.filter(([_, count]) => count >= 3).length;
          
          coaching += `  Current deck has:\n`;
          coaching += `  • ${cardsList.length} unique cards\n`;
          coaching += `  • ${singletonCount} singleton (1-of) cards\n`;
          coaching += `  • ${threeOfCount} cards at 3+ copies\n`;
          coaching += `  • Avg cost: ${avgCardCost.toFixed(2)}\n\n`;
          
          if (singletonCount > 8) {
            coaching += `  ⚠️ TOO MANY SINGLETONS (${singletonCount}): Reduces consistency!\n`;
            coaching += `  → Remove: ${cardsList.filter(([_, c]) => c === 1).slice(0, 3).map(([n]) => n).join(', ')}\n`;
            coaching += `  → Add: Extra copies of your best cards or proven staples\n\n`;
          }
          
          if (avgCardCost > 4.5 && playStyle === 'aggro') {
            coaching += `  ⚠️ CURVE TOO HIGH for Aggro (${avgCardCost.toFixed(2)})\n`;
            coaching += `  → Problem: Will be too slow, weak early game\n`;
            coaching += `  → Fix: Remove high-cost cards, add 2-3 cost creatures\n`;
            coaching += `  → Cards to cut: ${cardsList.filter(([_, c]) => c === 1).slice(0, 2).map(([n]) => n).join(', ')}\n`;
            coaching += `  → Look for: Early board presense creatures\n\n`;
          } else if (avgCardCost < 3 && playStyle === 'control') {
            coaching += `  ⚠️ CURVE TOO LOW for Control (${avgCardCost.toFixed(2)})\n`;
            coaching += `  → Problem: Weak finishers, can't close games\n`;
            coaching += `  → Fix: Remove cheap creatures, add high-impact threats\n`;
            coaching += `  → Cards to cut: ${cardsList.filter(([_, c]) => c === 1).slice(0, 2).map(([n]) => n).join(', ')}\n`;
            coaching += `  → Look for: Cost 5+ finishers and board wipes\n\n`;
          }
          
          // KEYWORD SYNERGY REMINDERS
          coaching += `🔑 KEYWORD SYNERGIES TO LEVERAGE:\n`;
          const keywordGuide = strategyGuides.advancedConcepts.keywordSynergy;
          coaching += `  • EVASIVE: ${keywordGuide.evasive}\n`;
          coaching += `  • BODYGUARD: ${keywordGuide.bodyguard}\n`;
          coaching += `  • SHIFT: ${keywordGuide.shift}\n`;
          coaching += `  • PRINCIPLE: Don't neglect staple effects for synergy. Balance both!\n\n`;
          
          // DECK BUILD STRATEGY SUMMARY (Based on ACTUAL detected ink colors)
          coaching += `🎯 BUILD STRATEGY:\n`;
          
          // Strategy based on ACTUAL ink colors, not playstyle
          const deckColorCode = `${primaryColorRaw}${secondaryColorRaw !== 'None' ? '/' + secondaryColorRaw : ''}`;
          
          if (primaryColorRaw === 'ruby') {
            coaching += `🔥 RUBY/${secondaryColorRaw !== 'None' ? secondaryColorRaw.toUpperCase() : 'X'} AGGRESSIVE BUILD:\n`;
            coaching += `  → Prioritize Rush creatures (attack immediately) and Evasive abilities\n`;
            coaching += `  → Ruby synergies: Damage effects, direct threat generation\n`;
            if (secondaryColorRaw === 'steel') {
              coaching += `  → Steel synergies: Card draw + protection (support)\n`;
            } else if (secondaryColorRaw === 'amber') {
              coaching += `  → Amber synergies: Answers + removal support\n`;
            }
            coaching += `  → Fill slots 1-20: Rush creatures (cost 1-3)\n`;
            coaching += `  → Slots 20-30: Evasive damage threats\n`;
            coaching += `  → Slots 30-45: High-damage finishers\n`;
            coaching += `  → Slots 45-60: Meta answers\n`;
            coaching += `  → Win condition: Damage by turn 5-6 via Rush + Evasion\n\n`;
          } else if (primaryColorRaw === 'amber') {
            coaching += `🛡️ AMBER/${secondaryColorRaw !== 'None' ? secondaryColorRaw.toUpperCase() : 'X'} CONTROL BUILD:\n`;
            coaching += `  → Load up on removal, board stabilization, and recovery\n`;
            coaching += `  → Amber synergies: Board control, tempo disruption\n`;
            if (secondaryColorRaw === 'steel') {
              coaching += `  → Steel synergies: Card advantage + consistency\n`;
            } else if (secondaryColorRaw === 'ruby') {
              coaching += `  → Ruby synergies: Aggressive answers + tempo\n`;
            }
            coaching += `  → Fill slots 1-20: Defensive creatures + stabilization\n`;
            coaching += `  → Slots 20-35: Removal and board answers\n`;
            coaching += `  → Slots 35-45: Card draw/tutors for consistency\n`;
            coaching += `  → Slots 45-60: Finishers (high-power threats once board locked)\n`;
            coaching += `  → Win condition: Survive, then win turn 7+ with locked board\n\n`;
          } else if (primaryColorRaw === 'sapphire' || primaryColorRaw === 'emerald') {
            const isBlue = primaryColorRaw === 'sapphire';
            coaching += `⚔️ ${isBlue ? 'SAPPHIRE' : 'EMERALD'}/${secondaryColorRaw !== 'None' ? secondaryColorRaw.toUpperCase() : 'X'} MIDRANGE BUILD:\n`;
            coaching += `  → Balance efficient creatures (50%) with targeted answers (50%)\n`;
            if (isBlue) {
              coaching += `  → Sapphire synergies: Card draw, resource generation\n`;
            } else {
              coaching += `  → Emerald synergies: Ramp, efficient threats\n`;
            }
            if (secondaryColorRaw === 'steel') {
              coaching += `  → Steel synergies: Additional card advantage\n`;
            } else if (secondaryColorRaw === 'ruby') {
              coaching += `  → Ruby synergies: Aggressive threats\n`;
            }
            coaching += `  → Fill slots 1-30: Efficient creatures (cost 2-5)\n`;
            coaching += `  → Slots 30-45: Flexible removal + answers\n`;
            coaching += `  → Slots 45-55: Value generators + synergy cards\n`;
            coaching += `  → Slots 55-60: Meta answers/tech cards\n`;
            coaching += `  → Win condition: Value trades + efficient threats into turn 7\n\n`;
          } else {
            coaching += `⚔️ ${primaryColor}/${secondaryColor} CUSTOM BUILD:\n`;
            coaching += `  → Focus on ${primaryColor} synergies + ${secondaryColor !== 'None' ? secondaryColor : 'flex'} utilities\n`;
            coaching += `  → Build slots to support both ink colors appropriately\n`;
            coaching += `  → Slots 1-30: Core creatures for ${primaryColor}\n`;
            coaching += `  → Slots 30-45: Answers and ${secondaryColor !== 'None' ? secondaryColor : 'flex'} support\n`;
            coaching += `  → Slots 45-60: Synergy payoffs and tech\n\n`;
          }
          
          // Mana Base & Color Check
          coaching += `💎 MANA & COLORS\n`;
          if (colorCount > 3) {
            coaching += `⚠️ ${colorCount} colors detected - HIGH INCONSISTENCY RISK\n`;
            coaching += `→ Reduce to 2-3 main colors. Remove single-off color requirements.\n`;
          } else {
            coaching += `✓ ${colorCount} color(s) - good consistency\n`;
          }
          coaching += `\n`;
          
          // Song Synergy
          if (songs > 0) {
            coaching += `🎵 SONG SYNERGY\n`;
            coaching += `${songs} songs detected - ensure you have:\n`;
            coaching += `• At least 1 Singer per Song\n`;
            coaching += `• Ways to tutor Songs or Singers\n`;
            coaching += `• Follow-up plays after Song resolution\n\n`;
          }
          
          // Key Weaknesses & Counters
          if (analysis.weaknesses && analysis.weaknesses.length > 0) {
            coaching += `⚡ KNOWN WEAKNESSES\n`;
            analysis.weaknesses.forEach(w => {
              coaching += `• ${w}\n`;
            });
            coaching += `→ Add cards that mitigate these risks (tech slots)\n\n`;
          }
          
          // Advanced Coaching Tips based on Deck Analysis
          coaching += `🏆 PERSONALIZED COACHING TIPS:\n`;
          const coachingTips = strategyGuides.coachingTips;
          
          // Check for construction issues
          if (cardCount !== 60) {
            coaching += `  ⚠️ DECK SIZE: Exactly 60 cards required. You have ${cardCount}. Adjust immediately.\n`;
          }
          
          const inkelligibleCount = Object.entries(cards).filter(([name]) => {
            const meta = cardMeta[name.toLowerCase()] || {};
            return meta.inkwell === false; // High-cost uninkable cards are risky
          }).length;
          
          if (inkelligibleCount > 30) {
            coaching += `  ⚠️ TOO MANY UNINKABLE: ${inkelligibleCount} cards can't be inked. Keep under 50% for consistency.\n`;
          }
          
          // Playstyle-specific coaching
          if (playStyle === 'aggro') {
            const oneDrops = Object.entries(cards).filter(([name]) => {
              const meta = cardMeta[name.toLowerCase()] || {};
              return meta.cost === 1;
            }).length;
            if (oneDrops < 8) {
              coaching += `  ⚠️ AGGRO CURVE: You have ${oneDrops} one-drops. Need 12-15 for proper early pressure.\n`;
            }
          }
          
          if (playStyle === 'control') {
            const removal = cardsList.length; // This is unique card count
            if (removal < 6) {
              coaching += `  💡 CONTROL SUITE: Consider 6-8 removal spells for your archetype. More answers = more wins.\n`;
            }
          }
          
          coaching += `  • PRIMARY FOCUS: ${playStyle === 'aggro' ? 'Early board pressure (turns 1-4)' : playStyle === 'control' ? 'Board stabilization (turns 4-7)' : 'Efficient trades (all game)'}\n`;
          coaching += `  • MULLIGAN: ${playStyle === 'aggro' ? 'Hard mulligan for 1-2 drop curve' : playStyle === 'control' ? 'Search for removal + card draw' : 'Balance threats and answers'}\n`;
          coaching += `  • WIN CONDITION: Turn 5-6 by damage | Turn 8+ by control | Turn 6-7 by tempo\n`;
          coaching += `\n`;
          
          // Synergies to Leverage
          if (analysis.synergies && analysis.synergies.length > 0) {
            coaching += `✨ STRONG SYNERGIES (LEAN INTO THESE!)\n`;
            analysis.synergies.forEach(s => {
              coaching += `• ${s} - consider adding more compatible cards\n`;
            });
            coaching += `\n`;
          }
          
          // Deck Construction Checklist
          coaching += `📋 DECK CONSTRUCTION CHECKLIST:\n`;
          const checklist = coachingTips.deck_construction_checklist;
          checklist.slice(0, 5).forEach(item => {
            coaching += `  ${item}\n`;
          });
          coaching += `\n`;
          
          // CURRENT META COACHING
          coaching += `⚔️ CURRENT META ANALYSIS (February 2026):\n`;
          const currentMeta = strategyGuides.currentMeta;
          // Identify if deck matches current meta archetypes
          let metaMatchup = null;
          if (primaryColorRaw === 'ruby' && secondaryColorRaw === 'amethyst') {
            metaMatchup = currentMeta.dominantArchetypes.rubyAmethyst;
          } else if (primaryColorRaw === 'sapphire' && secondaryColorRaw === 'steel') {
            metaMatchup = currentMeta.dominantArchetypes.sapphireSteel;
          } else if (primaryColorRaw === 'emerald' && secondaryColorRaw === 'sapphire') {
            metaMatchup = currentMeta.dominantArchetypes.emeraldSapphire;
          } else if (primaryColorRaw === 'amber' && secondaryColorRaw === 'steel') {
            metaMatchup = currentMeta.dominantArchetypes.amberSteel;
          }
          
          if (metaMatchup) {
            coaching += `📊 YOUR DECK MATCHES: ${metaMatchup.archetype}\n`;
            coaching += `  Status: ${primaryColorRaw === 'ruby' && secondaryColorRaw === 'amethyst' ? '🔥 HIGHEST PRIORITY - STUDY INTENSELY' : 'Solid meta performer'}\n`;
            coaching += `\n  STRENGTHS of this archetype:\n`;
            metaMatchup.strengths.slice(0, 3).forEach(s => {
              coaching += `    ✓ ${s}\n`;
            });
            coaching += `\n  WEAKNESSES to prepare for:\n`;
            metaMatchup.weaknesses.forEach(w => {
              coaching += `    ⚠️ ${w}\n`;
            });
            coaching += `\n  HOW TO COUNTER decks that beat you:\n`;
            metaMatchup.howToCounter.forEach(c => {
              coaching += `    → ${c}\n`;
            });
          } else {
            coaching += `📊 YOUR DECK: ${primaryColor}${secondaryColorRaw !== 'None' ? '/' + secondaryColor : ''} (Off-Meta)\n`;
            coaching += `  Note: Not a top-tier meta deck, but can still win with right matchups!\n`;
          }
          coaching += `\n`;
          
          // Meta-specific tech recommendations
          coaching += `🛡️ META TECH CARDS (February 2026):\n`;
          if (primaryColorRaw === 'ruby' || primaryColorRaw === 'amethyst') {
            coaching += `  Current meta is Ruby/Amethyst heavy. Include:\n`;
            coaching += `    • Resist creatures (Steel) - bypass Rush damage\n`;
            coaching += `    • Board stabilization - prevent snowballing turns 1-3\n`;
            coaching += `    • Healing/Recovery (Amber) - stabilize after hand pressure\n`;
          } else if (primaryColorRaw === 'sapphire' || primaryColorRaw === 'steel') {
            coaching += `  Control decks (like yours) are tier-1. You should:\n`;
            coaching += `    • Include early blockers to slow Rush/Evasive\n`;
            coaching += `    • Pack multiple removal answers in 2-4 cost range\n`;
            coaching += `    • Ensure draw engine survives early turns\n`;
          } else {
            coaching += `  To beat current meta (Ruby/Amethyst dominates):\n`;
            coaching += `    • Pack Resist creatures (especially Steel)\n`;
            coaching += `    • Include early defensive options\n`;
            coaching += `    • Have answers for Rush and Evasive threats\n`;
            coaching += `    • Consider Sapphire/Steel for consistent answers\n`;
          }
          coaching += `\n`;
          
          // Current tier ranking
          coaching += `🏆 META TIER RANKINGS (Current):\n`;
          coaching += `  TIER S:  Ruby/Amethyst Aggro-Control (Dominates)\n`;
          coaching += `  TIER 1A: Sapphire/Steel Control (Rising)\n`;
          coaching += `  TIER 1B: Emerald/Sapphire Midrange (Flexible)\n`;
          coaching += `  TIER 2:  Amber/Steel Defense, Ruby/Steel Tempo\n\n`;
          
          // COMBAT CURRENT META - SPECIFIC CARD RECOMMENDATIONS
          coaching += `⚔️ HOW TO COMBAT CURRENT META (Detailed):\n`;
          coaching += `\nRUBY/AMETHYST IS THE BIGGEST THREAT:\n`;
          coaching += `Ruby/Amethyst dominates because of early Rush pressure + hand disruption combo.\n\n`;
          
          // Tailored recommendations based on ACTUAL deck colors
          if (primaryColorRaw === 'ruby' && secondaryColorRaw === 'amethyst') {
            coaching += `YOUR POSITION: You're playing the meta favorite!\n`;
            coaching += `  → Your strengths (Rush pressure, hand control) are exactly what's winning\n`;
            coaching += `  → Focus on: Consistent turn 1-2 plays + never skip hand disruption\n`;
            coaching += `  → Key cards to maximize: Spend time understanding mulligan patterns\n`;
            coaching += `  → Practice: Play Sapphire/Steel control decks to learn your worst matchup\n`;
          } else if (primaryColorRaw === 'ruby') {
            coaching += `YOUR POSITION: Ruby deck, but need to shore up against Amethyst hand pressure.\n`;
            coaching += `  → ADD Amethyst pieces for hand disruption (synergizes perfectly with Rush)\n`;
            coaching += `  → Look for: Amethyst creatures with low cost that fill your curve\n`;
            coaching += `  → Synergy: Amethyst hand discard + Ruby tempo pressure = unbeatable early game\n`;
          } else if (secondaryColorRaw === 'amethyst') {
            coaching += `YOUR POSITION: Amethyst secondary - good hand disruption. Pair with aggressive beats.\n`;
            coaching += `  → Your Amethyst discard slows opponents significantly\n`;
            coaching += `  → Weakness: You need early aggressive threats (Ruby/Sapphire creatures)\n`;
            coaching += `  → Build around: Hand pressure as tempo to buy time for bigger threats\n`;
          } else if (primaryColorRaw === 'sapphire' && secondaryColorRaw === 'steel') {
            coaching += `YOUR POSITION: Sapphire/Steel Control - excellent meta matchup!\n`;
            coaching += `  → You're Tier 1A specifically to beat Ruby/Amethyst\n`;
            coaching += `  → Your advantage: Sapphire draw + Steel Resist creatures = Rush defense\n`;
            coaching += `  → Key cards: Keep blockers online turn 2-3 when they attack\n`;
            coaching += `  → Strategy: Stabilize early (turns 2-3), then establish card advantage turn 4+\n`;
          } else if (primaryColorRaw === 'sapphire') {
            coaching += `YOUR POSITION: Sapphire focused - excellent draw. Add Steel for Resist defense.\n`;
            coaching += `  → Against Ruby/Amethyst: They rely on early hits. Steel Resist stops damage completely\n`;
            coaching += `  → ADD: Steel creatures with Resist (high priority tech)\n`;
            coaching += `  → Card advantage: Your draw engine should out-value their pressure by turn 5+\n`;
          } else if (primaryColorRaw === 'steel') {
            coaching += `YOUR POSITION: Steel creatures strong, but need answering power.\n`;
            coaching += `  → Pair Steel with Sapphire for draw + Resist combo\n`;
            coaching += `  → Against Ruby/Amethyst: Your Resist walls stop Rush damage\n`;
            coaching += `  → Strategy: Early Steel blocker + draw engine = stabilize + win\n`;
          } else if (primaryColorRaw === 'emerald' && secondaryColorRaw === 'sapphire') {
            coaching += `YOUR POSITION: Emerald/Sapphire Midrange - flexible but vulnerable early.\n`;
            coaching += `  → Weakness: Ruby/Amethyst is faster than your setup (turns 1-3 are danger zone)\n`;
            coaching += `  → Early game: Mulligan aggressively for 2-drop blockers\n`;
            coaching += `  → Key cards: Keep Emerald control effects + Sapphire draw online\n`;
            coaching += `  → Tactic: Trade efficiently turns 1-4, then stabilize turn 5+ with card advantage\n`;
          } else if (primaryColorRaw === 'amber') {
            coaching += `YOUR POSITION: Amber/Defense - strong stabilization deck.\n`;
            coaching += `  → Against Ruby/Amethyst: You're actually well-positioned (Amber = healing/recovery)\n`;
            coaching += `  → Key strength: Recovery effects stabilize after hand disruption\n`;
            coaching += `  → Build around: Early blockers + healing payload\n`;
            coaching += `  → Card synergy: Pair with Steel for Resist (ultimate defense combo)\n`;
          } else {
            coaching += `YOUR POSITION: Off-meta, but still winnable.\n`;
            coaching += `  → Against Ruby/Amethyst: Don't try to out-tempo them. Out-value them instead.\n`;
            coaching += `  → Strategy: Stabilize, draw cards, win with superior late game\n`;
            coaching += `  → Key: Identify 1-2 meta matchups you crush, then grind those\n`;
          }
          
          coaching += `\n`;
          coaching += `🎯 SPECIFIC CARD RECOMMENDATIONS FOR META:\n`;
          
          // Specific cards based on primary color
          if (primaryColorRaw === 'ruby') {
            coaching += `[RUBY] Cards to add for Ruby/Amethyst matchups:\n`;
            coaching += `  → Moana (cost 1 Rush) - Essential turn-1 play\n`;
            coaching += `  → Mirabel (cost 2 Evasive) - Pressure while dodging blockers\n`;
            coaching += `  → Rapunzel/Gaston (cost 2 Rush) - Continue pressure turns 2-3\n`;
            coaching += `  → Jafar (if available, high-damage finisher) - Close games by turn 5-6\n`;
            coaching += `  → Look for: MORE Rush creatures in general (you can never have enough)\n`;
          } else if (primaryColorRaw === 'sapphire') {
            coaching += `[SAPPHIRE] Cards to add for control matchups:\n`;
            coaching += `  → Elsa (cost 1-2 draw) - Early card advantage\n`;
            coaching += `  → Olaf (cost 2, card draw trigger) - Consistent draw source\n`;
            coaching += `  → Anna (cost 3-4) - Mid-game value generator\n`;
            coaching += `  → Ariel (cost 4-5) - Card advantage sink\n`;
            coaching += `  → Look for: Draw creatures you can play early + keep resources flowing\n`;
          } else if (primaryColorRaw === 'emerald') {
            coaching += `[EMERALD] Cards to add for control/manipulation:\n`;
            coaching += `  → Jungle Book creatures (cost 1-3) - Efficient early creatures\n`;
            coaching += `  → Shere Khan (if available) - High-impact control effect\n`;
            coaching += `  → Baloo (cost 2-3) - Solid blocker + value\n`;
            coaching += `  → Look for: Creatures with abilities that affect the board state\n`;
          } else if (primaryColorRaw === 'amber') {
            coaching += `[AMBER] Cards to add for defensive/healing:\n`;
            coaching += `  → Belle (cost 2-3) - Early blocker\n`;
            coaching += `  → Adam (cost 3-4) - Recovery/healing effect\n`;
            coaching += `  → Mrs. Potts (cost 4-5) - Pure healing/stabilization\n`;
            coaching += `  → Look for: Creatures with recovery or defensive keywords (Bodyguard, Resist)\n`;
          }
          
          // Secondary color recommendations
          if (secondaryColorRaw === 'steel') {
            coaching += `[STEEL SECONDARY] ADD FOR DEFENSE:\n`;
            coaching += `  → Maleficent (if available, high Resist) - Blocks Rush creatures effectively\n`;
            coaching += `  → Chernabog (cost 4-5, high power) - Late-game threat + Resist\n`;
            coaching += `  → Look for: ANY Steel creature with Resist - your #1 priority against Ruby\n`;
          } else if (secondaryColorRaw === 'sapphire') {
            coaching += `[SAPPHIRE SECONDARY] ADD FOR DRAW:\n`;
            coaching += `  → Any cheap Sapphire draw creature (cost 1-2) that fits your curve\n`;
            coaching += `  → Build around: Sapphire as your resource generation engine\n`;
          } else if (secondaryColorRaw === 'amber') {
            coaching += `[AMBER SECONDARY] ADD FOR HEALING/ANSWERS:\n`;
            coaching += `  → Healing creatures (cost 3-5) to stabilize after pressure\n`;
            coaching += `  → Defensive creatures to trade efficiently\n`;
          }
          
          coaching += `\n`;
          coaching += `💡 MATCHUP-SPECIFIC PLAY STRATEGY:\n`;
          coaching += `\nIF YOU FACE RUBY/AMETHYST:\n`;
          coaching += `  Turn 1-2: Do NOT keep hands with no early creatures. Mulligan hard for 1-2 drops.\n`;
          coaching += `  Turn 3-4: They're applying maximum pressure. Trade early/block aggressively.\n`;
          coaching += `  Turn 5+: If you stabilized, you've likely won (they run out of steam)\n`;
          coaching += `  Key: Every point of damage matters early. Don't let them get to 10 lore easily.\n`;
          coaching += `\nIF YOU FACE SAPPHIRE/STEEL CONTROL:\n`;
          coaching += `  Turn 1-3: Play threats consecutively (don't let them answer just one thing)\n`;
          coaching += `  Turn 4-6: They're stabilizing. Attack their answers, not their creatures.\n`;
          coaching += `  Turn 7+: It's a card advantage game. You've likely lost if it goes this long.\n`;
          coaching += `  Key: Apply consistent pressure. Force them to answer multiple threats.\n`;
          
          coaching += `\n`;

          // MATCHUP ANALYSIS VS ALL COLOR COMBINATIONS
          coaching += `ðŸ"Š MATCHUP ANALYSIS - HOW YOU PERFORM VS ALL INK COLORS:\n`;
          coaching += `\n[RUBY MATCHUPS]\n`;
          if (primaryColorRaw === 'ruby') {
            coaching += `  VS RUBY: Mirror Match - Speed check. Who gets threats down first?\n`;
            coaching += `    Your advantage: Both playing same speed (Rush creatures)\n`;
            coaching += `    Key: Mulligan for 1-2 drops AGGRESSIVELY. First to board control wins.\n`;
            coaching += `    Tactics: Trade up (1 for 2), establish board presence by turn 3\n`;
            coaching += `    Win condition: Turn 5-6 lethal via Rush creatures\n`;
          } else if (primaryColorRaw === 'sapphire' || primaryColorRaw === 'steel') {
            coaching += `  VS RUBY: You have ADVANTAGE - Defense beats Rush.\n`;
            coaching += `    Your advantage: Blockers (Steel) + Draw (Sapphire) stabilizes\n`;
            coaching += `    Key: Keep 1-2 blockers online turns 2-3, then take over with card draw\n`;
            coaching += `    Tactics: Trade blockers for their attackers, generate value turn 4+\n`;
            coaching += `    Win condition: Stabilize early, win via card advantage turn 6+\n`;
          } else {
            coaching += `  VS RUBY: CHALLENGING - Rush creatures are fast.\n`;
            coaching += `    Your disadvantage: Slower setup vs their early pressure\n`;
            coaching += `    Key: Mulligan for early defense + stabilization\n`;
            coaching += `    Tactics: Take damage early (save life total), stabilize turn 4+\n`;
            coaching += `    Win condition: Outlast pressure, win via superior late game\n`;
          }

          coaching += `\n[SAPPHIRE MATCHUPS]\n`;
          if (primaryColorRaw === 'sapphire') {
            coaching += `  VS SAPPHIRE: Mirror Match - Card advantage war. Who draws more?\n`;
            coaching += `    Your advantage: Both drawing, so skill + threat quality matters\n`;
            coaching += `    Key: Play threats that draw cards or generate value\n`;
            coaching += `    Tactics: Leverage card draw first (turn 2-3) to get ahead\n`;
            coaching += `    Win condition: Cards advantage (hand size + board) by turn 5-6\n`;
          } else if (primaryColorRaw === 'ruby' || primaryColorRaw === 'amethyst') {
            coaching += `  VS SAPPHIRE: SLIGHT DISADVANTAGE - They out-value in long game.\n`;
            coaching += `    Your advantage: Faster tempo (your threats before their answers)\n`;
            coaching += `    Key: Kill them before card draw wins. Pressure turns 1-4 HARD.\n`;
            coaching += `    Tactics: Don't let them hit turn 5+ (they've drawn 3-4 extra cards)\n`;
            coaching += `    Win condition: Turn 5 lethal before their draw engine stabilizes\n`;
          } else {
            coaching += `  VS SAPPHIRE: SLIGHT ADVANTAGE - You can apply pressure faster.\n`;
            coaching += `    Your advantage: Setup faster than their draw engine ramps\n`;
            coaching += `    Key: Establish board early, force them to answer threats\n`;
            coaching += `    Tactics: Play 2-3 threats turn 3-4, make them use answers inefficiently\n`;
            coaching += `    Win condition: Board overwhelming before they generate answers (turn 6+)\n`;
          }

          coaching += `\n[EMERALD MATCHUPS]\n`;
          if (primaryColorRaw === 'emerald') {
            coaching += `  VS EMERALD: Mirror Match - Mana efficiency & ramp synergy.\n`;
            coaching += `    Your advantage: Both ramping, so synergy density matters\n`;
            coaching += `    Key: Build fastest value engine\n`;
            coaching += `    Tactics: Ramp early (turns 1-3), deploy threats turn 4+\n`;
            coaching += `    Win condition: Turn 5-6 overwhelming threats via mana advantage\n`;
          } else if (primaryColorRaw === 'ruby' || primaryColorRaw === 'sapphire') {
            coaching += `  VS EMERALD: SLIGHT ADVANTAGE - They're slower ramping.\n`;
            coaching += `    Your advantage: Threaten before they're ready\n`;
            coaching += `    Key: Apply early pressure (turns 1-3)\n`;
            coaching += `    Tactics: Don't let them ramp past turn 3. Kill before their mana pays off.\n`;
            coaching += `    Win condition: Turn 5-6 lethal before ramp deck explodes\n`;
          } else {
            coaching += `  VS EMERALD: SLIGHT DISADVANTAGE - Ramp is hard to race.\n`;
            coaching += `    Your advantage: You're set up consistently (no ramp variance)\n`;
            coaching += `    Key: Out-tempo their early turns before ramp advantage shows\n`;
            coaching += `    Tactics: Kill turn-1 mana creatures, apply pressure\n`;
            coaching += `    Win condition: Kill before they hit 5+ mana (turn 4-5)\n`;
          }

          coaching += `\n[STEEL MATCHUPS]\n`;
          if (primaryColorRaw === 'steel') {
            coaching += `  VS STEEL: Mirror Match - Power vs Defend. Who builds better walls?\n`;
            coaching += `    Your advantage: Both playing defense, trading efficiency matters\n`;
            coaching += `    Key: Build bigger creatures than opponent, secure board position\n`;
            coaching += `    Tactics: Trade favorably (1 for 2 power), establish board control\n`;
            coaching += `    Win condition: Turn 6+ via superior power creatures\n`;
          } else if (primaryColorRaw === 'ruby' || primaryColorRaw === 'amethyst') {
            coaching += `  VS STEEL: DISADVANTAGE - High power/Resist walls block your threats.\n`;
            coaching += `    Your challenge: Steel creatures are hard to get through\n`;
            coaching += `    Key: Go AROUND them (Evasive creatures) or kill them (limited removal)\n`;
            coaching += `    Tactics: Play Evasive threats + hand pressure to work around walls\n`;
            coaching += `    Win condition: Evasive damage + tempo (avoid trading with walls)\n`;
          } else {
            coaching += `  VS STEEL: ADVANTAGE - You can answer or out-value.\n`;
            coaching += `    Your advantage: Removal/answers are better than their raw power\n`;
            coaching += `    Key: Answer their threats, generate card advantage\n`;
            coaching += `    Tactics: Trade efficiently, then build your threats once board clear\n`;
            coaching += `    Win condition: Board control -> card advantage -> turn 6+ win\n`;
          }

          coaching += `\n[AMBER MATCHUPS]\n`;
          if (primaryColorRaw === 'amber') {
            coaching += `  VS AMBER: Mirror Match - Healing/Recovery standoff. Who deals more damage?\n`;
            coaching += `    Your advantage: Both trading efficiently, so threat quality/timing matters\n`;
            coaching += `    Key: Play threats opponents can't efficiently heal\n`;
            coaching += `    Tactics: Multiple threats (they can't answer all + heal)\n`;
            coaching += `    Win condition: Overwhelming board (turn 5+) they can't stabilize\n`;
          } else if (primaryColorRaw === 'ruby' || primaryColorRaw === 'amethyst') {
            coaching += `  VS AMBER: SLIGHT ADVANTAGE - Healing delays them, you pressure.\n`;
            coaching += `    Your advantage: You deal damage faster than they heal\n`;
            coaching += `    Key: Continue aggressive plays, don't let healing stabilize\n`;
            coaching += `    Tactics: Multiple threats = force inefficient blocks\n`;
            coaching += `    Win condition: Overwhelming damage (turns 4-6) before healing catches up\n`;
          } else {
            coaching += `  VS AMBER: SLIGHT DISADVANTAGE - Healing is hard to race.\n`;
            coaching += `    Your advantage: You can play efficient threats + stabilize too\n`;
            coaching += `    Key: Don't race healing. Generate card advantage instead.\n`;
            coaching += `    Tactics: Play threats, remove their threats, let efficiency win\n`;
            coaching += `    Win condition: Card advantage win (turn 7+ game state control)\n`;
          }

          coaching += `\n[AMETHYST MATCHUPS]\n`;
          if (primaryColorRaw === 'amethyst') {
            coaching += `  VS AMETHYST: Mirror Match - Hand disruption standoff. Who plays better?\n`;
            coaching += `    Your advantage: Same hand pressure, so threat efficiency matters\n`;
            coaching += `    Key: Play threats that block AND disrupt\n`;
            coaching += `    Tactics: Force efficient trades, hand disruption just slows both\n`;
            coaching += `    Win condition: Superior threats by turn 5-6\n`;
          } else if (primaryColorRaw === 'ruby') {
            coaching += `  VS AMETHYST: ADVANTAGE - You're faster despite hand pressure.\n`;
            coaching += `    Your advantage: Rush creatures exist before their hand discard matters\n`;
            coaching += `    Key: Play threats turn 1-2 before discard is relevant\n`;
            coaching += `    Tactics: Get board ahead before they take your hand apart\n`;
            coaching += `    Win condition: Early board control (turns 1-3) -> turn 5 lethal\n`;
          } else {
            coaching += `  VS AMETHYST: DISADVANTAGE - Hand disruption slows your plans.\n`;
            coaching += `    Your challenge: They discard your answers/threats\n`;
            coaching += `    Key: Build resilient strategies (play multiple threats turn 3+)\n`;
            coaching += `    Tactics: Don't rely on specific cards. Have multiple win paths.\n`;
            coaching += `    Win condition: Consistent pressure (not relying on single answers)\n`;
          }

          coaching += `\n`;

          // ADVANCED TRADING CARD STRATEGY
          coaching += `ðŸ"ˆ ADVANCED TRADING CARD STRATEGY & RESOURCE MANAGEMENT:\n`;
          coaching += `\nPOSITIONING STRATEGY (When to Attack vs Defend):\n`;
          coaching += `  1. BEFORE ATTACKING: Ask these questions:\n`;
          coaching += `     â€¢ Can I kill them in 2 more turns? (YES = attack with evasion/power)\n`;
          coaching += `     â€¢ Am I losing the board race? (YES = trade creatures to stabilize)\n`;
          coaching += `     â€¢ Do I have better value elsewhere? (YES = don't attack, protect your board)\n`;
          coaching += `  2. CHALLENGE RHYTHM: When to block vs not:\n`;
          coaching += `     â€¢ Block if: Their creature is bigger, or you trade up (1 for 2 value)\n`;
          coaching += `     â€¢ Don't block if: You need life total for lethal math, or you're ahead\n`;
          coaching += `     â€¢ Worst blocks: Trading 1-drop for 1-drop (equal trades rarely help)\n`;
          coaching += `  3. DAMAGE ALLOCATION: Every hit counts\n`;
          coaching += `     â€¢ Turn 1-3: Minimize creature damage (block good trades)\n`;
          coaching += `     â€¢ Turn 4+: Take hits if you have stabilization (answers/healing)\n`;
          coaching += `     â€¢ Life total = resource (manage it like ink)\n`;
          coaching += `\nTEMPO EXCHANGES (Card Advantage vs Tempo Tradeoffs):\n`;
          coaching += `  TEMPO = Speed (getting threats out fast)\n`;
          coaching += `  CARD ADVANTAGE = Quantity (more cards than opponent)\n`;
          coaching += `  1. TEMPO PLAY: Quick deployment\n`;
          coaching += `     â€¢ Example: Play 2-cost creature turn 2 vs holding for 3-cost turn 3\n`;
          coaching += `     â€¢ When it wins: You're racing (trying to kill turn 5-6)\n`;
          coaching += `     â€¢ When it loses: You're behind (they stabilize faster than you)\n`;
          coaching += `  2. CARD ADVANTAGE PLAY: Patience\n`;
          coaching += `     â€¢ Example: Play creature that draws a card (even if slower)\n`;
          coaching += `     â€¢ When it wins: Long games (turn 6+)\n`;
          coaching += `     â€¢ When it loses: Fast games (you get run over before advantage matters)\n`;
          coaching += `  3. MID-GAME TEMPO: Turns 3-4 are critical\n`;
          coaching += `     â€¢ Play 1-2 threats per turn (force multiple answers)\n`;
          coaching += `     â€¢ Bad for them: Can't answer all your threats efficiently\n`;
          coaching += `     â€¢ Good for you: Forces them to blank-turn or take damage\n`;
          coaching += `\nRESOURCE MANAGEMENT (Ink, Cards, Life Total):\n`;
          coaching += `  INK MANAGEMENT:\n`;
          coaching += `    â€¢ Early game: Play 1 ink per turn MINIMUM (keep options open)\n`;
          coaching += `    â€¢ Mid game: Accelerate inking ONLY if you have threats to play\n`;
          coaching += `    â€¢ Late game: Full inks let you play multiple threats (huge tempo swing)\n`;
          coaching += `    â€¢ DON'T over-ink early just because you can\n`;
          coaching += `  HAND SIZE:\n`;
          coaching += `    â€¢ Small hand = vulnerable. They know what you can play.\n`;
          coaching += `    â€¢ Big hand = better options, can pivot strategies\n`;
          coaching += `    â€¢ Draw creatures are MVP (create hand advantage)\n`;
          coaching += `  BOARD STATE:\n`;
          coaching += `    â€¢ Board = your tempo resource. Control it.\n`;
          coaching += `    â€¢ 1 creature ahead = advantage (trade favorably)\n`;
          coaching += `    â€¢ 2+ creatures ahead = you're winning (protect board)\n`;
          coaching += `\nMULCH/DISCARD OPTIMIZATION:\n`;
          coaching += `  â€¢ Discard cards are EFFICIENT removal (cost-effective)\n`;
          coaching += `  â€¢ Timing: Use discard when opponent has good hand (big advantage)\n`;
          coaching += `  â€¢ Targets: Remove threats that are hard to answer, or card draw creatures\n`;
          coaching += `  â€¢ When NOT to discard: If they're at high lore + about to win anyway\n`;
          coaching += `\nSYNERGY PAYOFFS (When to prioritize them):\n`;
          coaching += `  â€¢ Single synergy (1 piece): DON'T build around it\n`;
          coaching += `  â€¢ Consistent synergy (3+ pieces): YES, lean into it\n`;
          coaching += `  â€¢ Payoff creature: Play it when you have pieces online\n`;
          coaching += `  â€¢ Don't over-synergize: A 2/2 creature is still just 2/2\n`;

          coaching += `\n`;

          // GENERAL DECK-BUILDING PRINCIPLES
          coaching += `ðŸ§ GENERAL DECK-BUILDING WISDOM & PRINCIPLES:\n`;
          coaching += `\nCURVE THEORY & CONSISTENCY:\n`;
          coaching += `  MANA CURVE (Cost distribution):\n`;
          coaching += `  â€¢ Ideal distribution: 4 cost-1 | 6 cost-2 | 6 cost-3-4 | 6 cost-5+ | Rest = answers\n`;
          coaching += `  â€¢ Your average cost (${avgCost.toFixed(2)}): ${avgCost > 4.5 ? 'TOO HIGH (slow)' : avgCost < 3 ? 'TOO LOW (weak finishers)' : 'GOOD (balanced)'}\n`;
          coaching += `  â€¢ Smooth curve = consistent plays every turn\n`;
          coaching += `  â€¢ Two-humped curve = early drops + finishers (gaps in middle)\n`;
          coaching += `\nCONSISTENCY vs POWER:\n`;
          coaching += `  â€¢ CONSISTENCY = Always have a play. More 2-ofs than 1-ofs.\n`;
          coaching += `  â€¢ POWER = Each card is maximum impact. More 1-ofs (risky).\n`;
          coaching += `  â€¢ Current deck: ${singletonCount > 8 ? 'TOO MANY SINGLETONS' : 'Good consistency'} (${singletonCount} 1-ofs)\n`;
          coaching += `  â€¢ Fix: Shift duplicates from 1-of -> 2-of for better hands\n`;
          coaching += `\nTHREAT vs ANSWER RATIO:\n`;
          coaching += `  â€¢ THREATS (creatures/damage): Should be 55-60% of deck\n`;
          coaching += `  â€¢ ANSWERS (removal/stabilization): Should be 20-30%\n`;
          coaching += `  â€¢ UTILITY (draw/tutors): Should be 10-20%\n`;
          coaching += `  â€¢ Your mix: ${cardsByType.creatures.length > 40 ? 'Too many threats' : cardsByType.creatures.length < 30 ? 'Too few threats' : 'Balanced'} creatures detected\n`;
          coaching += `\nSYNERGY vs STAPLES BALANCE:\n`;
          coaching += `  â€¢ SYNERGY: Cards that work together (multiplied value)\n`;
          coaching += `  â€¢ STAPLES: Best cards universally (always good)\n`;
          coaching += `  â€¢ Balance: 60% staples + 40% synergy pieces\n`;
          coaching += `  â€¢ Mistake: Building around 1 synergy at the cost of bad cards\n`;
          coaching += `\nCARD DRAW vs THREATS SPLIT:\n`;
          coaching += `  â€¢ Draw creatures: Should be 3-6 copies (depends on archetype)\n`;
          coaching += `  â€¢ Threats: Should be 30+ copies (majority)\n`;
          coaching += `  â€¢ Answers: Should be 8-15 copies\n`;
          coaching += `  â€¢ Your breakdown: ${cardsByType.songs > 0 ? 'Has songs (check Singer ratio)' : 'No songs detected'}\n`;
          coaching += `\nMULLIGAN PATTERNS FOR THIS DECK:\n`;
          coaching += `  â€¢ KEEP (Good hand): Turn-1 creature + 2-drop + land\n`;
          coaching += `  â€¢ MULLIGAN (Weak hand): No creatures OR all spells OR all high-cost\n`;
          coaching += `  â€¢ Specific to YOU (${primaryColor}/${secondaryColor}):\n`;
          if (primaryColorRaw === 'ruby') {
            coaching += `    - KEEP: 1-cost Rush creature (Moana/Rapunzel) + any 2-drop\n`;
            coaching += `    - MULLIGAN: No 1-drops, or only high-cost creatures\n`;
          } else if (primaryColorRaw === 'sapphire') {
            coaching += `    - KEEP: Draw creature (Elsa/Olaf) + blocker or threat\n`;
            coaching += `    - MULLIGAN: No draw creatures, hand looks weak\n`;
          } else if (primaryColorRaw === 'emerald') {
            coaching += `    - KEEP: Ramp creature (cost 1-2 mana generator) + follows\n`;
            coaching += `    - MULLIGAN: No ramp, all high-cost, looks slow\n`;
          } else {
            coaching += `    - KEEP: Curve + any good starter\n`;
            coaching += `    - MULLIGAN: Weak openings, missing curve\n`;
          }
          coaching += `\nCARD SELECTION PRINCIPLES:\n`;
          coaching += `  â€¢ NEVER: Include a card just because it's 'good'\n`;
          coaching += `  â€¢ ALWAYS: Ask 'Does this card fit my strategy?'\n`;
          coaching += `  â€¢ SYNERGY TEST: Does this card trigger synergy or get triggered?\n`;
          coaching += `  â€¢ SLOT OPPORTUNITY COST: Is this better than the 60th-best card?\n`;
          coaching += `  â€¢ Example: A 3/3 creature is average. Only include if it does something extra.\n`;
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
          
          setAiCoaching(coaching);
        }} disabled={!analysis}>Get AI Coaching</button>
      </div>

      {analysis && (
        <div style={{ marginTop: "1rem" }}>
          {analysis.error ? (
            <p style={{ color: "red" }}>{analysis.error}</p>
          ) : (
            <div>
              <p><strong>Total Cards:</strong> {analysis.total}</p>
              <p><strong>Unique Cards:</strong> {analysis.uniqueCount}</p>
              <p><strong>Archetype:</strong> {analysis.archetype}</p>
              <p>{analysis.notes}</p>

              <h3>Card Breakdown</h3>
              <ul>
                {Object.entries(analysis.cards).map(([name, count]) => (
                  <li key={name}>{count}x — {name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {aiCoaching && (
        <div style={{ marginTop: 12 }}>
          <h3>AI Coaching</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{aiCoaching}</pre>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <h3>Saved Decks (local)</h3>
        {saved.length === 0 ? (
          <div>No saved decks.</div>
        ) : (
          saved.map(s => (
            <div key={s.id} style={{ padding: 8, border: '1px solid #eee', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{s.name}</strong>
                  <div style={{ fontSize: 12, color: '#666' }}>{new Date(s.createdAt).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleLoad(s)}>Load</button>
                  <button onClick={() => handleDelete(s.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
