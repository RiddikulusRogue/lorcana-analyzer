import { useState, useEffect, useMemo } from "react";
import { analyzeDeck } from "./logic/deckAnalyzer";

// Fuzzy matching for playstyle detection
const levenshteinDistance = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array(b.length + 1)
    .fill(0)
    .map(() => Array(a.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
};

const getSimilarity = (a, b) => {
  const dist = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  return 1 - dist / maxLen;
};

const detectPlaystyleFuzzy = (cardNames, playstyles) => {
  if (!playstyles || !Array.isArray(playstyles) || playstyles.length === 0) {
    return "Unclassified";
  }

  const cardSet = new Set(cardNames.map((c) => c.toLowerCase()));
  const matches = playstyles.map((playstyle) => {
    let score = 0;
    const keyCards = (playstyle.keyCards || []).map((c) => c.toLowerCase());
    const cardMatches = keyCards.filter((kc) =>
      Array.from(cardSet).some((cn) => getSimilarity(cn, kc) > 0.7)
    ).length;
    score += cardMatches * 10;

    const avgCardCostDiff = Math.abs(
      (playstyle.avgCardCost || 4) - (parseFloat(playstyle.avgCardCost) || 4)
    );
    score += Math.max(0, 5 - avgCardCostDiff);

    return { playstyle: playstyle.name, score };
  });

  const best = matches.sort((a, b) => b.score - a.score)[0];
  return best && best.score > 0 ? best.playstyle : "Unclassified";
};

const normalizeCardKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const normalizePlaystylesData = (raw) => {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.playstyles)) {
      return raw.playstyles;
    }

    if (raw.lorcanaPlaystyles && typeof raw.lorcanaPlaystyles === "object") {
      return Object.values(raw.lorcanaPlaystyles).map((entry) => {
        const examples = Array.isArray(entry.lorcanaExamples) ? entry.lorcanaExamples : [];
        const exampleKeyCards = examples.flatMap((example) =>
          Array.isArray(example.keyCards) ? example.keyCards : []
        );
        const uniqueKeyCards = Array.from(new Set(exampleKeyCards.filter(Boolean)));
        return {
          ...entry,
          keyCards: Array.isArray(entry.keyCards) && entry.keyCards.length > 0
            ? entry.keyCards
            : uniqueKeyCards,
        };
      });
    }
  }

  return [];
};

const normalizeStrategicGuidesData = (raw) => {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (!raw || typeof raw !== "object") {
    return [];
  }

  const guides = [];

  if (raw.playstyleGuides && typeof raw.playstyleGuides === "object") {
    Object.entries(raw.playstyleGuides).forEach(([key, value]) => {
      if (!value || typeof value !== "object") return;
      guides.push({
        name: value.name || key,
        description: value.strategy || value.goal || "",
        keyPrinciples: Array.isArray(value.questions) ? value.questions : [],
      });
    });
  }

  if (raw.currentMeta && raw.currentMeta.dominantArchetypes && typeof raw.currentMeta.dominantArchetypes === "object") {
    Object.values(raw.currentMeta.dominantArchetypes).forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      guides.push({
        name: entry.archetype || "Meta Deck",
        description: entry.description || "",
        keyPrinciples: Array.isArray(entry.strengths) ? entry.strengths.slice(0, 4) : [],
      });
    });
  }

  return guides;
};

const inferDesiredPlaystyle = (input) => {
  const query = String(input || "").toLowerCase();
  if (!query) return null;

  if (query.includes("aggro") || query.includes("aggressive")) return "Aggro";
  if (query.includes("tempo")) return "Tempo";
  if (query.includes("control") || query.includes("controls")) return "Control";
  if (query.includes("midrange") || query.includes("balanced")) return "Midrange";
  if (query.includes("ramp") || query.includes("acceleration")) return "Control/Ramp";
  if (query.includes("combo") || query.includes("synergy")) return "Combo";

  return null;
};

export default function App() {
  const [deckText, setDeckText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [saved, setSaved] = useState([]);
  const [format, setFormat] = useState("infinity");
  const [playstyles, setPlaystyles] = useState([]);
  const [strategicGuides, setStrategicGuides] = useState([]);
  const [competitiveMeta, setCompetitiveMeta] = useState(null);
  const [cardMeta, setCardMeta] = useState(null);
  const [allCardsData, setAllCardsData] = useState(null);
  const [coreConstructed, setCoreConstructed] = useState(null);
  const [cardSetsData, setCardSetsData] = useState(null);
  const [onlineMetaData, setOnlineMetaData] = useState(null);
  const [coaching, setCoaching] = useState("");
  const [customQuery, setCustomQuery] = useState("");
  const [mode, setMode] = useState("overview"); // overview | coaching | deckbuilding | meta

  const cardMetaInkMap = useMemo(() => {
    if (!cardMeta) return null;
    const map = new Map();
    Object.entries(cardMeta).forEach(([key, value]) => {
      if (value && typeof value.ink === "string") {
        const normalized = normalizeCardKey(key);
        if (normalized) map.set(normalized, value.ink);
      }
    });
    return map;
  }, [cardMeta]);

  const allCardsColorMap = useMemo(() => {
    if (!allCardsData || !Array.isArray(allCardsData.cards)) return null;
    const map = new Map();
    allCardsData.cards.forEach((card) => {
      const color = card && card.color;
      if (!color) return;
      [card.simpleName, card.fullName, card.name].forEach((name) => {
        const normalized = normalizeCardKey(name);
        if (normalized && !map.has(normalized)) {
          map.set(normalized, color);
        }
      });
    });
    return map;
  }, [allCardsData]);

  const allCardsColorsMap = useMemo(() => {
    if (!allCardsData || !Array.isArray(allCardsData.cards)) return null;
    const map = new Map();
    allCardsData.cards.forEach((card) => {
      const colors = Array.isArray(card.colors) && card.colors.length > 0
        ? card.colors
        : (card.color ? [card.color] : null);
      if (!colors) return;
      [card.simpleName, card.fullName, card.name].forEach((name) => {
        const normalized = normalizeCardKey(name);
        if (normalized && !map.has(normalized)) {
          map.set(normalized, colors);
        }
      });
    });
    return map;
  }, [allCardsData]);

  const applyInkColorFallback = (analysisToUpdate) => {
    if (!analysisToUpdate || !analysisToUpdate.cards || !allCardsColorMap) {
      return { analysis: analysisToUpdate, applied: false };
    }

    const updatedInkColors = {};

    Object.entries(analysisToUpdate.cards).forEach(([cardName, count]) => {
      const normalized = normalizeCardKey(cardName);
      if (!normalized) return;
      const metaColor = cardMetaInkMap ? cardMetaInkMap.get(normalized) : null;
      const color = metaColor || allCardsColorMap.get(normalized);
      if (!color) return;
      updatedInkColors[color] = (updatedInkColors[color] || 0) + count;
    });

    const previousInkColors = analysisToUpdate.inkColors || {};
    const previousKeys = Object.keys(previousInkColors);
    const updatedKeys = Object.keys(updatedInkColors);
    const allKeys = new Set([...previousKeys, ...updatedKeys]);
    let applied = false;

    allKeys.forEach((key) => {
      if ((previousInkColors[key] || 0) !== (updatedInkColors[key] || 0)) {
        applied = true;
      }
    });

    return {
      analysis: applied ? { ...analysisToUpdate, inkColors: updatedInkColors } : analysisToUpdate,
      applied,
    };
  };

  useEffect(() => {
    // Load saved decks from localStorage
    try {
      const s = JSON.parse(localStorage.getItem("lorcana_saved_decks") || "[]");
      setSaved(s);
    } catch (e) {
      setSaved([]);
    }

    // Load playstyles, guides, and meta data
    const loadData = async () => {
      try {
        const p = await import("./data/playstyles.json");
        const playstyleData = normalizePlaystylesData(p.default || p);
        setPlaystyles(playstyleData);
        console.log("Loaded playstyles:", playstyleData);
      } catch (e) {
        console.warn("Could not load playstyles:", e);
        setPlaystyles([]);
      }

      try {
        const g = await import("./data/strategyGuides.json");
        const guideData = normalizeStrategicGuidesData(g.default || g);
        setStrategicGuides(guideData);
      } catch (e) {
        console.warn("Could not load strategy guides:", e);
        setStrategicGuides([]);
      }

      try {
        const m = await import("./data/competitiveMeta.json");
        const metaData = m.default || m;
        setCompetitiveMeta(metaData || null);
      } catch (e) {
        console.warn("Could not load meta data:", e);
        setCompetitiveMeta(null);
      }

      try {
        const c = await import("./data/cardMeta.json");
        const cardData = c.default || c;
        setCardMeta(cardData || null);
        console.log("Loaded card meta:", cardData);
      } catch (e) {
        console.warn("Could not load card meta:", e);
        setCardMeta(null);
      }

      try {
        const ac = await import("./data/allCards.json");
        const allCards = ac.default || ac;
        setAllCardsData(allCards || null);
        console.log("Loaded all cards data:", allCards);
      } catch (e) {
        console.warn("Could not load all cards data:", e);
        setAllCardsData(null);
      }

      try {
        const cs = await import("./data/cardSets.json");
        const setsData = cs.default || cs;
        setCardSetsData(setsData || null);
        console.log("Loaded card sets data:", setsData);
      } catch (e) {
        console.warn("Could not load card sets data:", e);
        setCardSetsData(null);
      }

      try {
        const cc = await import("./data/coreConstructed.json");
        const coreData = cc.default || cc;
        setCoreConstructed(coreData || null);
        console.log("Loaded core constructed data:", coreData);
      } catch (e) {
        console.warn("Could not load core constructed data:", e);
        setCoreConstructed(null);
      }

      // Fetch online competitive data
      try {
        const onlineData = await fetchOnlineMetaData();
        if (onlineData) {
          setOnlineMetaData(onlineData);
          console.log("Loaded online meta data");
        }
      } catch (e) {
        console.warn("Could not fetch online meta data:", e);
      }
    };

    loadData();
  }, []);

  const handleAnalyze = async () => {
    let result = analyzeDeck(deckText, format);

    const fallbackResult = applyInkColorFallback(result);
    result = fallbackResult.analysis;

    // Enrich color data if needed - fetch from API for cards with unknown colors
    if (result.inkColors) {
      const colorKeys = Object.keys(result.inkColors);
      const totalAccounted = Object.values(result.inkColors).reduce((sum, count) => sum + count, 0);
      const totalCards = result.total || 0;

      // If more than 30% of cards are unaccounted, try to fetch color data
      if (totalCards - totalAccounted > totalCards * 0.3 && totalCards > 0) {
        console.log(`Only ${totalAccounted}/${totalCards} cards have colors. Fetching additional color data from API...`);
        const enrichedResult = await enrichDeckColors(result);
        if (enrichedResult) {
          result = enrichedResult;
        }
      }
    }

    setAnalysis(result);
  };

  useEffect(() => {
    if (!analysis) return;
    const fallbackResult = applyInkColorFallback(analysis);
    if (fallbackResult.applied) {
      setAnalysis(fallbackResult.analysis);
    }
  }, [analysis, allCardsColorMap, cardMetaInkMap]);

  // Enrich deck color data by fetching from external API
  const enrichDeckColors = async (analysis) => {
    if (!analysis || !analysis.cards) return analysis;

    const officialInks = ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'];
    const enrichedColors = { ...analysis.inkColors };

    try {
      // Try multiple API sources
      let apiCards = null;

      // Try Lorcana API first
      try {
        console.log('Fetching from lorcana-api.com...');
        const response = await fetch('https://api.lorcana-api.com/cards/all');
        if (response.ok) {
          apiCards = await response.json();
          console.log(`✓ Fetched ${apiCards.length} cards from lorcana-api.com`);
        }
      } catch (e) {
        console.warn('lorcana-api.com failed:', e.message);
      }

      // Try Dreamborn API if first failed
      if (!apiCards) {
        try {
          console.log('Trying alternative source: dreamborn.ink...');
          const response = await fetch('https://api.dreamborn.ink/cards');
          if (response.ok) {
            apiCards = await response.json();
            console.log(`✓ Fetched ${apiCards.length} cards from dreamborn.ink`);
          }
        } catch (e) {
          console.warn('dreamborn.ink failed:', e.message);
        }
      }

      if (!apiCards || apiCards.length === 0) {
        console.error('❌ All API sources failed');
        alert('Unable to fetch card color data from online sources. Using local data only.');
        return analysis;
      }

      // Create lookup map (normalize names) - handle different API formats
      const colorMap = {};
      apiCards.forEach(card => {
        const name = card.Name || card.name || card.fullName;
        const color = card.Color || card.color || card.ink_color;

        if (name && color) {
          const normalized = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
          colorMap[normalized] = color;
        }
      });

      console.log(`Created lookup map with ${Object.keys(colorMap).length} cards`);

      // Reset enriched colors to recount everything
      officialInks.forEach(ink => { enrichedColors[ink] = 0; });

      // Match deck cards to API data
      let matchedCount = 0;
      let unmatchedCards = [];

      Object.keys(analysis.cards).forEach(cardName => {
        const count = analysis.cards[cardName];
        const normalized = cardName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

        if (colorMap[normalized]) {
          const color = colorMap[normalized];
          // Normalize color name to match our format
          const properColor = color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();

          if (officialInks.includes(properColor)) {
            enrichedColors[properColor] = (enrichedColors[properColor] || 0) + count;
            matchedCount += count;
            console.log(`✓ ${cardName} -> ${properColor}`);
          }
        } else {
          unmatchedCards.push(cardName);
          console.warn(`✗ Could not find color for: ${cardName}`);
        }
      });

      console.log(`✓ Matched ${matchedCount}/${analysis.total} cards to colors`);
      if (unmatchedCards.length > 0) {
        console.warn('Unmatched cards:', unmatchedCards);
      }

      // Update analysis with enriched colors
      return {
        ...analysis,
        inkColors: enrichedColors
      };

    } catch (error) {
      console.error('Failed to enrich color data:', error);
      alert('Error fetching card colors: ' + error.message);
      return analysis;
    }
  };

  const handleSave = () => {
    if (!analysis) {
      alert("Analyze a deck first");
      return;
    }
    const name = prompt("Save name:", "My Deck") || "My Deck";
    const item = {
      id: Date.now(),
      name,
      deckText,
      analysis,
      format,
      createdAt: new Date().toISOString()
    };

    const next = [item, ...saved];
    localStorage.setItem("lorcana_saved_decks", JSON.stringify(next));
    setSaved(next);
    alert("Deck saved ✓");
  };

  const handleLoad = (item) => {
    setDeckText(item.deckText || "");
    setAnalysis(item.analysis || null);
    setFormat(item.format || "infinity");
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this deck?")) return;
    const next = saved.filter((s) => s.id !== id);
    localStorage.setItem("lorcana_saved_decks", JSON.stringify(next));
    setSaved(next);
  };

  const handleDownload = () => {
    if (!analysis) {
      alert("Analyze a deck first");
      return;
    }
    const data = { deckText, analysis, format, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deck-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Fetch competitive meta data from online sources
  const fetchOnlineMetaData = async () => {
    try {
      // Try fetching from Dreamborn API or similar sources
      const response = await fetch('https://api.lorcana-api.com/cards/all');
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.warn('Could not fetch online meta data:', error);
    }
    return null;
  };

  // Fetch card color data from external API to supplement cardMeta
  const fetchCardColorData = async (cardName) => {
    try {
      // Try Lorcana API first
      const encodedName = encodeURIComponent(cardName);
      const response = await fetch(`https://api.lorcana-api.com/cards/search?name=${encodedName}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0 && data[0].ink_color) {
          console.log(`Fetched color for ${cardName}: ${data[0].ink_color}`);
          return data[0].ink_color; // Returns: "amber", "ruby", etc.
        }
      }
    } catch (error) {
      console.warn(`Could not fetch color for ${cardName}:`, error);
    }
    return null;
  };

  // Smart card search based on ink colors, archetype, and cost
  const findCardRecommendations = (inkColors, archetype, targetCost, count = 5, gameFormat = 'infinity') => {
    const hasAllCards = allCardsData && Array.isArray(allCardsData.cards);
    if (!cardMeta && !hasAllCards) return [];

    const getPreferredCompetitiveSet = () => {
      const setsMap = allCardsData && allCardsData.sets ? allCardsData.sets : null;
      if (!setsMap) return 11;

      const formatKey = gameFormat === 'core' ? 'Core' : 'Infinity';
      const now = new Date();
      let bestSet = null;

      Object.entries(setsMap).forEach(([setKey, setInfo]) => {
        const setNumber = parseInt(setKey, 10);
        if (!Number.isFinite(setNumber)) return;
        if (!setInfo || setInfo.type !== 'expansion') return;
        if (!setInfo.hasAllCards) return;

        const formatInfo = setInfo.allowedInFormats && setInfo.allowedInFormats[formatKey];
        if (formatInfo && formatInfo.allowed === false) return;

        if (setInfo.releaseDate) {
          const releaseDate = new Date(setInfo.releaseDate);
          if (!Number.isNaN(releaseDate.getTime()) && releaseDate > now) return;
        }

        if (bestSet === null || setNumber > bestSet) {
          bestSet = setNumber;
        }
      });

      return bestSet || 11;
    };

    const preferredCompetitiveSet = getPreferredCompetitiveSet();

    // Get valid ink colors from deck (only string values, normalized)
    const inks = Object.keys(inkColors || {})
      .filter(ink => typeof ink === 'string' && ink.length > 0)
      .map(ink => ink.trim());

    if (inks.length === 0) {
      console.warn('No valid ink colors provided for recommendations');
      return [];
    }

    console.log(`Searching for ${archetype} cards in: ${inks.join(' + ')} (Format: ${gameFormat})`);

    let allCards = [];
    if (hasAllCards) {
      allCards = allCardsData.cards.map(card => {
        const keywordList = [];
        if (Array.isArray(card.keywordAbilities)) {
          keywordList.push(...card.keywordAbilities);
        }
        if (Array.isArray(card.abilities)) {
          card.abilities.forEach(ability => {
            if (ability.keyword) keywordList.push(ability.keyword);
            if (ability.name && ability.type === 'keyword') keywordList.push(ability.name);
          });
        }

        const abilityText = card.fullText || (Array.isArray(card.abilities)
          ? card.abilities.map(a => a.fullText || a.effect || a.name).filter(Boolean).join(' ')
          : '');

        return {
          name: card.fullName || card.name || card.simpleName || 'Unknown',
          simpleName: card.simpleName || (card.fullName || card.name || '').toLowerCase(),
          ink: card.color,
          cost: card.cost,
          lore: card.lore,
          type: card.type,
          setCode: card.setCode,
          keywords: keywordList,
          ability: abilityText,
          allowedInFormats: card.allowedInFormats || null
        };
      });
    } else {
      allCards = Object.values(cardMeta).map(card => ({
        ...card,
        simpleName: (card.name || '').toLowerCase()
      }));
    }

    const normalizeCardName = (value) => String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

    // Filter by format legality
    if (gameFormat === 'core') {
      const legalSets = Array.isArray(coreConstructed?.legalSets) ? coreConstructed.legalSets : [];
      if (cardSetsData && cardSetsData.cardSetMapping && legalSets.length > 0) {
        const normalizedMap = {};
        Object.entries(cardSetsData.cardSetMapping).forEach(([name, sets]) => {
          normalizedMap[normalizeCardName(name)] = sets;
        });

        allCards = allCards.filter(card => {
          const cardName = normalizeCardName(card.simpleName || card.name || '');
          const sets = normalizedMap[cardName];
          if (!Array.isArray(sets)) return false;
          return sets.some((setNumber) => legalSets.includes(setNumber));
        });
        console.log(`${allCards.length} cards available after core set filter`);
      } else if (hasAllCards) {
        allCards = allCards.filter(card => {
          const coreInfo = card.allowedInFormats && card.allowedInFormats.Core;
          return coreInfo ? coreInfo.allowed === true : false;
        });
      } else if (coreConstructed && coreConstructed.legalCards) {
        console.log(`Filtering to ${coreConstructed.legalCards.length} core constructed legal cards`);
        const legalSet = new Set(coreConstructed.legalCards.map(c => c.toLowerCase().trim()));
        allCards = allCards.filter(card => {
          const cardName = (card.simpleName || card.name || '').toLowerCase().trim();
          return legalSet.has(cardName);
        });
        console.log(`${allCards.length} cards available after format filter`);
      }
    } else if (gameFormat === 'infinity') {
      // Infinity currently uses sets 1-11 for competitive constructed guidance
      allCards = allCards.filter(card => {
        const setCode = parseInt(card.setCode, 10);
        return Number.isFinite(setCode) && setCode >= 1 && setCode <= 11;
      });
      console.log(`${allCards.length} cards available after infinity set 1-11 filter`);
    }

    const pickBestPrinting = (cards, format, legalSets) => {
      const byName = new Map();
      cards.forEach(card => {
        const key = normalizeCardName(card.simpleName || card.name || '');
        if (!key) return;

        const current = byName.get(key);
        if (!current) {
          byName.set(key, card);
          return;
        }

        const currentSet = parseInt(current.setCode, 10);
        const nextSet = parseInt(card.setCode, 10);

        if (!Number.isFinite(nextSet)) return;
        if (!Number.isFinite(currentSet)) {
          byName.set(key, card);
          return;
        }

        if (format === 'core' && Array.isArray(legalSets) && legalSets.length > 0) {
          const currentLegal = legalSets.includes(currentSet);
          const nextLegal = legalSets.includes(nextSet);
          if (nextLegal && !currentLegal) {
            byName.set(key, card);
            return;
          }
          if (nextLegal && currentLegal && nextSet > currentSet) {
            byName.set(key, card);
            return;
          }
          return;
        }

        if (nextSet > currentSet) {
          byName.set(key, card);
        }
      });

      return Array.from(byName.values());
    };

    const legalSets = Array.isArray(coreConstructed?.legalSets) ? coreConstructed.legalSets : [];
    allCards = pickBestPrinting(allCards, gameFormat, legalSets);
    const archetypeLower = (archetype || '').toLowerCase();

    // Define what makes a card good for each archetype
    const isGoodForArchetype = (card) => {
      const type = (card.type || '').toLowerCase();
      const keywords = (card.keywords || []).map(k => String(k).toLowerCase());
      const ability = (card.ability || '').toLowerCase();
      const cost = card.cost || 0;

      if (archetypeLower.includes('tempo')) {
        // Tempo wants: efficient creatures, card advantage, disruption, evasion
        if (cost < 2 || cost > 5) return false;
        if (cost >= 2 && cost <= 4) {
          // Sweet spot for tempo
          if (keywords.some(k => k.includes('evasive') || k.includes('challenger'))) return true;
          if (ability.includes('draw') || ability.includes('bounce') || ability.includes('return')) return true;
          if (type.includes('character') && ability.length > 0) return true;
        }
        if (ability.includes('when you play') || ability.includes('when this character')) return true;
        return cost === 3 && type.includes('character'); // 3-drops are tempo core
      }

      if (archetypeLower.includes('aggro')) {
        // Aggro wants: low cost, rush, damage, evasive, challenger
        if (cost > 4) return false;
        if (cost <= 2) return true; // Early drops are premium
        if (keywords.some(k => k.includes('rush') || k.includes('evasive') || k.includes('challenger'))) return true;
        if (ability.includes('damage') || ability.includes('deal')) return true;
        return cost <= 3 && type.includes('character');
      }

      if (archetypeLower.includes('control')) {
        // Control wants: removal, draw, board wipes, big threats
        if (cost < 3) return false;
        if (ability.includes('banish') || ability.includes('return') || ability.includes('bounce')) return true;
        if (ability.includes('draw') || ability.includes('look at')) return true;
        if (type.includes('action') && (ability.includes('all') || ability.includes('each'))) return true;
        if (cost >= 6 && type.includes('character')) return true; // Big finishers
        return false;
      }

      if (archetypeLower.includes('midrange')) {
        // Midrange wants: efficient threats, value, versatility
        if (cost < 2 || cost > 6) return false;
        if (keywords.some(k => k.includes('challenger') || k.includes('resist') || k.includes('bodyguard'))) return true;
        if (ability.includes('draw') || ability.includes('when you play')) return true;
        if (cost >= 3 && cost <= 5 && type.includes('character')) return true;
        return false;
      }

      // Default: reasonable cost and any upside
      return cost >= 1 && cost <= 5 && (keywords.length > 0 || ability.length > 0);
    };

    const buildCandidates = (enforceArchetype, enforceCost) => {
      const scored = allCards
        .filter(card => {
          // STRICT ink color matching - card must have a valid ink color string that matches deck
          const cardInk = card.ink;

          // Reject cards without a specific ink color (ink: true, null, undefined, arrays, etc.)
          if (typeof cardInk !== 'string') return false;

          // Reject dual-ink cards (if they contain "/" or "-" or multiple colors)
          if (cardInk.includes('/') || cardInk.includes('-') || cardInk.includes(' ')) return false;

          // Card ink MUST be in the deck's ink colors
          if (!inks.includes(cardInk)) return false;

          // Must be around target cost (±1)
          if (enforceCost && targetCost !== null) {
            const cost = card.cost || 0;
            if (Math.abs(cost - targetCost) > 1) return false;
          }

          // Must fit archetype
          return enforceArchetype ? isGoodForArchetype(card) : true;
        })
        .map(card => {
          // Score cards based on keywords, abilities, and lore
          let score = 0;
          const keywords = (card.keywords || []).map(k => String(k).toLowerCase());
          const ability = (card.ability || '').toLowerCase();
          const setCodeNumber = parseInt(card.setCode, 10);

          // Keyword scoring
          if (keywords.some(k => k.includes('rush'))) score += 3;
          if (keywords.some(k => k.includes('evasive'))) score += 2;
          if (keywords.some(k => k.includes('challenger'))) score += 2;
          if (keywords.some(k => k.includes('bodyguard'))) score += 1;
          if (keywords.some(k => k.includes('resist'))) score += 2;
          if (keywords.some(k => k.includes('singer'))) score += 2;
          if (keywords.some(k => k.includes('shift'))) score += 1;

          // Ability scoring
          if (ability.includes('draw')) score += 3;
          if (ability.includes('damage') || ability.includes('deal')) score += 2;
          if (ability.includes('banish')) score += 3;
          if (ability.includes('return')) score += 2;
          if (ability.includes('gain')) score += 1;

          // Lore value (higher is better for racing)
          score += (card.lore || 0) * 0.5;

          // Cost efficiency (prefer cards that give value)
          if (card.cost && card.lore) {
            const efficiency = card.lore / card.cost;
            if (efficiency > 0.5) score += 2;
          }

          // Slightly prioritize latest competitive printings
          if (Number.isFinite(setCodeNumber)) {
            if (setCodeNumber === preferredCompetitiveSet) score += 2.5;
            else if (setCodeNumber === preferredCompetitiveSet - 1) score += 1;
          }

          return { ...card, score };
        })
        .sort((a, b) => b.score - a.score);

      let selected = scored.slice(0, count);

      // Ensure latest-set possibilities are surfaced when available
      const hasLatestSetInSelected = selected.some(card => parseInt(card.setCode, 10) === preferredCompetitiveSet);
      if (!hasLatestSetInSelected) {
        const latestSetOption = scored.find(card => parseInt(card.setCode, 10) === preferredCompetitiveSet);
        if (latestSetOption && selected.length > 0) {
          selected[selected.length - 1] = latestSetOption;
        }
      }

      return selected
        .filter(card => {
          // Final validation: ensure card has valid ink matching deck colors
          const cardInk = card.ink;
          return typeof cardInk === 'string' && inks.includes(cardInk);
        });
    };

    // Start with strict archetype + cost matching, then relax if needed
    let candidates = buildCandidates(true, true);
    if (candidates.length === 0) {
      candidates = buildCandidates(false, true);
    }
    if (candidates.length === 0) {
      candidates = buildCandidates(false, false);
    }

    // Debug logging
    if (candidates.length > 0) {
      console.log(`Found ${candidates.length} card recommendations for ${inks.join('/')} ${archetype}`);
      console.log('Recommended cards:', candidates.map(c => `${c.name} (${c.ink})`));
    }

    return candidates;
  };

  const getDeckBuildingAdvice = (playstylePreferenceText = "") => {
    try {
      if (!analysis) return "No analysis available";

      const cardCount = analysis.total || 0;
      const avgCost = parseFloat(analysis.avgCost) || 4;
      const uniqueCount = analysis.uniqueCount || 0;
      const curve = analysis.curveDistribution || {};
      const cards = analysis.cards || {};
      const archetype = analysis.archetype || "Unknown";
      const desiredPlaystyle = inferDesiredPlaystyle(playstylePreferenceText);
      const recommendationArchetype = desiredPlaystyle || archetype;
      const inkColors = analysis.inkColors || {};
      const inks = Object.keys(inkColors);

      let advice = `DECK STATS:\n`;
      advice += `• Total cards: ${cardCount}\n`;
      advice += `• Unique cards: ${uniqueCount}\n`;
      advice += `• Average cost: ${avgCost}\n`;

      // Official Lorcana ink colors
      const officialInks = ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'];

      const colorCounts = {
        'Amber': 0,
        'Amethyst': 0,
        'Emerald': 0,
        'Ruby': 0,
        'Sapphire': 0,
        'Steel': 0
      };

      const colorPresenceCounts = {
        'Amber': 0,
        'Amethyst': 0,
        'Emerald': 0,
        'Ruby': 0,
        'Sapphire': 0,
        'Steel': 0
      };

      let dualInkCount = 0;

      const getCardColors = (cardName) => {
        const normalized = normalizeCardKey(cardName);
        if (!normalized) return null;
        const metaColor = cardMetaInkMap ? cardMetaInkMap.get(normalized) : null;
        if (metaColor) return [metaColor];
        return allCardsColorsMap ? allCardsColorsMap.get(normalized) || null : null;
      };

      Object.entries(cards).forEach(([cardName, count]) => {
        const colors = getCardColors(cardName);
        if (!colors || colors.length === 0) return;
        if (colors.length > 1) {
          dualInkCount += count;
          colors.forEach((color) => {
            if (officialInks.includes(color)) {
              colorPresenceCounts[color] = (colorPresenceCounts[color] || 0) + count;
            }
          });
          return;
        }
        const [color] = colors;
        if (color && officialInks.includes(color)) {
          colorCounts[color] = (colorCounts[color] || 0) + count;
          colorPresenceCounts[color] = (colorPresenceCounts[color] || 0) + count;
        }
      });

      const unknownCards = [];
      Object.entries(cards).forEach(([cardName, count]) => {
        const colors = getCardColors(cardName);
        if (!colors || colors.length === 0 || !colors.some((color) => officialInks.includes(color))) {
          unknownCards.push({ name: cardName, count });
        }
      });

      // Determine primary deck colors (cards with actual color assignments)
      const primaryColors = officialInks.filter(color => colorPresenceCounts[color] > 0);

      // Calculate how many cards are accounted for
      const accountedCards = Object.values(colorCounts).reduce((sum, count) => sum + count, 0) + dualInkCount;
      const unaccountedCards = cardCount - accountedCards;

      // Validate deck color count
      if (primaryColors.length > 2) {
        advice += `• ⚠️  WARNING: Deck has ${primaryColors.length} colors (${primaryColors.join(', ')})\n`;
        advice += `  Legal decks should be 1-2 colors only!\n`;
      } else if (primaryColors.length === 0) {
        advice += `• ⚠️  WARNING: No ink colors detected in deck\n`;
        advice += `  This usually means the card database needs updating\n`;
      } else {
        advice += `• Ink colors: ${primaryColors.join(' + ')}\n`;
      }

      advice += `\n  COLOR BREAKDOWN:\n`;

      // Show all 6 official colors
      officialInks.forEach(color => {
        const count = colorCounts[color];
        if (count > 0) {
          const percentage = cardCount > 0 ? ((count / cardCount) * 100).toFixed(1) : 0;
          const isPrimary = primaryColors.includes(color);
          advice += `  ${isPrimary ? '★' : ' '} ${color}: ${count} cards (${percentage}%)\n`;
        }
      });

      if (dualInkCount > 0) {
        const percentage = cardCount > 0 ? ((dualInkCount / cardCount) * 100).toFixed(1) : 0;
        advice += `  ◆ Dual Ink: ${dualInkCount} cards (${percentage}%)\n`;
      }

      // Show unaccounted cards if present  
      if (unaccountedCards > 0) {
        const percentage = cardCount > 0 ? ((unaccountedCards / cardCount) * 100).toFixed(1) : 0;
        advice += `  ⚠ Unknown: ${unaccountedCards} cards (${percentage}%)\n`;
        if (unaccountedCards > cardCount * 0.3) {
          advice += `     → Click "Analyze Deck" again to fetch colors from online database\n`;
        } else {
          advice += `     (Some cards missing from database)\n`;
        }
        if (unknownCards.length > 0) {
          const sample = unknownCards.slice(0, 10).map(entry => `${entry.count}x ${entry.name}`);
          advice += `     Unknown cards: ${sample.join(', ')}\n`;
        }
      } else if (accountedCards === cardCount && cardCount > 0) {
        advice += `  ✓ All cards identified with colors\n`;
      }

      advice += `\n`;

      // Create color object for recommendations using primary colors only
      const deckColors = {};
      primaryColors.forEach(color => {
        deckColors[color] = colorCounts[color];
      });

      const normalizeCardName = (value) => String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

      const getSetNameByNumber = (setNumber) => {
        const setInfo = allCardsData && allCardsData.sets && allCardsData.sets[String(setNumber)];
        return setInfo && setInfo.name ? setInfo.name : null;
      };

      const getLatestCompetitiveSetNumber = () => {
        const setsMap = allCardsData && allCardsData.sets ? allCardsData.sets : null;
        if (!setsMap) return 11;

        const formatKey = format === 'core' ? 'Core' : 'Infinity';
        const now = new Date();
        let bestSet = null;

        Object.entries(setsMap).forEach(([setKey, setInfo]) => {
          const setNumber = parseInt(setKey, 10);
          if (!Number.isFinite(setNumber)) return;
          if (!setInfo || setInfo.type !== 'expansion' || !setInfo.hasAllCards) return;

          const formatInfo = setInfo.allowedInFormats && setInfo.allowedInFormats[formatKey];
          if (formatInfo && formatInfo.allowed === false) return;

          if (setInfo.releaseDate) {
            const releaseDate = new Date(setInfo.releaseDate);
            if (!Number.isNaN(releaseDate.getTime()) && releaseDate > now) return;
          }

          if (bestSet === null || setNumber > bestSet) {
            bestSet = setNumber;
          }
        });

        return bestSet || 11;
      };

      const latestCompetitiveSet = getLatestCompetitiveSetNumber();
      const latestCompetitiveSetName = getSetNameByNumber(latestCompetitiveSet) || `Set ${latestCompetitiveSet}`;

      const getCardSetLabel = (card) => {
        if (card && card.setCode) {
          const setName = getSetNameByNumber(card.setCode);
          return setName ? `Set ${card.setCode} - ${setName}` : `Set ${card.setCode}`;
        }
        const mapping = cardSetsData && cardSetsData.cardSetMapping;
        if (mapping) {
          const key = normalizeCardName(card.simpleName || card.name || '');
          const sets = mapping[key];
          if (Array.isArray(sets) && sets.length > 0) {
            const labels = sets.map((setNumber) => {
              const setName = getSetNameByNumber(setNumber);
              return setName ? `Set ${setNumber} - ${setName}` : `Set ${setNumber}`;
            });
            return sets.length === 1 ? labels[0] : `Sets ${labels.join(', ')}`;
          }
        }
        return 'Set ?';
      };

      const getWhyForCard = (card) => {
        const keywordList = (card.keywords || []).map(k => String(k).toLowerCase());
        const ability = (card.ability || '').toLowerCase();
        const archetypeLower = (recommendationArchetype || '').toLowerCase();
        let why = '';

        if (archetypeLower.includes('tempo')) {
          if (card.cost >= 2 && card.cost <= 4) why += 'Efficient curve play maintains pressure. ';
          if (keywordList.some(k => k.includes('evasive'))) why += 'Evasive guarantees lore generation. ';
          if (ability.includes('draw')) why += 'Card advantage sustains tempo. ';
          if (ability.includes('return') || ability.includes('bounce')) why += 'Disruption creates mana advantage. ';
          if (keywordList.some(k => k.includes('challenger'))) why += 'Challenger removes blockers efficiently. ';
        } else if (archetypeLower.includes('aggro')) {
          if (card.cost <= 2) why += 'Early threat builds pressure. ';
          if (keywordList.some(k => k.includes('rush'))) why += 'Rush provides immediate impact. ';
          if (keywordList.some(k => k.includes('evasive'))) why += 'Evasive ensures damage. ';
          if (card.lore >= 2) why += 'Strong lore accelerates win. ';
        } else if (archetypeLower.includes('control')) {
          if (ability.includes('banish') || ability.includes('return')) why += 'Removal controls board. ';
          if (ability.includes('draw')) why += 'Card advantage wins long games. ';
          if (card.cost >= 5) why += 'High-cost threat closes games. ';
          if (keywordList.some(k => k.includes('resist'))) why += 'Resist maintains board presence. ';
        } else {
          if (keywordList.some(k => k.includes('challenger'))) why += 'Challenger trades favorably. ';
          if (ability.includes('when you play')) why += 'Triggers generate value. ';
          if (card.cost >= 3 && card.cost <= 5) why += 'Efficient mid-curve play. ';
        }

        if (!why) {
          if (card.cost && card.cost <= 2) why += 'Early curve play. ';
          if (card.lore >= 2) why += 'Solid lore contribution. ';
        }

        return why.trim() || 'Solid fit for your colors and curve.';
      };

      advice += `• Cost 1: ${curve.cost1 || 0}\n`;
      advice += `• Cost 5+: ${curve.cost5Plus || 0}\n`;
      advice += `• Archetype: ${archetype}\n\n`;

      if (desiredPlaystyle) {
        advice += `• Recommendation profile: ${desiredPlaystyle} (user-requested)\n`;
        advice += `  Suggestions are optimized for this playstyle while preserving your deck colors/format legality.\n\n`;
      }

      // Find matching strategy guide
      let strategyGuide = null;
      if (Array.isArray(strategicGuides) && strategicGuides.length > 0) {
        strategyGuide = strategicGuides.find(guide =>
          guide.name && archetype.toLowerCase().includes(guide.name.toLowerCase().split(/\s+/)[0])
        );
      }

      // Analyze cards for specific recommendations
      const cardList = Object.entries(cards).map(([name, count]) => ({ name, count }));

      // Find high-cost cards to potentially remove
      const expensiveCards = cardList
        .filter(c => c.count === 1 && c.name.length > 25)
        .sort((a, b) => b.name.length - a.name.length)
        .slice(0, 3);

      // Find low-cost cards we have multiples of
      const lowCostCards = cardList
        .filter(c => c.count >= 2 && c.name.length < 20 && !c.name.toLowerCase().includes('action'))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      advice += `CARD-SPECIFIC RECOMMENDATIONS:\n\n`;

      // Generate recommendations based on archetype strategy
      if (strategyGuide) {
        advice += `STRATEGY: ${strategyGuide.description || ''}\n`;
        advice += `KEY PRINCIPLES: ${strategyGuide.keyPrinciples?.join(', ') || 'Balance and efficiency'}\n\n`;
      }

      // Recommendations based on curve issues
      if ((curve.cost1 || 0) < 5) {
        advice += `LOW EARLY GAME PRESSURE (${curve.cost1 || 0} cost-1s):\n`;
        advice += `WHY THIS MATTERS: Early plays establish board presence and tempo.\n\n`;

        advice += `SUGGESTED CARD SWAPS:\n`;
        const earlyDrops = findCardRecommendations(deckColors, recommendationArchetype, 1, 3, format);
        if (earlyDrops.length > 0 && expensiveCards.length > 0) {
          const swapCount = Math.min(earlyDrops.length, expensiveCards.length);
          for (let i = 0; i < swapCount; i++) {
            const removeCard = expensiveCards[i];
            const addCard = earlyDrops[i];
            advice += `SWAP ${i + 1}: Replace "${removeCard.name}" with "${addCard.name}"\n`;
            advice += `   REMOVE: ${removeCard.name}\n`;
            advice += `     -> High-cost card conflicts with early game strategy\n`;
            advice += `   ADD: ${addCard.name} (Cost ${addCard.cost})\n`;
            advice += `     -> Ink: ${addCard.ink || 'Any'} | Cost: ${addCard.cost || 0} | Lore: ${addCard.lore || 0} | Type: ${addCard.type}\n`;
            advice += `     -> ${getCardSetLabel(addCard)}\n`;
            advice += `     -> Why: ${getWhyForCard(addCard)}\n`;
            const keywords = (addCard.keywords || []).filter(k => k && k !== '[object Object]').join(', ');
            if (keywords) advice += `     -> Keywords: ${keywords}\n`;
            if (addCard.ability) {
              const abilityShort = addCard.ability.length > 80 ? addCard.ability.substring(0, 77) + '...' : addCard.ability;
              advice += `     -> Ability: ${abilityShort}\n`;
            }
            advice += `   WHY THIS SWAP: `;
            if (addCard.cost <= 1) advice += `Turn 1 play establishes early board presence. `;
            if ((addCard.keywords || []).some(k => String(k).toLowerCase().includes('rush'))) advice += `Rush impacts board immediately. `;
            if ((addCard.keywords || []).some(k => String(k).toLowerCase().includes('evasive'))) advice += `Evasive ensures damage gets through. `;
            if (addCard.lore && addCard.lore >= 2) advice += `High lore accelerates win condition. `;
            advice += `\n\n`;
          }
          // Show remaining recommendations if more adds than removes
          if (earlyDrops.length > expensiveCards.length) {
            advice += `ADDITIONAL CONSIDERATIONS:\n`;
            for (let i = expensiveCards.length; i < earlyDrops.length; i++) {
              const card = earlyDrops[i];
              advice += `• ${card.name} (Cost ${card.cost}) - ${card.ink || 'Any'} ink - ${getCardSetLabel(card)} - Why: ${getWhyForCard(card)}\n`;
            }
            advice += `\n`;
          }
        } else if (earlyDrops.length > 0) {
          advice += `Consider adding these early drops:\n`;
          earlyDrops.forEach((card, i) => {
            advice += `${i + 1}. ${card.name} (Cost ${card.cost}) - ${card.ink || 'Any'} ink - ${getCardSetLabel(card)} - Why: ${getWhyForCard(card)}\n`;
          });
          advice += `\n`;
        } else {
          advice += `  -> Strategy: Add early game plays (cost 1-2) to establish board control\n\n`;
        }
      }

      // Late game recommendations
      if ((curve.cost5Plus || 0) < 4) {
        advice += `MISSING FINISHERS (${curve.cost5Plus || 0} cost-5+):\n`;
        advice += `WHY THIS MATTERS: Close-out cards take over mid-to-late game.\n\n`;

        advice += `SUGGESTED CARD SWAPS:\n`;
        const finishers = findCardRecommendations(deckColors, recommendationArchetype, 5, 3, format);
        if (finishers.length > 0 && lowCostCards.length > 0) {
          const swapCount = Math.min(finishers.length, lowCostCards.length);
          for (let i = 0; i < swapCount; i++) {
            const removeCard = lowCostCards[i];
            const addCard = finishers[i];
            advice += `SWAP ${i + 1}: Replace "${removeCard.name}" with "${addCard.name}"\n`;
            advice += `   REMOVE: ${removeCard.count}x ${removeCard.name}\n`;
            advice += `     -> High copy count (${removeCard.count}) creates redundancy\n`;
            advice += `   ADD: ${addCard.name} (Cost ${addCard.cost})\n`;
            advice += `     -> Ink: ${addCard.ink || 'Any'} | Cost: ${addCard.cost || 0} | Lore: ${addCard.lore || 0} | Type: ${addCard.type}\n`;
            advice += `     -> ${getCardSetLabel(addCard)}\n`;
            advice += `     -> Why: ${getWhyForCard(addCard)}\n`;
            const keywords = (addCard.keywords || []).filter(k => k && k !== '[object Object]').join(', ');
            if (keywords) advice += `     -> Keywords: ${keywords}\n`;
            if (addCard.ability) {
              const abilityShort = addCard.ability.length > 80 ? addCard.ability.substring(0, 77) + '...' : addCard.ability;
              advice += `     -> Ability: ${abilityShort}\n`;
            }
            advice += `   WHY THIS SWAP: `;
            if (addCard.cost >= 5) advice += `High-cost threat takes over late game. `;
            if ((addCard.keywords || []).some(k => String(k).toLowerCase().includes('challenger'))) advice += `Challenger removes key pieces. `;
            if ((addCard.ability || '').toLowerCase().includes('banish')) advice += `Removal clears path to victory. `;
            if ((addCard.ability || '').toLowerCase().includes('draw')) advice += `Card advantage seals games. `;
            if (addCard.lore && addCard.lore >= 3) advice += `High lore closes out games fast. `;
            advice += `\n\n`;
          }
          // Show remaining recommendations
          if (finishers.length > lowCostCards.length) {
            advice += `ADDITIONAL CONSIDERATIONS:\n`;
            for (let i = lowCostCards.length; i < finishers.length; i++) {
              const card = finishers[i];
              advice += `• ${card.name} (Cost ${card.cost}) - ${card.ink || 'Any'} ink - ${getCardSetLabel(card)} - Why: ${getWhyForCard(card)}\n`;
            }
            advice += `\n`;
          }
        } else if (finishers.length > 0) {
          advice += `Consider adding these finishers:\n`;
          finishers.forEach((card, i) => {
            advice += `${i + 1}. ${card.name} (Cost ${card.cost}) - ${card.ink || 'Any'} ink - ${getCardSetLabel(card)} - Why: ${getWhyForCard(card)}\n`;
          });
          advice += `\n`;
        } else {
          advice += `  -> Strategy: Add high-cost threats (cost 5+) to close out games\n\n`;
        }
      }

      // Curve balance
      if (avgCost > 4.8) {
        advice += `CURVE TOO HIGH (Average: ${avgCost}):\n`;
        advice += `WHY THIS MATTERS: High curve = slow deck that loses to tempo.\n\n`;

        const slowCards = cardList
          .filter(c => c.name.length > 28 || c.name.toLowerCase().includes('legendary'))
          .slice(0, 3);

        advice += `SUGGESTED CARD SWAPS:\n`;
        const midCards = findCardRecommendations(deckColors, recommendationArchetype, 3, 3, format);
        if (midCards.length > 0 && slowCards.length > 0) {
          const swapCount = Math.min(midCards.length, slowCards.length);
          for (let i = 0; i < swapCount; i++) {
            const removeCard = slowCards[i];
            const addCard = midCards[i];
            advice += `SWAP ${i + 1}: Replace "${removeCard.name}" with "${addCard.name}"\n`;
            advice += `   REMOVE: ${removeCard.name}\n`;
            advice += `     -> Expensive/slow card clogs hand early\n`;
            advice += `   ADD: ${addCard.name} (Cost ${addCard.cost})\n`;
            advice += `     -> Ink: ${addCard.ink || 'Any'} | Cost: ${addCard.cost || 0} | Lore: ${addCard.lore || 0} | Type: ${addCard.type}\n`;
            advice += `     -> ${getCardSetLabel(addCard)}\n`;
            advice += `     -> Why: ${getWhyForCard(addCard)}\n`;
            const keywords = (addCard.keywords || []).filter(k => k && k !== '[object Object]').join(', ');
            if (keywords) advice += `     -> Keywords: ${keywords}\n`;
            if (addCard.ability) {
              const abilityShort = addCard.ability.length > 80 ? addCard.ability.substring(0, 77) + '...' : addCard.ability;
              advice += `     -> Ability: ${abilityShort}\n`;
            }
            advice += `   WHY THIS SWAP: Lower curve enables consistent plays every turn. `;
            if ((addCard.keywords || []).some(k => String(k).toLowerCase().includes('challenger'))) advice += `Challenger controls board. `;
            if ((addCard.keywords || []).some(k => String(k).toLowerCase().includes('bodyguard'))) advice += `Bodyguard protects key pieces. `;
            if (addCard.lore && addCard.lore >= 2) advice += `Solid lore contributes to win. `;
            advice += `\n\n`;
          }
          // Show remaining recommendations
          if (midCards.length > slowCards.length) {
            advice += `ADDITIONAL CONSIDERATIONS:\n`;
            for (let i = slowCards.length; i < midCards.length; i++) {
              const card = midCards[i];
              advice += `• ${card.name} (Cost ${card.cost}) - ${card.ink || 'Any'} ink - ${getCardSetLabel(card)} - Why: ${getWhyForCard(card)}\n`;
            }
            advice += `\n`;
          }
        } else if (midCards.length > 0) {
          advice += `Consider adding these mid-cost cards:\n`;
          midCards.forEach((card, i) => {
            advice += `${i + 1}. ${card.name} (Cost ${card.cost}) - ${card.ink || 'Any'} ink - ${getCardSetLabel(card)} - Why: ${getWhyForCard(card)}\n`;
          });
          advice += `\n`;
        } else {
          advice += `  -> Strategy: Add mid-cost plays (cost 3-4) for consistent curve\n\n`;
        }
      }

      // Deck size issue
      if (cardCount > 60) {
        advice += `DECK SIZE ISSUE (${cardCount} cards, max 60):\n`;
        advice += `REMOVE: ${cardCount - 60} weakest cards\n`;
        advice += `  -> Why: Dilutes deck quality and consistency\n`;
        advice += `  -> Gameplay Impact: Higher chance of drawing power plays\n\n`;
      } else if (cardCount < 60) {
        advice += `DECK SIZE:\n`;
        advice += `ADD: ${60 - cardCount} more cards\n`;
        advice += `  -> Fill with: Early plays first, then finishers\n\n`;
      }

      // Overall strategy summary
      advice += `OVERALL STRATEGY:\n`;
      if (archetype.toLowerCase().includes('tempo')) {
        advice += `• Efficient plays: Win through mana advantage\n`;
        advice += `• Curve focus: Load turns 2-4 with efficient threats\n`;
        advice += `• Card choices: Evasive creatures and card draw/disruption\n`;
        advice += `• Key principle: Play on curve, never waste mana\n`;
      } else if (archetype.toLowerCase().includes('aggro')) {
        advice += `• Fast clock: Win by turn 5-6\n`;
        advice += `• Curve focus: Load turns 1-3 heavily\n`;
        advice += `• Card choices: Every card should apply pressure\n`;
      } else if (archetype.toLowerCase().includes('control')) {
        advice += `• Survival: Answer opponent threats\n`;
        advice += `• Curve focus: Load turns 4+ with answers\n`;
        advice += `• Card choices: Removal and board wipes\n`;
      } else if (archetype.toLowerCase().includes('midrange')) {
        advice += `• Balanced: Threats that trade well\n`;
        advice += `• Curve focus: Spread across 1-5\n`;
        advice += `• Card choices: Efficient threats with upside\n`;
      } else {
        advice += `• Consistency: Cut weak cards\n`;
        advice += `• Curve focus: Balance early/mid/late game\n`;
        advice += `• Card choices: Synergistic and efficient\n`;
      }

      const resolveMetaForFormat = (formatKey = 'infinity') => {
        const formatMap = {
          core: 'coreConstructed',
          infinity: 'infinity',
          sealed: 'sealed',
        };
        const mappedFormat = formatMap[formatKey] || 'infinity';
        const formatData = competitiveMeta?.formats?.[mappedFormat] || null;
        const fallbackTopDecks = Array.isArray(competitiveMeta?.topDecks) ? competitiveMeta.topDecks : [];
        const fallbackPlayTips = Array.isArray(competitiveMeta?.playTips) ? competitiveMeta.playTips : [];

        return {
          topDecks: Array.isArray(formatData?.topDecks) && formatData.topDecks.length > 0 ? formatData.topDecks : fallbackTopDecks,
          playTips: Array.isArray(formatData?.playTips) && formatData.playTips.length > 0 ? formatData.playTips : fallbackPlayTips,
          lastUpdated: competitiveMeta?.lastUpdated || null,
          source: competitiveMeta?.source || null,
          dlcEvents: Array.isArray(competitiveMeta?.dlcEvents) ? competitiveMeta.dlcEvents : [],
        };
      };

      const metaContext = resolveMetaForFormat(format);

      // Add competitive recommendations section
      advice += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      advice += `COMPETITIVE CARD POOL ANALYSIS\n`;
      advice += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      const formatSetWindow = format === 'core' ? 'Core Constructed (Sets 5-11)' : 'Infinity (Sets 1-11)';
      advice += `FORMAT GUARDRAILS: ${formatSetWindow}\n`;
      advice += `Suggestions and swap candidates below are aligned to this format window.\n\n`;

      // Show top cards for the archetype/ink combination
      advice += `TOP CARDS FOR YOUR ${recommendationArchetype.toUpperCase()} PLAN:\n`;
      if (primaryColors.length > 0) {
        advice += `Searching: ${primaryColors.join(' + ')} ink cards only\n`;
        advice += `(Recommendations are strictly filtered to match your deck colors)\n`;
        advice += `(Includes latest competitive set possibilities: Set ${latestCompetitiveSet} - ${latestCompetitiveSetName})\n`;
        if (primaryColors.length > 2) {
          advice += `⚠️  WARNING: 3+ color decks are not legal - recommendations may be limited\n`;
        }
        advice += `\n`;
      } else {
        advice += `(Warning: No ink colors detected - cannot provide recommendations)\n\n`;
      }

      // Get general recommendations across all costs
      const topCards = findCardRecommendations(deckColors, recommendationArchetype, null, 8, format);
      if (topCards.length > 0) {
        topCards.slice(0, 5).forEach((card, i) => {
          const isLatestSet = parseInt(card.setCode, 10) === latestCompetitiveSet;
          advice += `${i + 1}. ${card.name} (${card.cost} cost)\n`;
          advice += `   Ink: ${card.ink || 'Any'} | Cost: ${card.cost || 0} | Lore: ${card.lore || 0}\n`;
          advice += `   Set: ${getCardSetLabel(card)}\n`;
          if (isLatestSet) {
            advice += `   Latest Set Candidate: Yes (Set ${latestCompetitiveSet} - ${latestCompetitiveSetName})\n`;
          }
          const keywords = (card.keywords || []).filter(k => k && k !== '[object Object]').slice(0, 3).join(', ');
          if (keywords) advice += `   Keywords: ${keywords}\n`;
          advice += `   Why: ${getWhyForCard(card)}\n\n`;
        });
      } else {
        advice += `No specific card recommendations found.\n`;
        advice += `This might mean:\n`;
        advice += `• The database doesn't have many cards matching your ink colors (${primaryColors.join(' + ')})\n`;
        advice += `• Your archetype (${archetype}) has very specific requirements\n`;
        advice += `• Check the console for debugging information\n\n`;
      }

      // Actionable swap plan from existing deck -> competitive pool
      advice += `COMPETITIVE SWAP PLAN (WHAT TO CUT / WHAT TO ADD):\n`;

      const legalSetMin = format === 'core' ? 5 : 1;
      const legalSetMax = 11;

      const getCardSetsForDeckCard = (cardName) => {
        const mapping = cardSetsData && cardSetsData.cardSetMapping;
        if (!mapping) return [];
        const key = normalizeCardName(cardName);
        const sets = mapping[key];
        return Array.isArray(sets) ? sets : [];
      };

      const getDeckCardMeta = (cardName) => {
        const key = normalizeCardName(cardName);
        return cardMeta && cardMeta[key] ? cardMeta[key] : null;
      };

      const getRemovalReason = (entry) => {
        if (entry.illegalInFormat) {
          return `Not legal for ${formatSetWindow}`;
        }
        if (entry.unknownSet) {
          return 'Unknown set mapping - replace with confirmed legal/meta option';
        }
        if (entry.highCurvePenalty > 0) {
          return 'Curve pressure: card likely too slow for your current competitive plan';
        }
        if (entry.duplicatePenalty > 0) {
          return 'Overrepresented slot - reduce redundancy for higher-impact options';
        }
        return 'Lower competitive impact relative to current meta options';
      };

      const removalCandidates = cardList
        .map((entry) => {
          const sets = getCardSetsForDeckCard(entry.name);
          const meta = getDeckCardMeta(entry.name);
          const cost = typeof meta?.cost === 'number' ? meta.cost : null;
          const unknownSet = sets.length === 0;
          const hasLegalSet = sets.some((setNum) => setNum >= legalSetMin && setNum <= legalSetMax);
          const illegalInFormat = !unknownSet && !hasLegalSet;

          let highCurvePenalty = 0;
          const archetypeLower = (recommendationArchetype || '').toLowerCase();
          if (typeof cost === 'number') {
            if (archetypeLower.includes('aggro') && cost >= 5) highCurvePenalty += 14;
            if (archetypeLower.includes('tempo') && cost >= 6) highCurvePenalty += 12;
            if (archetypeLower.includes('control') && cost <= 1) highCurvePenalty += 8;
            if (archetypeLower.includes('midrange') && cost >= 7) highCurvePenalty += 10;
          }

          const duplicatePenalty = entry.count > 3 ? 6 : 0;

          let removeScore = 0;
          if (illegalInFormat) removeScore += 100;
          if (unknownSet) removeScore += 18;
          removeScore += highCurvePenalty;
          removeScore += duplicatePenalty;

          return {
            ...entry,
            sets,
            cost,
            unknownSet,
            illegalInFormat,
            highCurvePenalty,
            duplicatePenalty,
            removeScore,
          };
        })
        .sort((a, b) => b.removeScore - a.removeScore);

      const addCandidates = topCards.slice(0, 5);
      const usedRemovals = new Set();
      const swapLines = [];

      addCandidates.forEach((addCard) => {
        const addNameKey = normalizeCardName(addCard.name || addCard.simpleName || '');
        const removal = removalCandidates.find((candidate, idx) => {
          if (usedRemovals.has(idx)) return false;
          const removeNameKey = normalizeCardName(candidate.name || '');
          if (removeNameKey && removeNameKey === addNameKey) return false;
          return candidate.removeScore > 0;
        });

        if (!removal) return;
        const removeIndex = removalCandidates.indexOf(removal);
        if (removeIndex >= 0) usedRemovals.add(removeIndex);

        const removeReason = getRemovalReason(removal);
        const addReason = getWhyForCard(addCard);
        swapLines.push({ removal, addCard, removeReason, addReason });
      });

      if (swapLines.length > 0) {
        swapLines.forEach((swap, index) => {
          const removeSetLabel = swap.removal.sets.length > 0
            ? `Sets ${swap.removal.sets.join(', ')}`
            : 'Set unknown';
          advice += `${index + 1}. OUT: ${swap.removal.count}x ${swap.removal.name} (${removeSetLabel})\n`;
          advice += `   WHY CUT: ${swap.removeReason}\n`;
          advice += `   IN: ${swap.addCard.name} (${getCardSetLabel(swap.addCard)})\n`;
          advice += `   WHY ADD: ${swap.addReason}\n\n`;
        });
      } else {
        advice += `No high-confidence cut/add pairs found from current list.\n`;
        advice += `Your deck appears broadly aligned with ${formatSetWindow} legality and current recommendation profile.\n\n`;
      }

      const illegalCards = removalCandidates.filter((candidate) => candidate.illegalInFormat);
      if (illegalCards.length > 0) {
        advice += `FORMAT LEGALITY ALERTS:\n`;
        illegalCards.slice(0, 6).forEach((card) => {
          advice += `• ${card.name}: sets [${card.sets.join(', ')}] are outside ${formatSetWindow}\n`;
        });
        advice += `\n`;
      }

      // Add synergy suggestions based on deck composition
      advice += `SYNERGY OPPORTUNITIES:\n`;
      const currentCards = Object.keys(cards).map(k => k.toLowerCase());

      if (currentCards.some(c => c.includes('singer') || c.includes('song'))) {
        advice += `\u2022 Singer/Song Synergy: Look for more Singers or Songs to maximize free plays\\n`;
      }
      if (primaryColors.length === 2) {
        advice += `\u2022 Two-Color Advantage: You have access to ${primaryColors[0]} and ${primaryColors[1]} card pools\\n`;
        advice += `  Consider cards that reward color commitment\\n`;
      }
      if (primaryColors.length === 1) {
        advice += `\u2022 Mono-Color Focus: Single color deck with maximum consistency\\n`;
        advice += `  Consider adding a second color for more card options\\n`;
      }
      const hasShift = currentCards.some(c => c.includes('shift'));
      if (hasShift) {
        advice += `\u2022 Shift Value: Build around characters with multiple versions for cost reduction\\n`;
      }

      // Online competitive insights
      if ((metaContext.topDecks && metaContext.topDecks.length > 0) || (metaContext.playTips && metaContext.playTips.length > 0)) {
        advice += `\nCOMPETITIVE META INSIGHTS:\n`;
        if (metaContext.lastUpdated) {
          advice += `\u2022 Snapshot Date: ${metaContext.lastUpdated}\n`;
        }
        if (metaContext.source) {
          advice += `\u2022 Data Source: ${metaContext.source}\n`;
        }

        if (metaContext.topDecks.length > 0) {
          advice += `\u2022 Top DLC Decks Right Now:\n`;
          metaContext.topDecks.slice(0, 3).forEach((deck, idx) => {
            const rate = deck.winRate || deck.winrate || '—';
            advice += `   ${idx + 1}) ${deck.name} (${rate} WR)\n`;
          });
        }

        if (metaContext.playTips.length > 0) {
          advice += `\u2022 Current Meta Priorities:\n`;
          metaContext.playTips.slice(0, 3).forEach((tip) => {
            advice += `   - ${tip}\n`;
          });
        }

        if (archetype.toLowerCase().includes('tempo')) {
          advice += `\u2022 Tempo Meta: Prioritize 2-4 cost creatures with evasion or card advantage\n`;
          advice += `\u2022 Key Cards: Efficient threats that generate value, bounce/draw effects\n`;
          advice += `\u2022 Play Pattern: Curve out perfectly, never miss a turn, disrupt opponent\n`;
        } else if (archetype.toLowerCase().includes('aggro')) {
          advice += `\u2022 Aggro Meta: Prioritize 1-3 drops with evasion or rush\n`;
          advice += `\u2022 Key Cards: Look for cheap creatures that generate lore quickly\n`;
        } else if (archetype.toLowerCase().includes('control')) {
          advice += `\u2022 Control Meta: Banish effects and card draw engines are essential\n`;
          advice += `\u2022 Key Cards: Actions that answer multiple threats, high-lore finishers\n`;
        } else {
          advice += `\u2022 Midrange Meta: Balance threats and answers, avoid being too slow\n`;
          advice += `\u2022 Key Cards: Efficient creatures with keywords, flexible answers\n`;
        }
      }

      advice += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

      return advice;
    } catch (error) {
      console.error("Error in getDeckBuildingAdvice:", error);
      return `Error: ${error.message}`;
    }
  };

  const getMatchupAdvice = () => {
    try {
      if (!analysis) return "No analysis available";

      const archetype = analysis.archetype || "Unknown";
      let advice = `Your deck archetype: ${archetype}\n\n`;

      advice += `FAVORABLE MATCHUPS:\n`;
      advice += `• Aggro (slower than you)\n`;
      advice += `• Midrange mirrors\n\n`;

      advice += `UNFAVORABLE MATCHUPS:\n`;
      advice += `• Pure control\n`;
      advice += `• Combo decks\n`;

      return advice;
    } catch (error) {
      console.error("Error in getMatchupAdvice:", error);
      return `Error: ${error.message}`;
    }
  };

  const getMetaAnalysis = () => {
    try {
      let metaText = `CURRENT META ANALYSIS:\n\n`;

      const formatMap = {
        core: 'coreConstructed',
        infinity: 'infinity',
        sealed: 'sealed',
      };
      const mappedFormat = formatMap[format] || 'infinity';
      const formatData = competitiveMeta?.formats?.[mappedFormat] || null;

      const resolvedTopDecks =
        (formatData && Array.isArray(formatData.topDecks) && formatData.topDecks) ||
        (competitiveMeta && Array.isArray(competitiveMeta.topDecks) && competitiveMeta.topDecks) ||
        null;

      const resolvedPlayTips =
        (formatData && Array.isArray(formatData.playTips) && formatData.playTips) ||
        (competitiveMeta && Array.isArray(competitiveMeta.playTips) && competitiveMeta.playTips) ||
        [];

      if (competitiveMeta?.lastUpdated || competitiveMeta?.source) {
        if (competitiveMeta?.lastUpdated) {
          metaText += `Last Updated: ${competitiveMeta.lastUpdated}\n`;
        }
        if (competitiveMeta?.source) {
          metaText += `Source: ${competitiveMeta.source}\n`;
        }
        metaText += `\n`;
      }

      if (resolvedTopDecks && resolvedTopDecks.length > 0) {
        metaText += `TOP ARCHETYPES:\n`;
        resolvedTopDecks.slice(0, 5).forEach((deck, idx) => {
          const rate = deck.winRate || deck.winrate || "—";
          metaText += `${idx + 1}. ${deck.name} (${rate} WR)\n`;
        });
      } else {
        metaText += `DEFAULT META (No loaded data):\n`;
        metaText += `1. Control - 35% meta share\n`;
        metaText += `2. Midrange - 28% meta share\n`;
        metaText += `3. Aggro - 22% meta share\n`;
        metaText += `4. Combo - 15% meta share\n`;
      }

      metaText += `\nRECOMMENDATIONS:\n`;
      if (resolvedPlayTips.length > 0) {
        resolvedPlayTips.slice(0, 3).forEach((tip) => {
          metaText += `• ${tip}\n`;
        });
      } else {
        metaText += `• Target the top 3 archetypes\n`;
        metaText += `• Watch tournament results\n`;
      }

      return metaText;
    } catch (error) {
      console.error("Error in getMetaAnalysis:", error);
      return `Error: ${error.message}`;
    }
  };

  const getStrategyGuide = () => {
    try {
      if (!analysis) return "No analysis available";

      const cardNames = Object.keys(analysis.cards || {});
      const detected = detectPlaystyleFuzzy(cardNames, playstyles) || "Unknown";
      let strategy = `STRATEGY FOR: ${detected.toUpperCase()}\n\n`;

      strategy += `EARLY GAME:\n`;
      strategy += `• Establish board presence\n`;
      strategy += `• Trade favorably\n`;
      strategy += `• Save interaction\n\n`;

      strategy += `MID GAME:\n`;
      strategy += `• Push advantage\n`;
      strategy += `• Set up finish\n`;
      strategy += `• Play around removal\n\n`;

      strategy += `LATE GAME:\n`;
      strategy += `• Deploy finishers\n`;
      strategy += `• Protect threats\n`;
      strategy += `• Close games\n`;

      return strategy;
    } catch (error) {
      console.error("Error in getStrategyGuide:", error);
      return `Error: ${error.message}`;
    }
  };

  const getInkweaverCoaching = () => {
    if (!analysis) {
      setCoaching("Please analyze a deck first.");
      return;
    }

    let text = "";
    console.log("Mode:", mode);

    if (mode === "overview") {
      console.log("Overview mode selected");
      text = `✨ INKWEAVER'S GUIDANCE\n`;
      text += `═══════════════════════════════════════════════════════\n\n`;

      const cardCount = analysis.total || 0;
      const avgCost = parseFloat(analysis.avgCost) || 4;
      const uniqueCount = analysis.uniqueCount || 0;
      const archetype = analysis.archetype || "Unknown";

      // Deck size check
      const targetSize = format === "sealed" ? 40 : 60;
      const sizeOk =
        format === "sealed" ? cardCount >= 40 : cardCount === 60;

      text += `📊 DECK COMPOSITION\n`;
      text += `${sizeOk ? "✓" : "✗"} Total Cards: ${cardCount} / ${format === "sealed" ? "40+" : "60"}\n`;
      text += `• Unique Cards: ${uniqueCount}\n`;
      text += `• Average Cost: ${avgCost.toFixed(2)}\n`;
      text += `• Archetype: ${archetype}\n\n`;

      if (!sizeOk) {
        if (format === "sealed" && cardCount < 40) {
          text += `⚠️  Add ${40 - cardCount} more cards for sealed (minimum 40).\n\n`;
        } else if (format !== "sealed" && cardCount !== 60) {
          text += `⚠️  Deck needs exactly 60 cards. You have ${cardCount}.\n\n`;
        }
      }

      // Curve analysis
      const curve = analysis.curveDistribution || {};
      text += `📈 MANA CURVE\n`;
      text += `• Cost 1: ${curve.cost1 || 0}\n`;
      text += `• Cost 2: ${curve.cost2 || 0}\n`;
      text += `• Cost 3-4: ${curve.cost3to4 || 0}\n`;
      text += `• Cost 5+: ${curve.cost5Plus || 0}\n\n`;

      // Playstyle detection
      const cardNames = Object.keys(analysis.cards || {});
      const detectedPlaystyle = detectPlaystyleFuzzy(cardNames, playstyles);
      text += `🎯 PLAYSTYLE DETECTED\n`;
      text += `• Primary: ${detectedPlaystyle}\n\n`;

      // Recommendations
      text += `💡 RECOMMENDATIONS\n`;

      if (avgCost < 3) {
        text += `• Your curve is too fast (${avgCost.toFixed(2)}). Add bigger finishers.\n`;
      } else if (avgCost > 4.5) {
        text += `• Your curve is too slow (${avgCost.toFixed(2)}). Add early creatures.\n`;
      } else {
        text += `• Good curve balance at ${avgCost.toFixed(2)}. ✓\n`;
      }

      if ((curve.cost1 || 0) < 4) {
        text += `• Need more 1-cost creatures (${curve.cost1 || 0} is low).\n`;
      }

      if ((curve.cost5Plus || 0) < 3) {
        text += `• Need more finishers (cost 5+).\n`;
      } else {
        text += `• Good finisher count. ✓\n`;
      }

      text += `\n`;

      // Format-specific
      if (format === "core") {
        text += `📋 CORE CONSTRUCTED (Sets 5-11 only)\n`;
        text += `Make sure all your cards are from the legal sets!\n\n`;
      }

      text += `═══════════════════════════════════════════════════════\n`;
      text += `Good luck conquering the Inklands! 🎭`;
    } else if (mode === "deckbuilding") {
      console.log("Deck building mode selected");
      try {
        const advice = getDeckBuildingAdvice();
        console.log("Got advice:", advice);
        text = `🛠️ DECK BUILDING SUGGESTIONS\n`;
        text += `═══════════════════════════════════════════════════════\n\n`;
        text += advice;
        text += `\n═══════════════════════════════════════════════════════`;
      } catch (error) {
        console.error("Error in deck building:", error);
        text = `Error generating deck building advice: ${error.message}`;
      }
    } else if (mode === "meta") {
      console.log("Meta mode selected");
      try {
        const metaText = getMetaAnalysis();
        console.log("Got meta:", metaText);
        text = `📊 COMPETITIVE META ANALYSIS\n`;
        text += `═══════════════════════════════════════════════════════\n\n`;
        text += metaText;
        text += `\n═══════════════════════════════════════════════════════`;
      } catch (error) {
        console.error("Error in meta analysis:", error);
        text = `Error generating meta analysis: ${error.message}`;
      }
    } else if (mode === "matchup") {
      console.log("Matchup mode selected");
      try {
        const matchup = getMatchupAdvice();
        console.log("Got matchup:", matchup);
        text = `🎯 MATCHUP STRATEGY & ANALYSIS\n`;
        text += `═══════════════════════════════════════════════════════\n\n`;
        text += matchup;
        text += `\n═══════════════════════════════════════════════════════`;
      } catch (error) {
        console.error("Error in matchup:", error);
        text = `Error generating matchup advice: ${error.message}`;
      }
    }

    console.log("Final text to display:", text);
    setCoaching(text);
  };

  const getPlaystyleAnalysis = () => {
    try {
      if (!analysis) return "No analysis available";

      const cardNames = Object.keys(analysis.cards || {});
      const detectedPlaystyle = detectPlaystyleFuzzy(cardNames, playstyles);
      const playstyleData = playstyles.find(p => p.name?.toLowerCase() === detectedPlaystyle.toLowerCase());

      let analysis_text = `🎭 PLAYSTYLE ANALYSIS: ${detectedPlaystyle.toUpperCase()}\n\n`;

      if (playstyleData) {
        analysis_text += `DESCRIPTION:\n${playstyleData.description || 'A flexible deck archetype.'}\n\n`;

        if (playstyleData.keyCards && playstyleData.keyCards.length > 0) {
          analysis_text += `KEY CARDS FOR THIS PLAYSTYLE:\n`;
          playstyleData.keyCards.slice(0, 5).forEach(card => {
            analysis_text += `• ${card}\n`;
          });
          analysis_text += `\n`;
        }

        if (playstyleData.strengths && playstyleData.strengths.length > 0) {
          analysis_text += `STRENGTHS:\n`;
          playstyleData.strengths.forEach(str => {
            analysis_text += `✓ ${str}\n`;
          });
          analysis_text += `\n`;
        }

        if (playstyleData.weaknesses && playstyleData.weaknesses.length > 0) {
          analysis_text += `WEAKNESSES:\n`;
          playstyleData.weaknesses.forEach(weak => {
            analysis_text += `✗ ${weak}\n`;
          });
          analysis_text += `\n`;
        }

        if (playstyleData.keyPrinciples && playstyleData.keyPrinciples.length > 0) {
          analysis_text += `KEY PRINCIPLES:\n`;
          playstyleData.keyPrinciples.forEach(principle => {
            analysis_text += `→ ${principle}\n`;
          });
          analysis_text += `\n`;
        }

        analysis_text += `HOW THIS MATCHES YOUR DECK:\n`;
        const matchCount = (playstyleData.keyCards || []).filter(kc =>
          cardNames.some(cn => getSimilarity(cn, kc) > 0.65)
        ).length;
        analysis_text += `• Matched ${matchCount}/${playstyleData.keyCards?.length || 0} key cards\n`;
        analysis_text += `• Average deck cost: ${analysis.avgCost.toFixed(2)} (vs ${playstyleData.avgCardCost || 4})\n`;

        if (matchCount < (playstyleData.keyCards?.length || 0) * 0.6) {
          analysis_text += `• You're missing some core cards for this playstyle\n`;
          analysis_text += `  Consider adding more ${playstyleData.keyCards?.slice(0, 2).join(', ')} type effects\n`;
        } else {
          analysis_text += `• Great core card coverage! ✓\n`;
        }
      } else {
        analysis_text += `Your deck is ${detectedPlaystyle}, which means:\n`;
        analysis_text += `• Flexible archetype with unique synergies\n`;
        analysis_text += `• Focus on your card interactions\n`;
        analysis_text += `• Test different strategies\n`;
      }

      return analysis_text;
    } catch (error) {
      console.error("Error in getPlaystyleAnalysis:", error);
      return `Error analyzing playstyle: ${error.message}`;
    }
  };

  const getCardFitAnalysis = (query) => {
    try {
      if (!analysis) return "No analysis available";

      const deckCards = Object.keys(analysis.cards || {});
      const queryLower = query.toLowerCase();

      // First, try to find card in deck
      let targetCard = null;
      let isHypothetical = false;
      let cardProperties = null;

      for (const card of deckCards) {
        if (queryLower.includes(card.toLowerCase())) {
          targetCard = card;
          break;
        }
      }

      // If not in deck, extract card name and search cardMeta
      if (!targetCard) {
        const stopWords = ['how', 'does', 'would', 'fit', 'help', 'work', 'are', 'is', 'the', 'in', 'a', 'my', 'your', 'or', 'and', 'adding', 'hurt', 'improve', 'edit'];
        const words = query.split(/\s+/).filter(w => !stopWords.includes(w.toLowerCase()));

        if (words.length > 0) {
          const potentialCardName = words.join(' ');

          // Search cardMeta for the hypothetical card
          if (cardMeta) {
            const cardsArray = Array.isArray(cardMeta) ? cardMeta : Object.values(cardMeta);
            for (const card of cardsArray) {
              const cardName = card.name || card.cardName || "";
              const cardNameLower = cardName.toLowerCase();
              const potentialLower = potentialCardName.toLowerCase();

              // Check for match (exact, partial, or fuzzy)
              if (cardNameLower === potentialLower ||
                cardNameLower.includes(potentialLower) ||
                potentialLower.includes(cardNameLower) ||
                getSimilarity(cardNameLower, potentialLower) > 0.65) {
                targetCard = cardName;
                cardProperties = card;
                isHypothetical = true;
                break;
              }
            }
          }
        }
      }

      let analysis_text = `💎 CARD FIT ANALYSIS\n\n`;

      if (targetCard) {
        const archetype = analysis.archetype || "Unknown";
        const avgCost = parseFloat(analysis.avgCost) || 4;
        const cardCount = analysis.cards[targetCard] || 0;

        analysis_text += `CARD: ${targetCard}\n`;
        if (isHypothetical) {
          analysis_text += `STATUS: Hypothetical addition (not in deck)\n`;
        } else {
          analysis_text += `Current count in deck: ${cardCount}x\n`;
        }
        analysis_text += `\n`;

        // If we have detailed card properties, show them
        if (cardProperties) {
          analysis_text += `CARD PROPERTIES:\n`;
          if (cardProperties.cost !== undefined) {
            analysis_text += `• Cost: ${cardProperties.cost}\n`;
          }
          if (cardProperties.type) {
            analysis_text += `• Type: ${cardProperties.type}\n`;
          }
          if (cardProperties.ink) {
            analysis_text += `• Ink: ${cardProperties.ink}\n`;
          }
          if (cardProperties.keyword && cardProperties.keyword.length > 0) {
            analysis_text += `• Keywords: ${Array.isArray(cardProperties.keyword) ? cardProperties.keyword.join(', ') : cardProperties.keyword}\n`;
          }
          if (cardProperties.ability) {
            analysis_text += `• Ability: ${cardProperties.ability}\n`;
          }
          analysis_text += `\n`;
        }

        // Determine if card would help based on archetype and properties
        let wouldHelp = false;
        let helpReason = "";
        let fitsPlaystyle = false;
        let playstyleReason = "";

        if (cardProperties && cardProperties.cost !== undefined) {
          const cost = cardProperties.cost;
          const type = (cardProperties.type || "").toLowerCase();
          const keywords = Array.isArray(cardProperties.keyword) ? cardProperties.keyword : (cardProperties.keyword ? [cardProperties.keyword] : []);
          const ability = (cardProperties.ability || "").toLowerCase();

          if (archetype.toLowerCase().includes('aggro')) {
            // Aggro wants: low cost, pressure, efficient damage
            if (cost <= 2) {
              wouldHelp = true;
              helpReason = "Low cost allows early board presence and immediate pressure";
              fitsPlaystyle = true;
              playstyleReason = "Aggro decks thrive on fast deployment and early damage";
            } else if (cost <= 4 && (keywords.some(k => k.toLowerCase().includes('rush')) || ability.includes('damage') || ability.includes('draw'))) {
              wouldHelp = true;
              helpReason = "Mid-cost with immediate impact or pressure value";
              fitsPlaystyle = true;
              playstyleReason = "Fits aggro tempo if it advances the damage plan";
            } else {
              wouldHelp = false;
              helpReason = "Too expensive for aggro tempo - slows down your damage clock";
              fitsPlaystyle = false;
              playstyleReason = "Aggro needs to win by turn 5-7, high cost cards conflict with this plan";
            }
          } else if (archetype.toLowerCase().includes('control')) {
            // Control wants: answers, removal, card advantage, stabilization
            if (cost >= 4 && (ability.includes('banish') || ability.includes('return') || ability.includes('draw') || ability.includes('gain'))) {
              wouldHelp = true;
              helpReason = "Provides answers or card advantage needed for control strategy";
              fitsPlaystyle = true;
              playstyleReason = "Control decks want to stabilize then take over with powerful effects";
            } else if (type.includes('action') && (ability.includes('banish') || ability.includes('return'))) {
              wouldHelp = true;
              helpReason = "Removal action helps answer opponent's threats";
              fitsPlaystyle = true;
              playstyleReason = "Control needs efficient answers to survive";
            } else if (cost <= 3) {
              wouldHelp = false;
              helpReason = "Low cost without strong defensive value doesn't help control survive";
              fitsPlaystyle = false;
              playstyleReason = "Control needs powerful late-game effects, not small early plays";
            } else {
              wouldHelp = false;
              helpReason = "Doesn't provide the answers or advantage control needs";
              fitsPlaystyle = false;
              playstyleReason = "Control requires cards that stabilize or dominate, not just stats";
            }
          } else if (archetype.toLowerCase().includes('midrange')) {
            // Midrange wants: efficient threats, good trades, flexibility
            if (cost >= 2 && cost <= 5) {
              wouldHelp = true;
              helpReason = "Good curve fit with efficient value for midrange strategy";
              fitsPlaystyle = true;
              playstyleReason = "Midrange succeeds by playing efficient threats every turn";
            } else if (cost > 5 && ability.includes('draw')) {
              wouldHelp = true;
              helpReason = "High cost finisher with card advantage";
              fitsPlaystyle = true;
              playstyleReason = "Midrange needs powerful late-game threats to close";
            } else {
              wouldHelp = false;
              helpReason = "Either too cheap or too expensive for midrange curve";
              fitsPlaystyle = false;
              playstyleReason = "Midrange needs balanced curve - this disrupts tempo";
            }
          } else {
            // Unknown archetype - generic evaluation
            wouldHelp = cost >= 2 && cost <= 4;
            helpReason = wouldHelp ? "Reasonable cost for general play" : "Cost may not fit typical curve";
            fitsPlaystyle = true;
            playstyleReason = "Flexible deck can adapt to various cards";
          }
        } else {
          wouldHelp = false;
          helpReason = "Insufficient card data to evaluate properly";
          fitsPlaystyle = false;
          playstyleReason = "Cannot determine playstyle fit without card properties";
        }

        // Display YES/NO verdict
        analysis_text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        analysis_text += `WOULD THIS CARD HELP YOUR DECK?\n`;
        analysis_text += `${wouldHelp ? '✅ YES' : '❌ NO'}\n\n`;
        analysis_text += `WHY: ${helpReason}\n\n`;

        analysis_text += `DOES IT FIT YOUR ${archetype.toUpperCase()} PLAYSTYLE?\n`;
        analysis_text += `${fitsPlaystyle ? '✅ YES' : '❌ NO'}\n\n`;
        analysis_text += `WHY: ${playstyleReason}\n`;
        analysis_text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

        if (!isHypothetical) {
          analysis_text += `\nDECK COMPOSITION:\n`;
          if (cardCount === 0) {
            analysis_text += `• Not currently in your deck\n`;
            analysis_text += `• Consider adding if it strengthens your core plan\n`;
          } else if (cardCount === 1) {
            analysis_text += `• You have 1 copy (singleton)\n`;
            analysis_text += `• Consider if you want 2-3 copies for consistency\n`;
          } else if (cardCount >= 3) {
            analysis_text += `• You have ${cardCount} copies (maximum redundancy)\n`;
            analysis_text += `• Consider if you're over-relying on this card\n`;
          } else {
            analysis_text += `• You have ${cardCount} copies (good flexibility)\n`;
          }
        }
      } else {
        // Card not found - show deck cards
        const stopWords = ['how', 'does', 'would', 'fit', 'help', 'work', 'are', 'is', 'the', 'in', 'a', 'my', 'your', 'or', 'and', 'adding', 'hurt', 'improve'];
        const words = query.split(/\s+/).filter(w => !stopWords.includes(w.toLowerCase()));
        const attemptedCard = words.join(' ');

        analysis_text += `I couldn't find "${attemptedCard}" in the card database.\n\n`;
        analysis_text += `YOUR CURRENT DECK:\n`;
        const topCards = Object.entries(analysis.cards || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8);
        topCards.forEach(([card, count]) => {
          analysis_text += `• ${card} (${count}x)\n`;
        });

        analysis_text += `\nTRY ASKING ABOUT:\n`;
        analysis_text += `• Existing cards: "How does [Card Name] fit?"\n`;
        analysis_text += `• Hypothetical cards: "Would [Exact Card Name] help?"\n`;
        analysis_text += `• Note: Use exact Lorcana card names for hypothetical analysis\n`;
      }

      return analysis_text;
    } catch (error) {
      console.error("Error in getCardFitAnalysis:", error);
      return `Error analyzing card fit: ${error.message}`;
    }
  };

  const getCustomCoaching = () => {
    if (!customQuery.trim()) {
      alert("Ask the Inkweaver a question!");
      return;
    }

    if (!analysis) {
      setCoaching("Please analyze a deck first to ask coaching questions.");
      return;
    }

    const query = customQuery.toLowerCase();
    let response = `✨ INKWEAVER'S ANSWER TO: "${customQuery}"\n`;
    response += `═══════════════════════════════════════════════════════\n\n`;

    // Detect the type of question
    if (query.includes("win") || query.includes("matchup") || query.includes("beat") || query.includes("versus")) {
      response += getMatchupAdvice();
    } else if (query.includes("playstyle") || query.includes("archetype") || query.includes("what am i playing")) {
      response += getPlaystyleAnalysis();
    } else if (query.includes("recommend") || query.includes("suggest") || query.includes("build") ||
      query.includes("improve") || query.includes("better") || query.includes("compet") ||
      query.includes("optimal") || query.includes("upgrade") || query.includes("replace") ||
      query.includes("more competitive") || query.includes("stronger")) {
      response += getDeckBuildingAdvice(customQuery);
    } else if (query.includes("fit") || query.includes("synerg") || query.includes("good in") ||
      (query.includes("would") && (query.includes("help") || query.includes("work"))) ||
      query.includes("how does") || query.includes("should i add")) {
      response += getCardFitAnalysis(query);
    } else if (query.includes("meta") || query.includes("tournament")) {
      response += getMetaAnalysis();
    } else if (query.includes("strategy") || query.includes("play")) {
      response += getStrategyGuide();
    } else {
      response += `The Inkweaver sees a reasonable question: "${customQuery}"\n\n`;
      response += `Based on your ${analysis.archetype} deck with ${analysis.total} cards:\n`;
      response += getDeckBuildingAdvice(customQuery);
    }

    response += `\n═══════════════════════════════════════════════════════`;
    setCoaching(response);
    setCustomQuery("");
  };

  const buttonStyle = {
    padding: "10px 16px",
    background: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)",
    border: "none",
    color: "#fff",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    marginRight: "8px",
    marginBottom: "8px"
  };

  const activeButtonStyle = {
    ...buttonStyle,
    background: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
    border: "2px solid #fbbf24"
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    background: "rgba(100, 100, 100, 0.5)",
    cursor: "not-allowed"
  };

  const modeButtonStyle = (isActive) => ({
    padding: "8px 16px",
    background: isActive
      ? "linear-gradient(135deg, #ec4899 0%, #be185d 100%)"
      : "rgba(139, 92, 246, 0.3)",
    border: isActive ? "2px solid #fbbf24" : "2px solid rgba(139, 92, 246, 0.5)",
    color: "#fff",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: isActive ? "bold" : "normal",
    marginRight: "8px",
    marginBottom: "8px"
  });

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "#1a1a2e",
        color: "#fff",
        minHeight: "100vh"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <img src="/inkweaver.png" alt="Inkweaver" style={{ width: "120px", height: "auto", borderRadius: "8px", border: "3px solid rgba(236, 72, 153, 0.7)" }} />
        <div>
          <h1 style={{ margin: 0, marginBottom: "0.25rem", fontSize: "2.5rem" }}>✨ Inkweaver</h1>
          <p style={{ color: "#aaa", margin: 0 }}>Analyze • Save • Download • Get Coaching</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "20px" }}>
        {/* Main Content */}
        <div style={{ flex: 2 }}>
          <h3>Paste Your Deck</h3>
          <textarea
            rows={15}
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "14px",
              fontFamily: "monospace",
              backgroundColor: "rgba(30, 20, 60, 0.8)",
              color: "#fff",
              border: "2px solid rgba(139, 92, 246, 0.5)",
              borderRadius: "6px",
              marginBottom: "1rem"
            }}
            placeholder="Example:
4x Elsa - Spirit of Winter
3x Olaf - Friendly Snowman
2x Moana - Wayfinder"
            value={deckText}
            onChange={(e) => setDeckText(e.target.value)}
          />

          {/* Controls */}
          <div style={{ marginBottom: "1rem" }}>
            <button onClick={handleAnalyze} style={buttonStyle}>
              Analyze Deck
            </button>
            <button
              onClick={handleSave}
              style={!analysis ? disabledButtonStyle : buttonStyle}
              disabled={!analysis}
            >
              Save Deck
            </button>
            <button
              onClick={handleDownload}
              style={!analysis ? disabledButtonStyle : buttonStyle}
              disabled={!analysis}
            >
              Download Analysis
            </button>
            <button
              onClick={() => setDeckText("")}
              style={{
                ...buttonStyle,
                background: "rgba(139, 92, 246, 0.3)",
                border: "2px solid rgba(139, 92, 246, 0.5)"
              }}
            >
              Clear
            </button>
          </div>

          {/* Format Selection */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontWeight: "bold", marginRight: "1rem" }}>Format:</label>
            <button
              onClick={() => setFormat("infinity")}
              style={{
                padding: "6px 12px",
                background: format === "infinity"
                  ? "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)"
                  : "rgba(139, 92, 246, 0.3)",
                border: format === "infinity" ? "2px solid #fbbf24" : "2px solid rgba(139, 92, 246, 0.5)",
                color: "#fff",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: format === "infinity" ? "bold" : "normal",
                marginRight: "8px"
              }}
            >
              Infinity
            </button>
            <button
              onClick={() => setFormat("core")}
              style={{
                padding: "6px 12px",
                background: format === "core"
                  ? "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)"
                  : "rgba(139, 92, 246, 0.3)",
                border: format === "core" ? "2px solid #fbbf24" : "2px solid rgba(139, 92, 246, 0.5)",
                color: "#fff",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: format === "core" ? "bold" : "normal"
              }}
            >
              Core Constructed
            </button>
          </div>

          {/* Analysis Results */}
          {analysis && (
            <div
              style={{
                background: "rgba(30, 20, 60, 0.8)",
                border: "2px solid rgba(139, 92, 246, 0.5)",
                borderRadius: "6px",
                padding: "1rem",
                marginTop: "1rem"
              }}
            >
              <h3>📊 Analysis Results</h3>
              {analysis.error ? (
                <p style={{ color: "#ff6b6b" }}>Error: {analysis.error}</p>
              ) : (
                <div>
                  <p><strong>Total Cards:</strong> {analysis.total} / {format === "sealed" ? "40+" : "60"}</p>
                  <p><strong>Unique Cards:</strong> {analysis.uniqueCount}</p>
                  <p><strong>Average Cost:</strong> {parseFloat(analysis.avgCost || 0).toFixed(2)}</p>
                  <p><strong>Archetype:</strong> {analysis.archetype}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Saved Decks */}
        <div style={{ flex: 1 }}>
          <h3>📚 Saved Decks ({saved.length})</h3>
          <div
            style={{
              background: "rgba(30, 20, 60, 0.8)",
              border: "2px solid rgba(139, 92, 246, 0.5)",
              borderRadius: "6px",
              padding: "1rem",
              maxHeight: "500px",
              overflowY: "auto"
            }}
          >
            {saved.length === 0 ? (
              <p style={{ color: "#aaa" }}>No saved decks yet</p>
            ) : (
              <div>
                {saved.map((deck) => (
                  <div
                    key={deck.id}
                    style={{
                      background: "rgba(139, 92, 246, 0.2)",
                      padding: "10px",
                      borderRadius: "4px",
                      marginBottom: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <p style={{ margin: "0", fontWeight: "bold", fontSize: "14px" }}>{deck.name}</p>
                      <p style={{ margin: "0", fontSize: "11px", color: "#aaa" }}>
                        {new Date(deck.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        onClick={() => handleLoad(deck)}
                        style={{
                          padding: "4px 8px",
                          fontSize: "12px",
                          background: "rgba(139, 92, 246, 0.5)",
                          border: "none",
                          color: "#fff",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDelete(deck.id)}
                        style={{
                          padding: "4px 8px",
                          fontSize: "12px",
                          background: "rgba(239, 68, 68, 0.5)",
                          border: "none",
                          color: "#fff",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inkweaver Coaching */}
      <div style={{ marginTop: "2rem" }}>
        <h2>✨ The Inkweaver - Advanced Coaching System</h2>

        {/* Mode Selection */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Select Coaching Mode:</p>
          <button onClick={() => setMode("overview")} style={modeButtonStyle(mode === "overview")}>
            Overview
          </button>
          <button onClick={() => setMode("deckbuilding")} style={modeButtonStyle(mode === "deckbuilding")}>
            Deck Building
          </button>
          <button onClick={() => setMode("meta")} style={modeButtonStyle(mode === "meta")}>
            Meta Analysis
          </button>
          <button onClick={() => setMode("matchup")} style={modeButtonStyle(mode === "matchup")}>
            Matchup Strategy
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ marginBottom: "1rem" }}>
          <button onClick={getInkweaverCoaching} style={buttonStyle}>
            🎯 Get Coaching
          </button>
        </div>

        {/* Custom Coaching Input */}
        <div
          style={{
            background: "rgba(30, 20, 60, 0.8)",
            border: "2px solid rgba(236, 72, 153, 0.5)",
            borderRadius: "6px",
            padding: "1rem",
            marginBottom: "1rem"
          }}
        >
          <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Ask the Inkweaver a Question:</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && getCustomCoaching()}
              placeholder="e.g., 'What playstyle am I?', 'How does X fit?', 'Would Y help my deck?', 'Beat Control?'"
              style={{
                flex: 1,
                padding: "10px",
                backgroundColor: "rgba(30, 20, 60, 0.8)",
                border: "2px solid rgba(139, 92, 246, 0.5)",
                color: "#fff",
                borderRadius: "6px",
                fontSize: "14px"
              }}
            />
            <button
              onClick={getCustomCoaching}
              style={{
                ...buttonStyle,
                background: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)"
              }}
            >
              Ask
            </button>
          </div>
        </div>

        {/* Coaching Output */}
        {coaching && (
          <div
            style={{
              background: "rgba(30, 20, 60, 0.8)",
              border: "2px solid rgba(236, 72, 153, 0.5)",
              borderRadius: "6px",
              padding: "1.5rem",
              whiteSpace: "pre-wrap",
              fontFamily: "monospace",
              fontSize: "13px",
              lineHeight: "1.6",
              color: "#fff"
            }}
          >
            {coaching}
          </div>
        )}
      </div>
    </div>
  );
}
