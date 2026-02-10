import { useState, useEffect } from "react";
import { analyzeDeck } from "./logic/deckAnalyzer";
import strategyGuides from "./data/strategyGuides.json";
import cardMeta from "./data/cardMeta.json";
import coreConstructedData from "./data/coreConstructed.json";
import cardSetsData from "./data/cardSets.json";

export default function App() {
  const [deckText, setDeckText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [saved, setSaved] = useState([]);
  const [serverEnabled, setServerEnabled] = useState(false);
  const [aiCoaching, setAiCoaching] = useState('');
  const [playStyle, setPlayStyle] = useState('balanced');
  const [format, setFormat] = useState('infinity');

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("lorcana_saved_decks") || "[]");
      setSaved(s);
    } catch (e) {
      setSaved([]);
    }
    if (serverEnabled) {
      fetch((import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/api/decks').then(r => r.json()).then(d => setSaved(d)).catch(() => { })
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
        .then(r => r.json()).then(savedItem => { setSaved(prev => [savedItem, ...prev]); alert('Saved to server') }).catch(() => alert('Server save failed'))
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
      fetch(`${apiUrl}/api/decks`).then(r => r.json()).then(d => { const next = d.filter(x => x.id !== id); setSaved(next) }).catch(() => { })
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
    a.download = 'inkweaver-analysis.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "'Inter', 'Segoe UI', sans-serif", minHeight: '100vh' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1rem',
        background: 'rgba(139, 92, 246, 0.1)',
        borderRadius: '12px',
        border: '2px solid rgba(251, 191, 36, 0.3)',
        boxShadow: '0 8px 32px rgba(139, 92, 246, 0.2)'
      }}>
        <img src="/inkweaver.png" alt="Inkweaver" style={{
          height: '120px',
          filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.6))'
        }} />
        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>Inkweaver</h1>
      </div>

      <textarea
        rows={10}
        style={{
          width: "100%",
          marginBottom: "1rem",
          fontSize: '1rem',
          fontFamily: 'monospace'
        }}
        placeholder="✨ Paste your decklist here and let the magic begin..."
        value={deckText}
        onChange={(e) => setDeckText(e.target.value)}
      />

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleAnalyze}>Analyze Deck</button>
        <button onClick={handleSave} disabled={!analysis}>Save Deck</button>
        <button onClick={handleDownload} disabled={!analysis}>Download Analysis</button>
        <label style={{ marginLeft: 8 }}><input type="checkbox" checked={serverEnabled} onChange={e => setServerEnabled(e.target.checked)} /> Use server</label>
        <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
          <label style={{ fontWeight: 'bold', alignItems: 'center', display: 'flex' }}>Format:</label>
          <button
            onClick={() => setFormat('infinity')}
            style={{
              padding: '6px 12px',
              background: format === 'infinity' ? 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)' : 'rgba(139, 92, 246, 0.3)',
              border: format === 'infinity' ? '2px solid #fbbf24' : '2px solid rgba(139, 92, 246, 0.5)',
              color: '#fff',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: format === 'infinity' ? 'bold' : 'normal'
            }}
          >
            Infinity
          </button>
          <button
            onClick={() => setFormat('core')}
            style={{
              padding: '6px 12px',
              background: format === 'core' ? 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)' : 'rgba(139, 92, 246, 0.3)',
              border: format === 'core' ? '2px solid #fbbf24' : '2px solid rgba(139, 92, 246, 0.5)',
              color: '#fff',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: format === 'core' ? 'bold' : 'normal'
            }}
          >
            Core Constructed
          </button>
        </div>
        <select value={playStyle} onChange={(e) => setPlayStyle(e.target.value)} disabled={!analysis} style={{ padding: 4, marginLeft: 8 }}>
          <option value="aggro">Aggro (Fast Win)</option>
          <option value="midrange">Midrange (Balanced)</option>
          <option value="control">Control (Late Game)</option>
          <option value="balanced">Balanced Analysis</option>
        </select>
        <button onClick={() => {
          if (!analysis) {
            setAiCoaching('No analysis provided; run analyzer first.');
            return;
          }
          const avgCost = parseFloat(analysis.avgCost) || 4;
          const cardCount = analysis.total || 0;
          const colorCount = Object.keys(analysis.inkColors || {}).length;
          const songs = analysis.songCount || 0;
          const cards = analysis.cards || {};

          let coaching = `Hey! Let's dive into your deck and see what we're working with!\n`;
          coaching += `You're going for a ${playStyle.toUpperCase()} style - nice choice!\n`;
          coaching += `Format: ${format === 'infinity' ? '∞ Infinity (All Cards)' : '📋 Core Constructed (Sets 5-11 Legal)'}\n`;

          if (format === 'core') {
            coaching += `⚠️  All card suggestions below are from SETS 5-11 ONLY. If you see cards not in these sets, they are NOT legal for Core Constructed!\n`;
            coaching += `If the meta has changed and different sets are now legal, update the legal sets list in the system.\n`;
          } else {
            coaching += `All cards from the full card pool are available for suggestions.\n`;
          }
          coaching += `\n`;

          // Deck Composition Check
          coaching += `📊 First Things First - Let's Check Your Deck:\n`;
          coaching += `Total Cards: ${cardCount}/60 ${cardCount !== 60 ? '(Hey, you need exactly 60 cards!)' : '(Perfect! ✓)'}\n`;
          coaching += `Unique Cards: ${analysis.uniqueCount}\n`;
          coaching += `Average Cost: ${avgCost.toFixed(2)}\n`;
          coaching += `Ink Colors: ${colorCount}\n`;
          coaching += `Songs: ${songs}\n`;

          // Format legality check for Core Constructed using set-based validation
          if (format === 'core') {
            const legalSets = new Set(coreConstructedData.legalSets); // Sets 5-11
            const coreConstructedCardSet = new Set(coreConstructedData.legalCards.map(c => c.toLowerCase()));
            const cardSetMapping = cardSetsData.cardSetMapping;

            // Helper function to normalize card names for matching
            // Removes dashes, extra spaces, punctuation to handle API format differences
            const normalizeName = (name) => {
              return name.toLowerCase()
                .replace(/\s*-\s*/g, ' ')  // Replace dashes with spaces
                .replace(/[^\w\s]/g, '')   // Remove punctuation except spaces
                .replace(/\s+/g, ' ')      // Normalize multiple spaces
                .trim();
            };

            // Build a normalized lookup map for fuzzy matching
            const normalizedCardSetMapping = {};
            Object.entries(cardSetMapping).forEach(([apiName, sets]) => {
              const normalized = normalizeName(apiName);
              // For each card, check if ANY set is legal (5-11)
              // If so, mark it as legal in the normalized map
              const hasLegalSet = Array.isArray(sets) ? sets.some(s => legalSets.has(s)) : legalSets.has(sets);

              if (!normalizedCardSetMapping[normalized] || hasLegalSet) {
                // Prefer sets that have a legal version
                normalizedCardSetMapping[normalized] = {
                  sets: Array.isArray(sets) ? sets : [sets],
                  isLegal: hasLegalSet
                };
              }
            });

            let legalCards = [];
            let illegalCards = [];
            let unknownCards = [];

            Object.entries(cards).forEach(([name, count]) => {
              const nameLower = name.toLowerCase();
              const normalizedName = normalizeName(name);

              // Try exact match first
              let cardInfo = null;
              const exactSets = cardSetMapping[nameLower];

              if (exactSets !== undefined) {
                // Check if ANY set is legal
                const hasLegalSet = Array.isArray(exactSets) ?
                  exactSets.some(s => legalSets.has(s)) :
                  legalSets.has(exactSets);

                cardInfo = {
                  sets: Array.isArray(exactSets) ? exactSets : [exactSets],
                  isLegal: hasLegalSet
                };
              }

              // If no exact match, try normalized match
              if (cardInfo === null) {
                cardInfo = normalizedCardSetMapping[normalizedName];
              }

              if (cardInfo) {
                if (cardInfo.isLegal) {
                  legalCards.push({ name, count });
                } else {
                  // Card has reprints, but none in legal sets
                  const setsList = cardInfo.sets.join(', ');
                  illegalCards.push(`${count}x ${name} (from Set${cardInfo.sets.length > 1 ? 's' : ''} ${setsList})`);
                }
              }
            });

            if (illegalCards.length > 0) {
              coaching += `\n❌ ILLEGAL FOR CORE CONSTRUCTED:\n`;
              coaching += `These cards are from earlier sets (1-4):\n`;
              illegalCards.forEach(card => {
                coaching += `  • ${card}\n`;
              });
              coaching += `Remove these cards immediately!\n`;
            }

            if (unknownCards.length === 0 && illegalCards.length === 0) {
              coaching += `\n✅ ALL CARDS ARE LEGAL FOR CORE CONSTRUCTED!\n`;
            }
          }

          coaching += `\n`;

          // Playstyle-Specific Suggestions
          coaching += `🎯 Okay, Let's Talk ${playStyle.charAt(0).toUpperCase() + playStyle.slice(1)} Strategy:\n`;
          const aggGuide = strategyGuides.playstyleGuides.aggro;
          const controlGuide = strategyGuides.playstyleGuides.control;
          const midGuide = strategyGuides.playstyleGuides.midrange;

          if (playStyle === 'aggro' || playStyle === 'balanced') {
            if (avgCost > 4) {
              coaching += `So your average cost is a bit high at ${avgCost.toFixed(2)}. ${aggGuide.curveAdjustment}\n`;
              coaching += `Try swapping some high-cost cards for cheaper 2-cost creatures to get early pressure going.\n`;
            }
            if (cardCount < 60) {
              coaching += `You're ${60 - cardCount} cards short! Fill those slots with efficient low-cost creatures.\n`;
            }
            coaching += `${aggGuide.goal} ${aggGuide.strategy}\n`;
            coaching += `For your starting hand, ${aggGuide.mulligan}\n\n`;
          }
          if (playStyle === 'control' || playStyle === 'balanced') {
            if (avgCost < 4) {
              coaching += `Your average cost is pretty low at ${avgCost.toFixed(2)}. ${controlGuide.curveAdjustment}\n`;
              coaching += `Consider swapping some low-cost creatures for board wipes or high-impact threats.\n`;
            }
            coaching += `${controlGuide.goal} ${controlGuide.strategy}\n`;
            coaching += `When starting out, ${controlGuide.mulligan}\n\n`;
          }
          if (playStyle === 'midrange' || playStyle === 'balanced') {
            if (avgCost >= 4 && avgCost <= 4.5) {
              coaching += `Nice! Your average cost is balanced at ${avgCost.toFixed(2)} - perfect for midrange!\n`;
            } else if (avgCost < 4) {
              coaching += `Your average cost is on the low side at ${avgCost.toFixed(2)}. ${midGuide.curveAdjustment}\n`;
            } else {
              coaching += `Your average cost is running high at ${avgCost.toFixed(2)}. ${midGuide.curveAdjustment}\n`;
            }
            coaching += `${midGuide.goal} ${midGuide.strategy}\n`;
            coaching += `Opening hand tip: ${midGuide.mulligan}\n\n`;
          }

          // TAILORED MULLIGAN ENGINE (Based on actual deck cards)
          coaching += `⏱️ Let's Talk Game Plan - Your Mulligan & Turn-by-Turn Guide:\n`;

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
          coaching += `📊 What to Keep and What to Toss:\n`;
          coaching += `You'll want to keep hands with:\n`;

          if (costOne.length > 0) {
            const examples = costOne.slice(0, 2).map(c => c.name).join(', ');
            coaching += `  ✓ Early plays like ${examples}\n`;
          }
          if (costTwo.length > 0) {
            const examples = costTwo.slice(0, 2).map(c => c.name).join(', ');
            coaching += `  ✓ Turn 2 options like ${examples}\n`;
          }
          if (costThreeFour.length > 0) {
            const examples = costThreeFour.slice(0, 1).map(c => c.name).join(', ');
            coaching += `  ✓ Mid-game plays like ${examples}\n`;
          }

          coaching += `\nDefinitely mulligan away:\n`;

          // Find cards to mulligan away
          const highCostCards = costFivePlus.slice(0, 3).map(c => c.name).join(', ');
          if (highCostCards) {
            coaching += `  Hands full of expensive stuff like: ${highCostCards}\n`;
          }

          const mulliganDuplicates = Object.entries(deckCards).filter(([_, count]) => count >= 3).slice(0, 2).map(([name]) => name).join(', ');
          if (mulliganDuplicates) {
            coaching += `  Too many copies of the same card: ${mulliganDuplicates}\n`;
          }

          const allSpells = cardsByType.spells.slice(0, 2).map(c => c.name).join(', ');
          if (allSpells && cardsByType.creatures.length > 15) {
            coaching += `  Hands with no creatures, just spells like: ${allSpells}\n`;
          }

          coaching += `\n`;

          // TURN-BY-TURN GAMEPLAY based on actual deck composition
          coaching += `🎯 Here's How Your Games Should Play Out:\n`;

          if (costOne.length > 0) {
            const t1Card = costOne[0].name;
            coaching += `Turn 1: Drop ${t1Card} to start building your board. Get your ink ready for turn 2.\n`;
          } else {
            coaching += `Turn 1: You might have to pass or play anything cheap you've got. Just start building safely.\n`;
          }

          if (costTwo.length > 0) {
            const t2Card = costTwo[0].name;
            coaching += `Turn 2: Add ink and play ${t2Card}. `;
            if (playStyle === 'control') {
              coaching += `Be ready to challenge if they're threatening you.\n`;
            } else {
              coaching += `Keep the pressure going!\n`;
            }
          } else {
            coaching += `Turn 2: Add ink and keep developing your board. Play your best creature.\n`;
          }

          if (costThreeFour.length > 0) {
            const t34Card = costThreeFour[0].name;
            coaching += `Turns 3-4: Add ink and play stuff like ${t34Card}. Make smart trades to get the most value.\n`;
          } else {
            coaching += `Turns 3-4: Add ink and focus on good trades. Balance speed vs card advantage.\n`;
          }

          if (costFivePlus.length > 0) {
            const finisher = costFivePlus[0].name;
            coaching += `Turn 5+: Time for ${finisher}! `;
            if (playStyle === 'aggro') {
              coaching += `Go for the win. Control the board and finish them off!\n`;
            } else if (playStyle === 'control') {
              coaching += `Stabilize the board and lock things down until you can take over.\n`;
            } else {
              coaching += `Ask yourself: Am I the aggressor here? If yes, push damage. If no, play defense.\n`;
            }
          } else {
            coaching += `Turn 5+: Deploy your strongest cards. Lock down the board and close out the game.\n`;
          }

          coaching += `\n`;

          // TAILORED CARD RECOMMENDATIONS (Based on actual deck cards)
          coaching += `🔄 Let's Look at Your Deck Tuning:\n`;
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

          // Filter out any invalid color keys (like 'true' from boolean ink values)
          const validColorKeys = Object.keys(inks).filter(k => typeof k === 'string' && k !== 'true' && colorMap[k]);
          const colorKeys = validColorKeys.sort((a, b) => inks[b] - inks[a]).slice(0, 2); // Max 2 colors
          const primaryColorRaw = colorKeys[0] || 'None';
          const secondaryColorRaw = colorKeys[1] || 'None';

          const primaryColor = colorMap[primaryColorRaw] || primaryColorRaw;
          const secondaryColor = colorMap[secondaryColorRaw] || secondaryColorRaw;

          coaching += `Your main ink is ${primaryColor} with ${inks[primaryColorRaw] || 0} cards\n`;
          if (secondaryColor !== 'None') {
            coaching += `Your secondary ink is ${secondaryColor} with ${inks[secondaryColorRaw] || 0} cards\n`;
          }
          coaching += `\n`;

          const styleKey = playStyle === 'balanced' ? 'midrange' : playStyle;

          // ANALYZE WHAT'S MISSING FROM THE DECK
          coaching += `📋 Your Curve Breakdown:\n`;
          coaching += `  Cost 1: ${costOne.length} card${costOne.length !== 1 ? 's' : ''} (${costOne.map(c => c.name).join(', ') || 'YOU NEED SOME!'})\n`;
          coaching += `  Cost 2: ${costTwo.length} card${costTwo.length !== 1 ? 's' : ''} (${costTwo.map(c => c.name).join(', ') || 'YOU NEED SOME!'})\n`;
          coaching += `  Cost 3-4: ${costThreeFour.length} cards\n`;
          coaching += `  Cost 5+: ${costFivePlus.length} cards (your finishers)\n\n`;

          // Identify curve gaps
          coaching += `Okay, here's what needs work:\n`;

          // Helper function to find cards by criteria
          const findCardsByCriteria = (cost, colors, keywords = [], limit = 4, formatType = 'infinity') => {
            const colorArray = [colors].flat();
            const legalSets = new Set(coreConstructedData.legalSets);
            const coreConstructedCards = new Set(coreConstructedData.legalCards.map(c => c.toLowerCase()));
            const cardSetMapping = cardSetsData.cardSetMapping;

            // Helper to normalize names for matching
            const normalizeName = (name) => {
              return name.toLowerCase()
                .replace(/\s*-\s*/g, ' ')
                .replace(/[^\w\s]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            };

            // Build normalized lookup - check if ANY set is legal (for reprints)
            const normalizedCardSetMapping = {};
            Object.entries(cardSetMapping).forEach(([apiName, sets]) => {
              const normalized = normalizeName(apiName);
              const setArray = Array.isArray(sets) ? sets : [sets];
              const hasLegalSet = setArray.some(s => legalSets.has(s));

              if (!normalizedCardSetMapping[normalized] || hasLegalSet) {
                normalizedCardSetMapping[normalized] = {
                  sets: setArray,
                  isLegal: hasLegalSet
                };
              }
            });

            return Object.entries(cardMeta)
              .filter(([name, meta]) => {
                // Format legality check using set-based validation with reprint support
                if (formatType === 'core') {
                  const nameLower = name.toLowerCase();
                  const normalizedName = normalizeName(name);

                  // Try both exact and normalized matching
                  let cardInfo = null;
                  const exactSets = cardSetMapping[nameLower];

                  if (exactSets !== undefined) {
                    const setArray = Array.isArray(exactSets) ? exactSets : [exactSets];
                    const hasLegalSet = setArray.some(s => legalSets.has(s));
                    cardInfo = { sets: setArray, isLegal: hasLegalSet };
                  } else {
                    cardInfo = normalizedCardSetMapping[normalizedName];
                  }

                  if (cardInfo) {
                    if (!cardInfo.isLegal) return false;
                  } else if (!coreConstructedCards.has(nameLower)) {
                    return false;
                  }
                }

                if (meta.cost !== cost) return false;
                if (!meta.ink || typeof meta.ink !== 'string') return false;
                const cardColor = meta.ink.toLowerCase();
                const hasColor = colorArray.some(c => cardColor === c.toLowerCase());
                if (!hasColor) return false;
                if (keywords.length > 0 && meta.keywords) {
                  const cardKeywords = Array.isArray(meta.keywords) ? meta.keywords : [meta.keywords];
                  const hasKeyword = keywords.some(k => cardKeywords.some(ck => ck.toLowerCase().includes(k.toLowerCase())));
                  if (!hasKeyword) return false;
                }
                return true;
              })
              .slice(0, limit)
              .map(([name]) => name);
          };

          if (costOne.length === 0) {
            coaching += `  Uh oh - you don't have any 1-cost creatures!\n`;
            const suggestions = findCardsByCriteria(1, [primaryColorRaw, secondaryColorRaw].filter(c => c !== 'None'), [], 4, format);
            if (suggestions.length > 0) {
              coaching += `  Try adding: 2x ${suggestions[0]}${suggestions[1] ? `, 2x ${suggestions[1]}` : ''}${suggestions[2] ? `, or 2x ${suggestions[2]}` : ''}\n`;
            } else {
              coaching += `  Add 2-4 one-drops for early board presence.\n`;
            }
          } else if (costOne.length < 4) {
            coaching += `  You could use more 1-cost creatures (shoot for 4-6 total).\n`;
            const suggestions = findCardsByCriteria(1, [primaryColorRaw, secondaryColorRaw].filter(c => c !== 'None'), [], 4, format);
            if (suggestions.length > 0) {
              coaching += `  Consider adding: 2x ${suggestions[0]}${suggestions[1] ? ` or 2x ${suggestions[1]}` : ''}\n`;
            }
          }

          if (costTwo.length === 0) {
            coaching += `  Yikes - no 2-cost creatures either!\n`;
            const suggestions = findCardsByCriteria(2, [primaryColorRaw, secondaryColorRaw].filter(c => c !== 'None'), [], 4, format);
            if (suggestions.length > 0) {
              coaching += `  Try adding: 2x ${suggestions[0]}${suggestions[1] ? `, 2x ${suggestions[1]}` : ''}${suggestions[2] ? `, or 2x ${suggestions[2]}` : ''}\n`;
            } else {
              coaching += `  You really need 2-4 two-drops for turn-2 plays.\n`;
            }
          } else if (costTwo.length < 4) {
            coaching += `  Add a few more 2-cost creatures (aim for 4-6 total).\n`;
            const suggestions = findCardsByCriteria(2, [primaryColorRaw, secondaryColorRaw].filter(c => c !== 'None'), [], 4, format);
            if (suggestions.length > 0) {
              coaching += `  Consider: 2x ${suggestions[0]}${suggestions[1] ? ` or 2x ${suggestions[1]}` : ''}\n`;
            }
          }

          if (costThreeFour.length < 6) {
            coaching += `  You need more mid-cost cards (cost 3-4) to fill out turns 3-4.\n`;
            const suggestions3 = findCardsByCriteria(3, [primaryColorRaw, secondaryColorRaw].filter(c => c !== 'None'), [], 2, format);
            const suggestions4 = findCardsByCriteria(4, [primaryColorRaw, secondaryColorRaw].filter(c => c !== 'None'), [], 2, format);
            if (suggestions3.length > 0 || suggestions4.length > 0) {
              coaching += `  Try adding:`;
              if (suggestions3[0]) coaching += ` 2x ${suggestions3[0]}`;
              if (suggestions4[0]) coaching += `${suggestions3[0] ? ',' : ''} 2x ${suggestions4[0]}`;
              coaching += `\n`;
            }
          }

          if (costFivePlus.length === 0) {
            coaching += `  Hey, where are your finishers?\n`;
            const suggestions5 = findCardsByCriteria(5, [primaryColorRaw, secondaryColorRaw].filter(c => c !== 'None'), [], 2, format);
            const suggestions6 = findCardsByCriteria(6, [primaryColorRaw, secondaryColorRaw].filter(c => c !== 'None'), [], 2, format);
            if (suggestions5.length > 0 || suggestions6.length > 0) {
              coaching += `  Add some game-enders: 2x ${suggestions5[0] || suggestions6[0]}${(suggestions5[1] || suggestions6[1]) ? `, 2x ${suggestions5[1] || suggestions6[1]}` : ''}\n`;
            } else {
              coaching += `  Add 4-6 big creatures (cost 5+) to close out games!\n`;
            }
          } else if (costFivePlus.length < 3) {
            coaching += `  You need more finishers (cost 5+) - aim for 4-6 total.\n`;
            const suggestions = findCardsByCriteria(5, [primaryColorRaw, secondaryColorRaw].filter(c => c !== 'None'), [], 4, format);
            if (suggestions.length > 0) {
              coaching += `  Try: 2x ${suggestions[0]}${suggestions[1] ? ` or 2x ${suggestions[1]}` : ''}\n`;
            }
          }

          // Format note for card suggestions
          if (format === 'core') {
            coaching += `\n📌 NOTE: All suggestions above are LIMITED to Sets 5-11 only (Core Constructed legal).\n`;
            coaching += `If you don't see suggestions for a certain cost/color, those cards may not be legal in Core format.\n`;
          }

          coaching += `\n`;

          // TYPE MIX ANALYSIS
          if (cardsByType.creatures.length > 0) {
            coaching += `📊 Here's what you're running:\n`;
            coaching += `Creatures: ${cardsByType.creatures.length} total\n`;
          }
          if (cardsByType.spells.length > 0) {
            coaching += `  Spells: ${cardsByType.spells.length} (${cardsByType.spells.map(s => s.name).join(', ')})\n`;
          }
          if (cardsByType.items.length > 0) {
            coaching += `  Items: ${cardsByType.items.length} (${cardsByType.items.map(i => i.name).join(', ')})\n`;
          }
          if (cardsByType.songs.length > 0) {
            coaching += `  Songs: ${cardsByType.songs.length} (${cardsByType.songs.map(s => s.name).join(', ')}) - Make sure you've got singers!\n`;
          }
          coaching += `\n`;

          // SPECIFIC CARDS TO CONSIDER REMOVING (FORMAT-AWARE)
          coaching += `🗑️ Cards You Might Want to Cut:\n`;

          // Check which cards are illegal in Core format
          const coreConstructedCardSet = new Set(coreConstructedData.legalCards.map(c => c.toLowerCase()));
          const illegalInCore = format === 'core'
            ? Object.entries(cards).filter(([name]) => !coreConstructedCardSet.has(name.toLowerCase()))
            : [];

          if (format === 'core' && illegalInCore.length > 0) {
            coaching += `  🚫 ILLEGAL IN CORE CONSTRUCTED (Priority cuts):\n`;
            illegalInCore.forEach(([name, count]) => {
              coaching += `    • Cut ${count}x ${name} (NOT in Sets 5-11)\n`;
            });
            coaching += `\n`;
          }

          const duplicates = Object.entries(cards)
            .filter(([_, count]) => count >= 3)
            .filter(([name]) => format !== 'core' || coreConstructedCardSet.has(name.toLowerCase()))
            .slice(0, 3);

          if (duplicates.length > 0) {
            coaching += `  📋 ${format === 'core' ? 'Legal' : 'General'} duplicates to reduce:\n`;
            duplicates.forEach(([name, count]) => {
              coaching += `    • Cut ${Math.floor(count / 2)}x ${name} (currently ${count}x, reduce to ${count - Math.floor(count / 2)}x)\n`;
            });
          }

          const singletons = Object.entries(cards)
            .filter(([_, count]) => count === 1)
            .filter(([name]) => format !== 'core' || coreConstructedCardSet.has(name.toLowerCase()))
            .slice(0, 4);

          if (singletons.length > 4) {
            coaching += `  You've got ${singletons.length} one-ofs. That's a lot!\n`;
            coaching += `  Cut these ${format === 'core' ? 'legal' : ''} singletons: ${singletons.slice(0, 3).map(([name]) => `1x ${name}`).join(', ')}\n`;
          }

          if (costFivePlus.length > 8) {
            const expensiveToCut = costFivePlus
              .filter(c => format !== 'core' || coreConstructedCardSet.has(c.name.toLowerCase()))
              .slice(-3)
              .map(c => c.name);
            if (expensiveToCut.length > 0) {
              coaching += `  Too many expensive ${format === 'core' ? 'legal' : ''} cards. Cut: ${expensiveToCut.map(n => `1x ${n}`).join(', ')}\n`;
            }
          }
          coaching += `\n`;

          // FORMAT-SPECIFIC CARD SWAP RECOMMENDATIONS
          coaching += `🔄 CARD SWAP RECOMMENDATIONS (${format === 'infinity' ? '∞ INFINITY FORMAT' : '📋 CORE CONSTRUCTED (Sets 5-11)'}):\n`;
          if (format === 'core') {
            coaching += `These suggestions are ONLY from Sets 5-11. If better cards exist in other sets, they won't be suggested here.\n`;
            coaching += `If your deck has illegal cards, remove them first (shown above in priority cuts).\n`;
          } else {
            coaching += `These suggestions use the FULL card pool. All cards from all sets are available.\n`;
          }
          coaching += `\n`;

          // COLOR-SPECIFIC RECOMMENDATIONS
          coaching += `✨ Let's Boost Your ${primaryColor} Deck:\n`;
          if (primaryColorRaw === 'ruby') {
            coaching += `  You want Rush creatures (they attack right away!) and Evasive threats.\n`;
            const rushCards = findCardsByCriteria(2, 'ruby', ['rush'], 3, format);
            const evasiveCards = findCardsByCriteria(3, 'ruby', ['evasive'], 2, format);
            if (rushCards.length > 0) {
              coaching += `  Rush creatures to add: ${rushCards.map(c => `2x ${c}`).join(', ')}\n`;
            }
            if (evasiveCards.length > 0) {
              coaching += `  Evasive threats: ${evasiveCards.map(c => `2x ${c}`).join(', ')}\n`;
            }
            if (playStyle === 'aggro') {
              coaching += `  Opening hand tip: You really want a 1-drop AND a 2-drop in your starting hand.\n`;
            }
          } else if (primaryColorRaw === 'amber') {
            coaching += `  You want healing effects, board control, and stabilization cards.\n`;
            const healCards = findCardsByCriteria(3, 'amber', [], 3, format);
            if (healCards.length > 0) {
              coaching += `  Healing/defensive cards: ${healCards.map(c => `2x ${c}`).join(', ')}\n`;
            }
            if (playStyle === 'control') {
              coaching += `  Opening hand tip: You want early defenders or draw engines.\n`;
            }
          } else if (primaryColorRaw === 'sapphire') {
            coaching += `  You want card draw, resource generation, and tempo threats.\n`;
            const drawCards = findCardsByCriteria(2, 'sapphire', [], 3, format);
            if (drawCards.length > 0) {
              coaching += `  Draw creatures to add: ${drawCards.map(c => `2x ${c}`).join(', ')}\n`;
            }
            if (playStyle === 'control') {
              coaching += `  Opening hand tip: Get those draw engines going early!\n`;
            }
          } else if (primaryColorRaw === 'emerald') {
            coaching += `  You want ramp creatures, mana acceleration, and efficient threats.\n`;
            const rampCards = findCardsByCriteria(2, 'emerald', [], 3, format);
            if (rampCards.length > 0) {
              coaching += `  Ramp creatures: ${rampCards.map(c => `2x ${c}`).join(', ')}\n`;
            }
            if (playStyle === 'aggro') {
              coaching += `  Opening hand tip: 1-drop ramp can lead to explosive plays!\n`;
            }
          } else if (primaryColorRaw === 'steel') {
            coaching += `  You want high-power creatures with defensive keywords.\n`;
            const resistCards = findCardsByCriteria(4, 'steel', ['resist'], 3, format);
            if (resistCards.length > 0) {
              coaching += `  Resist creatures: ${resistCards.map(c => `2x ${c}`).join(', ')}\n`;
            } else {
              const powerCards = findCardsByCriteria(4, 'steel', [], 3, format);
              if (powerCards.length > 0) {
                coaching += `  Solid Steel creatures: ${powerCards.map(c => `2x ${c}`).join(', ')}\n`;
              }
            }
          }

          if (secondaryColor !== 'None') {
            coaching += `\n🌟 And for Your ${secondaryColor} Support:\n`;
            const secColor = secondaryColorRaw.toLowerCase();
            const supportCards = findCardsByCriteria(3, secColor, [], 2);
            if (supportCards.length > 0) {
              coaching += `  ${secondaryColor} cards to consider: ${supportCards.map(c => `2x ${c}`).join(', ')}\n`;
            }
            if (secondaryColorRaw === 'sapphire') {
              coaching += `  Focus on draw and card advantage creatures to support your ${primaryColor} cards.\n`;
            } else if (secondaryColorRaw === 'emerald') {
              coaching += `  Focus on ramp and mana creatures for those explosive turns!\n`;
            } else if (secondaryColorRaw === 'ruby') {
              coaching += `  Focus on aggressive damage threats to keep up the pressure.\n`;
            } else if (secondaryColorRaw === 'amber') {
              coaching += `  Focus on healing and recovery for more staying power.\n`;
            } else if (secondaryColorRaw === 'steel') {
              coaching += `  Focus on high-power creatures for late game dominance.\n`;
            }
          }
          coaching += `\n`;

          // TACTICAL STRATEGY SECTION
          coaching += `🎮 Smart Plays to Win More Games:\n`;
          const beatdownGuide = strategyGuides.intermediateTips.whoIsTheBeatdown;
          const tempoGuide = strategyGuides.intermediateTips.tempoPlays;
          coaching += `  1. Figure out who's the aggressor: ${beatdownGuide.description}\n`;
          if (playStyle === 'aggro') {
            coaching += `     You're usually pushing damage, so quest aggressively and finish before they stabilize!\n`;
          } else if (playStyle === 'control') {
            coaching += `     You're usually playing defense, so challenge smartly and buy time for your answers.\n`;
          } else {
            coaching += `     It changes every game - ask yourself this question every turn!\n`;
          }
          coaching += `\n`;
          coaching += ` 2. Tempo vs Card Advantage\n`;
          coaching += `     Tempo means using your resources efficiently and staying ahead on board.\n`;
          coaching += `     Card Advantage means drawing more cards than your opponent (hand size matters!).\n`;
          coaching += `     The best decks do both - control the pace AND have more cards.\n`;
          coaching += `     Timing tip: Use removal before their synergies can trigger.\n\n`;
          coaching += `  3. Stay on Curve\n`;
          coaching += `     Plan ahead: 1-drop turn 1, 2-drop turn 2, you get the idea.\n`;
          coaching += `     Don't waste your ink early just because you can.\n`;
          coaching += `     Save some ink for curve plays later.\n\n`;

          if (primaryColor === 'Ruby' || primaryColor === 'Steel') {
            coaching += `  4. Watch out for removal! (${primaryColor} decks get targeted)\n`;
            if (primaryColor === 'Ruby') {
              coaching += `     Be ready for Be Prepared (board wipe at 7 ink) and Dragon Fire (everyone runs this).\n`;
            } else {
              coaching += `     Be ready for Grab Your Sword, Smash, and Fire the Cannons.\n`;
            }
            coaching += `     Pro tip: Don't play all your weak creatures at once. Bait removal, THEN drop your threats.\n\n`;
          }

          coaching += `  5. Trade Smart\n`;
          coaching += `     Always trade your 1-cost for their 2-cost (you come out ahead!).\n`;
          coaching += `     Avoid equal trades unless you're already winning.\n`;
          coaching += `     Try to remove their most valuable creatures when possible.\n\n`;

          // DETAILED DECK ISSUES & SPECIFIC FIXES
          coaching += `📋 Let's Get Into the Details:\n`;
          const cardsList = Object.entries(cards);
          const avgCardCost = analysis.avgCost ? parseFloat(analysis.avgCost) : 4;
          const singletonCount = cardsList.filter(([_, count]) => count === 1).length;
          const threeOfCount = cardsList.filter(([_, count]) => count >= 3).length;

          coaching += `  Right now you've got:\n`;
          coaching += `  • ${cardsList.length} different cards\n`;
          coaching += `  • ${singletonCount} singleton (1-of only) cards\n`;
          coaching += `  • ${threeOfCount} cards with 3+ copies\n`;
          coaching += `  • Average cost of ${avgCardCost.toFixed(2)}\n\n`;

          if (singletonCount > 8) {
            coaching += `  Hmm, ${singletonCount} singletons is pretty high - that hurts your consistency!\n`;
            coaching += `  Consider cutting: ${cardsList.filter(([_, c]) => c === 1).slice(0, 3).map(([n]) => n).join(', ')}\n`;
            coaching += `  And add more copies of your best cards or proven staples instead.\n\n`;
          }

          if (avgCardCost > 4.5 && playStyle === 'aggro') {
            coaching += `  Your curve is too high for Aggro at ${avgCardCost.toFixed(2)}.\n`;
            coaching += `  The problem: You'll be too slow and weak in the early game.\n`;
            coaching += `  The fix: Cut some expensive cards and add 2-3 cost creatures.\n`;
            coaching += `  Maybe start by cutting: ${cardsList.filter(([_, c]) => c === 1).slice(0, 2).map(([n]) => n).join(', ')}\n`;
            coaching += `  Look for creatures that can hit the board early.\n\n`;
          } else if (avgCardCost < 3 && playStyle === 'control') {
            coaching += `  Your curve is too low for Control at ${avgCardCost.toFixed(2)}.\n`;
            coaching += `  The problem: You don't have enough finishers to close out games.\n`;
            coaching += `  The fix: Cut some cheap  creatures and add high-impact threats.\n`;
            coaching += `  Maybe start by cutting: ${cardsList.filter(([_, c]) => c === 1).slice(0, 2).map(([n]) => n).join(', ')}\n`;
            coaching += `  Look for cost 5+ finishers and board wipes.\n\n`;
          }

          // DECK BUILD STRATEGY SUMMARY (Based on ACTUAL detected ink colors)
          coaching += `🎯 Your Game Plan:\n`;

          // Strategy based on ACTUAL ink colors, not playstyle
          const deckColorCode = `${primaryColorRaw}${secondaryColorRaw !== 'None' ? '/' + secondaryColorRaw : ''}`;

          if (primaryColorRaw === 'ruby') {
            coaching += `🔥 You're Running Ruby${secondaryColorRaw !== 'None' ? '/' + secondaryColorRaw.toUpperCase() : ''} - Time to Be Aggressive!\n`;
            coaching += `  Focus on Rush creatures (attack right away!) and Evasive abilities to slip past blockers.\n`;
            coaching += `  Ruby is all about damage and direct threats.\n`;
            if (secondaryColorRaw === 'steel') {
              coaching += `  Your Steel cards give you card draw and protection.\n`;
            } else if (secondaryColorRaw === 'amber') {
              coaching += `  Your Amber cards give you removal and answers.\n`;
            }
            coaching += `  Deck building guide:\n`;
            coaching += `    Slots 1-20: Rush creatures (cost 1-3)\n`;
            coaching += `    Slots 20-30: Evasive damage threats\n`;
            coaching += `    Slots 30-45: Big finishers with high damage\n`;
            coaching += `    Slots 45-60: Answers for the current meta\n`;
            coaching += `  Your win condition: Deal lethal by turns 5-6 with Rush and Evasion!\n\n`;
          } else if (primaryColorRaw === 'amber') {
            coaching += `🛡️ You're Running Amber${secondaryColorRaw !== 'None' ? '/' + secondaryColorRaw.toUpperCase() : ''} - Master of Control!\n`;
            coaching += `  Load up on removal, board stabilization, and recovery effects.\n`;
            coaching += `  Amber excels at board control and disrupting your opponent's tempo.\n`;
            if (secondaryColorRaw === 'steel') {
              coaching += `  Steel gives you card advantage and consistency.\n`;
            } else if (secondaryColorRaw === 'ruby') {
              coaching += `  Ruby gives you aggressive answers and tempo plays.\n`;
            }
            coaching += `  Deck building guide:\n`;
            coaching += `    Slots 1-20: Defensive creatures and stabilizers\n`;
            coaching += `    Slots 20-35: Removal and board answers\n`;
            coaching += `    Slots 35-45: Card draw and tutors for consistency\n`;
            coaching += `    Slots 45-60: Finishers (play these once board is locked)\n`;
            coaching += `  Your win condition: Survive the early game, then dominate turn 7+ with a locked board!\n\n`;
          } else if (primaryColorRaw === 'sapphire' || primaryColorRaw === 'emerald') {
            const isBlue = primaryColorRaw === 'sapphire';
            coaching += `⚔️ You're Running ${isBlue ? 'Sapphire' : 'Emerald'}${secondaryColorRaw !== 'None' ? '/' + secondaryColorRaw.toUpperCase() : ''} - The Balanced Approach!\n`;
            coaching += `  Balance efficient creatures (50%) with smart answers (50%).\n`;
            if (isBlue) {
              coaching += `  Sapphire is great at card draw and resource generation.\n`;
            } else {
              coaching += `  Emerald excels at ramping and playing efficient threats.\n`;
            }
            if (secondaryColorRaw === 'steel') {
              coaching += `  Steel adds even more card advantage.\n`;
            } else if (secondaryColorRaw === 'ruby') {
              coaching += `  Ruby adds aggressive threats to keep up pressure.\n`;
            }
            coaching += `  Deck building guide:\n`;
            coaching += `    Slots 1-30: Efficient creatures (cost 2-5)\n`;
            coaching += `    Slots 30-45: Flexible removal and answers\n`;
            coaching += `    Slots 45-55: Value generators and synergy cards\n`;
            coaching += `    Slots 55-60: Tech cards for the meta\n`;
            coaching += `  Your win condition: Win through value trades and efficient threats by turn 7!\n\n`;
          } else {
            coaching += `⚔️ You're Running ${primaryColor}${secondaryColor !== 'None' ? '/' + secondaryColor : ''} - Your Custom Build!\n`;
            coaching += `  Focus on ${primaryColor} synergies with ${secondaryColor !== 'None' ? secondaryColor : 'flexible'} support cards.\n`;
            coaching += `  Build your deck slots to support both colors properly.\n`;
            coaching += `  Deck building guide:\n`;
            coaching += `    Slots 1-30: Core creatures for ${primaryColor}\n`;
            coaching += `    Slots 30-45: Answers and ${secondaryColor !== 'None' ? secondaryColor : 'flex'} support\n`;
            coaching += `    Slots 45-60: Synergy payoffs and tech cards\n\n`;
          }

          // Mana Base & Color Check
          coaching += `💎 Your Color Mix:\n`;
          if (colorCount > 3) {
            coaching += `Whoa - ${colorCount} colors is a lot! That's going to hurt your consistency.\n`;
            coaching += `Try to reduce down to 2-3 main colors max. Cut cards that require single-off color splashes.\n`;
          } else {
            coaching += `Nice! ${colorCount} color(s) means good consistency \u2713\n`;
          }
          coaching += `\n`;

          // Song Synergy
          if (songs > 0) {
            coaching += `🎵 About Those Songs...\n`;
            coaching += `You've got ${songs} songs in here. Make sure you have:\n`;
            coaching += `• At least 1 Singer for each Song\n`;
            coaching += `• Ways to find your Songs or Singers when you need them\n`;
            coaching += `• Follow-up plays after the Song resolves\n\n`;
          }

          // Key Weaknesses & Counters
          if (analysis.weaknesses && analysis.weaknesses.length > 0) {
            coaching += `⚡ Things to Watch Out For:\n`;
            analysis.weaknesses.forEach(w => {
              coaching += `• ${w}\n`;
            });
            coaching += `Try to add cards that help with these issues (tech slots).\n\n`;
          }

          // Advanced Coaching Tips based on Deck Analysis
          coaching += `🏆 Some Personal Tips Just for You:\n`;
          const coachingTips = strategyGuides.coachingTips;

          // Check for construction issues
          if (cardCount !== 60) {
            coaching += `  Hey - decks need exactly 60 cards. You've got ${cardCount}. Fix that first!\n`;
          }

          const inkelligibleCount = Object.entries(cards).filter(([name]) => {
            const meta = cardMeta[name.toLowerCase()] || {};
            return meta.inkwell === false; // High-cost uninkable cards are risky
          }).length;

          if (inkelligibleCount > 30) {
            coaching += `  You've got ${inkelligibleCount} cards that can't be inked. Try to keep that under 50% for better consistency.\n`;
          }

          // Playstyle-specific coaching
          if (playStyle === 'aggro') {
            const oneDrops = Object.entries(cards).filter(([name]) => {
              const meta = cardMeta[name.toLowerCase()] || {};
              return meta.cost === 1;
            }).length;
            if (oneDrops < 8) {
              coaching += `  For aggro, you've only got ${oneDrops} one-drops. You really want 12-15 for proper early pressure!\n`;
            }
          }

          if (playStyle === 'control') {
            const removal = cardsList.length; // This is unique card count
            if (removal < 6) {
              coaching += `  Control decks need answers! Consider running 6-8 removal spells. More answers usually means more wins.\n`;
            }
          }

          coaching += `  • Your main focus: ${playStyle === 'aggro' ? 'Early pressure (turns 1-4 are crucial!)' : playStyle === 'control' ? 'Stabilize the board (turns 4-7 are key)' : 'Smart trades throughout the game'}\n`;
          coaching += `  • Starting hands: ${playStyle === 'aggro' ? 'Mulligan hard for that 1-2 drop curve' : playStyle === 'control' ? 'Look for removal and card draw' : 'Balance threats and answers'}\n`;
          coaching += `  • How you win: ${playStyle === 'aggro' ? 'Damage by turns 5-6' : playStyle === 'control' ? 'Control by turn 8+' : 'Tempo advantage by turns 6-7'}\n`;
          coaching += `\n`;

          // Synergies to Leverage
          if (analysis.synergies && analysis.synergies.length > 0) {
            coaching += `✨ Your Deck's Strong Synergies (Build Around These!):\n`;
            analysis.synergies.forEach(s => {
              coaching += `• ${s} - consider adding more cards that work with this!\n`;
            });
            coaching += `\n`;
          }

          // Deck Construction Checklist
          coaching += `📋 Quick Deck Building Checklist:\n`;
          const checklist = coachingTips.deck_construction_checklist;
          checklist.slice(0, 5).forEach(item => {
            coaching += `  ${item}\n`;
          });
          coaching += `\n`;

          // CURRENT META COACHING
          coaching += `⚔️ What's Hot in the Meta Right Now (February 2026):\n`;
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
          coaching += `🛡️ Tech Cards for the Current Meta (February 2026):\n`;
          if (primaryColorRaw === 'ruby' || primaryColorRaw === 'amethyst') {
            coaching += `  Right now Ruby/Amethyst is everywhere. You should include:\n`;
            coaching += `    • Resist creatures (from Steel) - they bypass Rush damage\n`;
            coaching += `    • Early board stabilization - stop the snowball in turns 1-3\n`;
            coaching += `    • Healing/Recovery (Amber helps) - bounce back from early pressure\n`;
          } else if (primaryColorRaw === 'sapphire' || primaryColorRaw === 'steel') {
            coaching += `  Control decks like yours are tier-1 right now! Keep doing:\n`;
            coaching += `    • Running early blockers to slow down Rush and Evasive\n`;
            coaching += `    • Packing removal in the 2-4 cost range\n`;
            coaching += `    • Making sure your draw engine survives the early turns\n`;
          } else {
            coaching += `  To beat the current meta (Ruby/Amethyst is king):\n`;
            coaching += `    • Pack Resist creatures (Steel especially)\n`;
            coaching += `    • Include early defensive options\n`;
            coaching += `    • Have answers for Rush and Evasive threats\n`;
            coaching += `    • Maybe consider Sapphire/Steel for consistent answers\n`;
          }
          coaching += `\n`;

          // YOUR DECK VS CURRENT META
          coaching += `🎯 How Your ${primaryColor}${secondaryColorRaw !== 'None' ? '/' + secondaryColor : ''} Deck Performs Against the Meta:\n\n`;

          // Analyze matchups against top meta decks
          coaching += `VS RUBY/AMETHYST (Most Common - Tier S):\n`;
          if ((primaryColorRaw === 'ruby' && secondaryColorRaw === 'amethyst') || (primaryColorRaw === 'amethyst' && secondaryColorRaw === 'ruby')) {
            coaching += `  ⭐ EVEN MATCHUP (50/50) - Mirror match!\n`;
            coaching += `  Whoever gets the better start wins. Mulligan aggressively for 1-2 drops.\n`;
            coaching += `  Win condition: Out-tempo them in turns 1-3.\n`;
          } else if (primaryColorRaw === 'sapphire' && secondaryColorRaw === 'steel') {
            coaching += `  ✅ FAVORABLE (60/40) - You counter them well!\n`;
            coaching += `  Your blockers + Resist stop their Rush. Draw engine wins late.\n`;
            coaching += `  Win condition: Survive turns 1-4, dominate turns 5+.\n`;
          } else if (primaryColorRaw === 'steel' || secondaryColorRaw === 'steel') {
            coaching += `  ✅ FAVORABLE (55/45) - Steel Resist walls work!\n`;
            coaching += `  Resist creatures completely shut down their Rush strategy.\n`;
            coaching += `  Win condition: Block early, outlast their pressure.\n`;
          } else if (primaryColorRaw === 'amber' || secondaryColorRaw === 'amber') {
            coaching += `  ⭐ EVEN MATCHUP (50/50) - Can go either way.\n`;
            coaching += `  Your healing helps, but they're fast. Need early blockers.\n`;
            coaching += `  Win condition: Stabilize turn 3-4, recover and win late.\n`;
          } else {
            coaching += `  ❌ UNFAVORABLE (40/60) - They're faster than you.\n`;
            coaching += `  Rush pressure + hand disruption is tough to beat.\n`;
            coaching += `  Win condition: Add more early defense, survive to turn 5+.\n`;
          }

          coaching += `\nVS SAPPHIRE/STEEL CONTROL (Tier 1A):\n`;
          if (primaryColorRaw === 'sapphire' && secondaryColorRaw === 'steel') {
            coaching += `  ⭐ EVEN MATCHUP (50/50) - Mirror match!\n`;
            coaching += `  Card advantage war. Who draws better wins.\n`;
            coaching += `  Win condition: Superior threat quality.\n`;
          } else if (primaryColorRaw === 'ruby' || primaryColorRaw === 'amethyst') {
            coaching += `  ✅ FAVORABLE (55/45) - You're faster!\n`;
            coaching += `  Apply pressure turns 1-4 before they stabilize.\n`;
            coaching += `  Win condition: Kill them before turn 6.\n`;
          } else if (primaryColorRaw === 'emerald' && secondaryColorRaw === 'sapphire') {
            coaching += `  ⭐ EVEN MATCHUP (50/50) - Can win with good draws.\n`;
            coaching += `  Your ramp can outpace their control if you get going.\n`;
            coaching += `  Win condition: Ramp fast, deploy threats turn 4-5.\n`;
          } else {
            coaching += `  ❌ UNFAVORABLE (45/55) - Their answers are tough.\n`;
            coaching += `  They have removal for your threats + card advantage.\n`;
            coaching += `  Win condition: Multiple threats per turn to overwhelm them.\n`;
          }

          coaching += `\nVS EMERALD/SAPPHIRE MIDRANGE (Tier 1B):\n`;
          if (primaryColorRaw === 'emerald' && secondaryColorRaw === 'sapphire') {
            coaching += `  ⭐ EVEN MATCHUP (50/50) - Mirror match!\n`;
            coaching += `  Whoever ramps better and draws better wins.\n`;
            coaching += `  Win condition: Efficient threats + good trades.\n`;
          } else if (primaryColorRaw === 'ruby' || (primaryColorRaw === 'ruby' && secondaryColorRaw === 'amethyst')) {
            coaching += `  ✅ FAVORABLE (60/40) - You're much faster!\n`;
            coaching += `  They need time to set up. You don't give them time.\n`;
            coaching += `  Win condition: Lethal by turn 5 before they stabilize.\n`;
          } else if (primaryColorRaw === 'sapphire' && secondaryColorRaw === 'steel') {
            coaching += `  ✅ FAVORABLE (55/45) - Out-control them.\n`;
            coaching += `  Your draw + removal beats their threats.\n`;
            coaching += `  Win condition: Card advantage by turn 6.\n`;
          } else {
            coaching += `  ⭐ EVEN MATCHUP (50/50) - Fair fight.\n`;
            coaching += `  Depends on draws and who executes better.\n`;
            coaching += `  Win condition: Out-tempo or out-value them.\n`;
          }

          coaching += `\nOVERALL META RATING FOR YOUR DECK:\n`;
          const favorableCount =
            ((primaryColorRaw === 'sapphire' && secondaryColorRaw === 'steel') ? 2 : 0) +
            ((primaryColorRaw === 'ruby' && secondaryColorRaw === 'amethyst') ? 1 : 0) +
            ((primaryColorRaw === 'steel' || secondaryColorRaw === 'steel') && primaryColorRaw !== 'sapphire' ? 1 : 0);

          if (primaryColorRaw === 'ruby' && secondaryColorRaw === 'amethyst') {
            coaching += `  🔥 TIER S - You're playing the best deck! (Dominant against most matchups)\n`;
          } else if (primaryColorRaw === 'sapphire' && secondaryColorRaw === 'steel') {
            coaching += `  ⭐ TIER 1A - Strong meta choice! (Counters the top deck)\n`;
          } else if (favorableCount >= 2) {
            coaching += `  ✅ TIER 1B - Solid in this meta! (Good matchup spread)\n`;
          } else if (favorableCount === 1) {
            coaching += `  ⚖️ TIER 2 - Playable but inconsistent (Some tough matchups)\n`;
          } else {
            coaching += `  ⚠️ TIER 3 - Struggles in current meta (Consider adjustments)\n`;
          }
          coaching += `\n`;

          // COMBAT CURRENT META - SPECIFIC CARD RECOMMENDATIONS
          coaching += `💡 How to Improve Your Deck for This Meta:\n`;
          coaching += `\nSince Ruby/Amethyst is the most common deck you'll face, here's what you need to know:\n\n`;

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
          coaching += `🧠 GENERAL DECK-BUILDING WISDOM & PRINCIPLES:\n`;
          coaching += `\nCURVE THEORY & CONSISTENCY:\n`;
          coaching += `  INK CURVE (Cost distribution):\n`;
          coaching += `  • Ideal distribution: 4 cost-1 | 6 cost-2 | 6 cost-3-4 | 6 cost-5+ | Rest = answers\n`;
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
          coaching += `  🎯 IMMEDIATE (Today): Fix your ink curve and color consistency\n`;
          coaching += `     • Adjust curve to 3.5-4.2 average cost\n`;
          coaching += `     • Stick to 2 main colors max\n`;
          coaching += `     • Remove obvious weak cards\n`;
          coaching += `\n`;
          coaching += `  🔧 THIS WEEK: Refine card choices and test\n`;
          coaching += `     • Replace generic creatures with format staples\n`;
          coaching += `     • Add 2-3 tech cards for current meta\n`;
          coaching += `     • Play 5-10 games, track what you mulligan away\n`;
          coaching += `\n`;
          coaching += `  📈 NEXT 2 WEEKS: Optimize and tune\n`;
          coaching += `     • Identify your best and worst matchups\n`;
          coaching += `     • Adjust ratios (2-of vs 3-of vs 4-of)\n`;
          coaching += `     • Test sideboard options\n`;
          coaching += `\n`;
          coaching += `  ⚡ LONG TERM (Monthly): Stay current\n`;
          coaching += `     • Watch meta shifts, adapt as needed\n`;
          coaching += `     • Test new cards from latest set\n`;
          coaching += `     • Refine your personal playstyle\n`;

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
        <div style={{
          marginTop: "1.5rem",
          background: 'rgba(167, 139, 250, 0.25)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '2px solid rgba(139, 92, 246, 0.4)',
          backdropFilter: 'blur(10px)'
        }}>
          {analysis.error ? (
            <p style={{ color: "#fca5a5" }}>{analysis.error}</p>
          ) : (
            <div>
              <p><strong style={{ color: '#fbbf24' }}>Total Cards:</strong> {analysis.total}</p>
              <p><strong style={{ color: '#fbbf24' }}>Unique Cards:</strong> {analysis.uniqueCount}</p>
              <p><strong style={{ color: '#fbbf24' }}>Average Cost:</strong> {analysis.avgCost}</p>
              <p><strong style={{ color: '#fbbf24' }}>Archetype:</strong> {analysis.archetype}</p>

              {analysis.curveDistribution && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ color: '#fbbf24', marginBottom: '0.5rem' }}>Ink Curve Distribution:</h4>
                  <p>Cost 1: {analysis.curveDistribution.cost1} cards</p>
                  <p>Cost 2: {analysis.curveDistribution.cost2} cards</p>
                  <p>Cost 3-4: {analysis.curveDistribution.cost3to4} cards</p>
                  <p>Cost 5+: {analysis.curveDistribution.cost5Plus} cards</p>
                </div>
              )}

              {analysis.cardTypes && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ color: '#fbbf24', marginBottom: '0.5rem' }}>Card Types:</h4>
                  <p>Characters: {analysis.cardTypes.creatures}</p>
                  <p>Actions: {analysis.cardTypes.actions}</p>
                  <p>Items: {analysis.cardTypes.items}</p>
                </div>
              )}

              {analysis.inkColors && Object.keys(analysis.inkColors).length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ color: '#fbbf24', marginBottom: '0.5rem' }}>Ink Colors:</h4>
                  {Object.entries(analysis.inkColors).map(([color, count]) => (
                    <p key={color}>{color}: {count} cards</p>
                  ))}
                </div>
              )}

              <p style={{ marginTop: '1rem' }}>{analysis.notes}</p>

              <h3>Card Breakdown</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {Object.entries(analysis.cards).map(([name, count]) => (
                  <li key={name} style={{
                    padding: '0.5rem',
                    margin: '0.25rem 0',
                    background: 'rgba(30, 27, 75, 0.4)',
                    borderRadius: '6px',
                    borderLeft: '3px solid #8b5cf6'
                  }}>
                    <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{count}x</span> — {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {aiCoaching && (
        <div style={{
          marginTop: '1.5rem',
          background: 'rgba(167, 139, 250, 0.25)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '2px solid rgba(251, 191, 36, 0.4)',
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)'
        }}>
          <h3 style={{ marginTop: 0 }}>✨ Your Personal Coaching</h3>
          <pre style={{
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6'
          }}>{aiCoaching}</pre>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h3>📚 Saved Decks</h3>
        {saved.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            background: 'rgba(139, 92, 246, 0.05)',
            borderRadius: '12px',
            border: '2px dashed rgba(139, 92, 246, 0.3)'
          }}>No saved decks yet. Create your first masterpiece! ✨</div>
        ) : (
          saved.map(s => (
            <div key={s.id} style={{
              padding: '1rem',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '2px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '12px',
              marginBottom: '1rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1.1rem', color: '#fbbf24' }}>{s.name}</strong>
                  <div style={{ fontSize: '0.875rem', color: '#c4b5fd', marginTop: '0.25rem' }}>
                    {new Date(s.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleLoad(s)}>Load</button>
                  <button onClick={() => handleDelete(s.id)} style={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                  }}>Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
