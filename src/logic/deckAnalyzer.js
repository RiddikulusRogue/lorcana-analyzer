// src/logic/deckAnalyzer.js

import cardMeta from '../data/cardMeta.json'

function normalizeName(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function levenshtein(a, b) {
  if (!a) return b ? b.length : 0
  if (!b) return a.length
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

const metaKeys = Object.keys(cardMeta || {})
const normalizedMetaKeyToKey = new Map()

for (const key of metaKeys) {
  const normalized = normalizeName(key)
  if (!normalized) continue
  if (!normalizedMetaKeyToKey.has(normalized)) {
    normalizedMetaKeyToKey.set(normalized, key)
  }
}

const normalizedMetaKeys = Array.from(normalizedMetaKeyToKey.keys())

function findBestMatch(rawName) {
  const n = normalizeName(rawName)
  if (!n) return null

  const exact = normalizedMetaKeyToKey.get(n)
  if (exact) return exact

  // Fall back to compact form for entries where punctuation was removed without spaces.
  const compact = n.replace(/\s+/g, '')
  for (const normalized of normalizedMetaKeys) {
    if (normalized.replace(/\s+/g, '') === compact) {
      return normalizedMetaKeyToKey.get(normalized)
    }
  }

  // allow short/partial matching
  let best = null
  let bestDist = Infinity
  for (const normalized of normalizedMetaKeys) {
    const d = levenshtein(n, normalized)
    if (d < bestDist) { bestDist = d; best = normalized }
  }
  // accept if reasonably close (<=30% of length)
  if (best && bestDist <= Math.max(1, Math.floor(best.length * 0.3))) return normalizedMetaKeyToKey.get(best)
  return null
}

function combination(n, k) {
  if (!Number.isFinite(n) || !Number.isFinite(k)) return 0
  if (k < 0 || n < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  const kk = Math.min(k, n - k)
  let result = 1
  for (let i = 1; i <= kk; i++) {
    result *= (n - kk + i) / i
  }
  return result
}

function probabilityAtLeastK(totalCards, successCards, draws, minHits) {
  if (totalCards <= 0 || draws <= 0 || minHits <= 0) return 0
  const n = Math.max(0, Math.floor(totalCards))
  const s = Math.max(0, Math.min(Math.floor(successCards), n))
  const d = Math.max(0, Math.min(Math.floor(draws), n))
  if (d === 0 || s === 0) return 0

  let probability = 0
  const maxHits = Math.min(d, s)
  for (let hit = minHits; hit <= maxHits; hit++) {
    const waysSuccess = combination(s, hit)
    const waysFail = combination(n - s, d - hit)
    const waysTotal = combination(n, d)
    if (waysTotal > 0) {
      probability += (waysSuccess * waysFail) / waysTotal
    }
  }
  return Math.max(0, Math.min(1, probability))
}

function formatPercent(value) {
  return `${(Math.max(0, Math.min(1, value)) * 100).toFixed(1)}%`
}

export function analyzeDeck(deckText, format = 'infinity') {
  if (!deckText || deckText.trim() === "") {
    return { error: "No deck provided" };
  }

  // Determine required deck size based on format
  const requiredSize = format === 'sealed' ? 40 : 60;
  const isSealed = format === 'sealed';

  const lines = deckText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const cards = {};
  let total = 0;

  // Support lines like "4x Card Name" or "4 Card Name"
  const re = /^(\d+)x?\s+(.+)$/i;
  for (const line of lines) {
    const m = line.match(re);
    let count = 0
    let name = ''
    if (m) { count = parseInt(m[1], 10) || 0; name = m[2].trim() }
    else { count = 1; name = line }

    const matchKey = findBestMatch(name)
    const finalName = matchKey ? cardMeta[matchKey].name : name
    cards[finalName] = (cards[finalName] || 0) + count
    total += count
  }

  const uniqueCount = Object.keys(cards).length;
  const isValid = format === 'sealed' ? total >= 40 : total === 60;

  // Gather metadata-driven stats
  const inkColors = {};
  let costSum = 0;
  let costKnownCount = 0;
  let songCount = 0;
  let hasShift = false;
  let hasEvasive = false;
  let hasSinger = false;
  let interactionCount = 0;
  let rampCount = 0;
  let drawEngineCount = 0;

  // Cost distribution tracking
  let cost1Count = 0;
  let cost2Count = 0;
  let cost3to4Count = 0;
  let cost5PlusCount = 0;
  let creatureCount = 0;
  let actionCount = 0;
  let itemCount = 0;

  // Keyword tracking
  let rushCount = 0;
  let evasiveCount = 0;
  let bodyguardCount = 0;
  let resistCount = 0;
  let challengerCount = 0;

  for (const [rawName, count] of Object.entries(cards)) {
    const key = rawName.toLowerCase();
    const meta = cardMeta[key];
    if (meta) {
      if (meta.ink && typeof meta.ink === 'string') inkColors[meta.ink] = (inkColors[meta.ink] || 0) + count;

      if (typeof meta.cost === 'number') {
        costSum += meta.cost * count;
        costKnownCount += count;

        // Track cost distribution
        if (meta.cost === 1) cost1Count += count;
        else if (meta.cost === 2) cost2Count += count;
        else if (meta.cost >= 3 && meta.cost <= 4) cost3to4Count += count;
        else if (meta.cost >= 5) cost5PlusCount += count;
      }

      // Track card types
      if (meta.type) {
        const type = meta.type.toLowerCase();
        if (type.includes('character')) creatureCount += count;
        else if (type.includes('action')) actionCount += count;
        else if (type.includes('item')) itemCount += count;
        if (type.includes('song')) songCount += count;
      }

      const kws = (meta.keywords || []).map(k => String(k).toLowerCase());
      if (kws.some(k => k.includes('shift'))) hasShift = true;
      if (kws.some(k => k.includes('evasive'))) { hasEvasive = true; evasiveCount += count; }
      if (kws.some(k => k.includes('singer') || k.includes('sing'))) hasSinger = true;
      if (kws.some(k => k.includes('rush'))) rushCount += count;
      if (kws.some(k => k.includes('bodyguard'))) bodyguardCount += count;
      if (kws.some(k => k.includes('resist'))) resistCount += count;
      if (kws.some(k => k.includes('challenger'))) challengerCount += count;

      const typeLower = String(meta.type || '').toLowerCase();
      const keywordText = kws.join(' ');
      const isInteraction =
        keywordText.includes('challenger') ||
        keywordText.includes('rush') ||
        keywordText.includes('banish') ||
        keywordText.includes('damage') ||
        keywordText.includes('exert') ||
        keywordText.includes('cannot ready') ||
        (typeLower.includes('action') && typeof meta.cost === 'number' && meta.cost <= 4);
      const isRamp =
        keywordText.includes('inkwell') ||
        keywordText.includes('additional ink') ||
        keywordText.includes('ramp') ||
        keywordText.includes('tipo') ||
        keywordText.includes('sail');
      const isCardFlow =
        keywordText.includes('draw') ||
        keywordText.includes('look at') ||
        keywordText.includes('search') ||
        keywordText.includes('filter');

      if (isInteraction) interactionCount += count;
      if (isRamp) rampCount += count;
      if (isCardFlow) drawEngineCount += count;
    }
  }

  const avgCost = costKnownCount > 0 ? (costSum / costKnownCount) : null;

  // Calculate key percentages upfront
  const earlyGamePercent = total > 0 ? ((cost1Count + cost2Count) / total) * 100 : 0;
  const lateGamePercent = total > 0 ? (cost5PlusCount / total) * 100 : 0;
  const creaturePercent = total > 0 ? (creatureCount / total) * 100 : 0;
  const actionPercent = total > 0 ? (actionCount / total) * 100 : 0;

  // Tournament-grade consistency checks
  const earlyCards = cost1Count + cost2Count;
  const playableByTurn2 = cost1Count + cost2Count + cost3to4Count;
  const opening7 = probabilityAtLeastK(total, earlyCards, 7, 1);
  const turn2Stability = probabilityAtLeastK(total, playableByTurn2, 8, 2);
  const interactionByTurn3 = probabilityAtLeastK(total, interactionCount, 9, 1);

  const colorCount = Object.keys(inkColors).length;
  const overcopyCards = Object.entries(cards).filter(([, count]) => count > 4);

  // REVISED ARCHETYPE CLASSIFICATION - More explicit criteria
  let archetype = isValid ? 'Unclassified (ready)' : 'Unclassified (incomplete)';

  if (avgCost !== null && total >= 30) {
    // ARCHETYPE DEFINITIONS:
    // AGGRO: Low curve (< 3.5), 40%+ early game, 6+ rush creatures, few actions
    // MIDRANGE: Medium curve (3.5-4.5), balanced early/mid/late, mix of threats/answers
    // CONTROL: High curve (> 4.5), low early game (< 25%), 12+ actions, 12+ cost-5 creatures
    // TEMPO: Low-medium curve (< 4.0), 30-45% early game, efficiency over power

    const isAggro =
      avgCost < 3.5 &&
      earlyGamePercent >= 35 &&
      (rushCount >= 4 || cost1Count >= 8 || earlyGamePercent >= 45) &&
      actionPercent < 20 &&
      lateGamePercent < 30;

    const isControl =
      avgCost > 4.3 &&
      earlyGamePercent < 22 &&
      (actionCount >= 10 || cost5PlusCount >= 10) &&
      creaturePercent < 65;

    const isMidrange =
      avgCost >= 3.3 && avgCost <= 4.8 &&
      earlyGamePercent >= 15 && earlyGamePercent <= 48 &&
      creaturePercent >= 45 &&
      creaturePercent <= 82 &&
      actionPercent >= 8;

    const isTempo =
      avgCost < 4.0 &&
      earlyGamePercent >= 28 &&
      earlyGamePercent <= 48 &&
      (evasiveCount >= 2 || challengerCount >= 4) &&
      actionPercent < 22;

    // Assign archetype based on clear criteria
    if (isAggro) {
      archetype = 'Aggro';
    } else if (isControl) {
      archetype = 'Control';
    } else if (isTempo) {
      archetype = 'Tempo';
    } else if (isMidrange) {
      archetype = 'Midrange';
    } else {
      // Fallback logic with clearer distinctions
      if (avgCost > 4.5) {
        archetype = 'Control/Ramp';
      } else if (avgCost > 4.0) {
        archetype = 'Midrange/Control';
      } else if (avgCost < 3.0) {
        archetype = 'Aggro/Tempo';
      } else if (avgCost < 3.5) {
        archetype = 'Tempo/Aggro';
      } else {
        archetype = 'Midrange';
      }
    }
  }

  const synergies = [];
  if (hasSinger && songCount > 0) synergies.push({ type: 'Singer/Song Synergy', strength: 'High', description: 'Deck has singers to play songs for free' });
  if (hasEvasive && (archetype.includes('Aggro') || archetype.includes('Tempo'))) synergies.push({ type: 'Evasive Aggro', strength: 'High', description: 'Evasive characters support aggressive strategy' });
  if (hasShift && uniqueCount > 10) synergies.push({ type: 'Shift Value', strength: 'Medium', description: 'Shift characters can generate tempo advantage' });

  let competitiveScore = 100;

  // Baseline legality/structure penalties
  if (!isValid) competitiveScore -= 20;
  if (format !== 'sealed' && colorCount > 2) competitiveScore -= 18;
  if (colorCount === 0) competitiveScore -= 10;
  competitiveScore -= overcopyCards.length * 8;

  // Consistency penalties anchored to high-level tournament targets
  if (opening7 < 0.75) competitiveScore -= Math.min(18, Math.round((0.75 - opening7) * 70));
  if (turn2Stability < 0.70) competitiveScore -= Math.min(16, Math.round((0.70 - turn2Stability) * 65));

  const archetypeLowerForScore = String(archetype || '').toLowerCase();
  if (archetypeLowerForScore.includes('control') || archetypeLowerForScore.includes('tempo')) {
    if (interactionByTurn3 < 0.58) competitiveScore -= Math.min(14, Math.round((0.58 - interactionByTurn3) * 60));
  } else if (archetypeLowerForScore.includes('aggro')) {
    if (opening7 < 0.80) competitiveScore -= Math.min(10, Math.round((0.80 - opening7) * 50));
  }

  // Curve quality penalties
  if (avgCost !== null) {
    if (avgCost < 2.7) competitiveScore -= 6;
    if (avgCost > 4.9) competitiveScore -= 10;
  }

  if (creaturePercent < 38 || creaturePercent > 84) competitiveScore -= 6;
  if (actionPercent > 34 && !archetypeLowerForScore.includes('control')) competitiveScore -= 4;

  // Small positive adjustments for structurally strong lists
  if (synergies.length >= 2) competitiveScore += 3;
  if (interactionCount >= 8) competitiveScore += 2;
  if (rampCount >= 4 && archetypeLowerForScore.includes('control')) competitiveScore += 2;

  competitiveScore = Math.max(0, Math.min(100, Math.round(competitiveScore)));
  const competitiveTier = competitiveScore >= 90
    ? 'S-Tier Ready'
    : competitiveScore >= 82
      ? 'A-Tier Competitive'
      : competitiveScore >= 72
        ? 'B-Tier Improving'
        : 'C-Tier Rebuild Needed';

  const weaknesses = [];
  if (format === 'sealed') {
    if (total < 40) weaknesses.push({ type: 'Deck Size', severity: 'High', description: 'Sealed deck is under 40 cards minimum' });
    if (total > 60) weaknesses.push({ type: 'Deck Size', severity: 'Medium', description: 'Sealed deck is quite large - consider trimming to 40-45 cards' });
  } else {
    if (total < 60) weaknesses.push({ type: 'Deck Size', severity: 'High', description: 'Deck is under 60 cards' });
    if (total > 60) weaknesses.push({ type: 'Deck Size', severity: 'High', description: 'Deck is over 60 cards' });
  }

  if (overcopyCards.length > 0) {
    overcopyCards.forEach(([name, count]) => {
      weaknesses.push({
        type: 'Copy Limit Violation',
        severity: 'High',
        description: `${name} has ${count} copies (max 4 in constructed).`
      });
    });
  }

  if (opening7 < 0.70) {
    weaknesses.push({
      type: 'Opening Consistency',
      severity: 'High',
      description: `Only ${formatPercent(opening7)} to open at least one 1-2 cost play in 7 cards.`
    });
  }

  if (turn2Stability < 0.65) {
    weaknesses.push({
      type: 'Curve Stability',
      severity: 'Medium',
      description: `Only ${formatPercent(turn2Stability)} to see two playable cards by turn 2.`
    });
  }

  if ((String(archetype || '').toLowerCase().includes('control') || String(archetype || '').toLowerCase().includes('tempo')) && interactionByTurn3 < 0.55) {
    weaknesses.push({
      type: 'Interactive Density',
      severity: 'High',
      description: `Only ${formatPercent(interactionByTurn3)} to find early interaction by turn 3.`
    });
  }

  // Add curve-based weaknesses
  if (earlyGamePercent < 20 && archetype.includes('Aggro')) {
    weaknesses.push({ type: 'Curve Gap', severity: 'High', description: 'Not enough early game for an aggressive deck' });
  }
  if (cost5PlusCount > 15 && avgCost && avgCost < 4.0) {
    weaknesses.push({ type: 'Top Heavy', severity: 'Medium', description: 'Too many expensive cards for the average cost' });
  }

  return {
    total,
    uniqueCount,
    cards,
    isValid,
    inkColors,
    avgCost: avgCost !== null ? avgCost.toFixed(2) : 'unknown',
    archetype,
    songCount,
    synergies,
    weaknesses,
    notes: isValid ? 'Analyzer connected successfully.' : (format === 'sealed' ? 'Deck must be at least 40 cards.' : 'Deck is not 60 cards.'),
    format: format,
    // Additional metrics
    curveDistribution: {
      cost1: cost1Count,
      cost2: cost2Count,
      cost3to4: cost3to4Count,
      cost5Plus: cost5PlusCount
    },
    cardTypes: {
      creatures: creatureCount,
      actions: actionCount,
      items: itemCount
    },
    keywordCounts: {
      rush: rushCount,
      evasive: evasiveCount,
      bodyguard: bodyguardCount,
      resist: resistCount,
      challenger: challengerCount
    },
    consistencyMetrics: {
      opening7EarlyPlay: formatPercent(opening7),
      turn2TwoPlays: formatPercent(turn2Stability),
      turn3Interaction: formatPercent(interactionByTurn3),
      earlyPlayCount: earlyCards,
      interactionCount,
      rampCount,
      drawEngineCount
    },
    competitiveScore,
    competitiveTier
  };
}

