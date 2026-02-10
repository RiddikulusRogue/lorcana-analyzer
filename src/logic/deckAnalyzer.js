// src/logic/deckAnalyzer.js

import cardMeta from '../data/cardMeta.json'

function normalizeName(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim()
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

function findBestMatch(rawName) {
  const n = normalizeName(rawName)
  if (!n) return null
  // exact or prefix
  for (const k of metaKeys) {
    if (k === n) return k
    if (k.startsWith(n) || n.startsWith(k)) return k
  }
  // allow short/partial matching
  let best = null
  let bestDist = Infinity
  for (const k of metaKeys) {
    const d = levenshtein(n, k)
    if (d < bestDist) { bestDist = d; best = k }
  }
  // accept if reasonably close (<=30% of length)
  if (best && bestDist <= Math.max(1, Math.floor(best.length * 0.3))) return best
  return null
}

export function analyzeDeck(deckText) {
  if (!deckText || deckText.trim() === "") {
    return { error: "No deck provided" };
  }

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
  const isValid = total === 60;

  // Gather metadata-driven stats
  const inkColors = {};
  let costSum = 0;
  let costKnownCount = 0;
  let songCount = 0;
  let hasShift = false;
  let hasEvasive = false;
  let hasSinger = false;

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
    }
  }

  const avgCost = costKnownCount > 0 ? (costSum / costKnownCount) : null;

  // Calculate key percentages upfront
  const earlyGamePercent = total > 0 ? ((cost1Count + cost2Count) / total) * 100 : 0;
  const lateGamePercent = total > 0 ? (cost5PlusCount / total) * 100 : 0;
  const creaturePercent = total > 0 ? (creatureCount / total) * 100 : 0;
  const actionPercent = total > 0 ? (actionCount / total) * 100 : 0;

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
      earlyGamePercent >= 40 &&
      rushCount >= 6 &&
      actionPercent < 15 &&
      lateGamePercent < 30;

    const isControl =
      avgCost > 4.5 &&
      earlyGamePercent < 20 &&
      actionCount >= 12 &&
      cost5PlusCount >= 12 &&
      creaturePercent < 60;

    const isMidrange =
      avgCost >= 3.5 && avgCost <= 4.5 &&
      earlyGamePercent >= 20 && earlyGamePercent <= 40 &&
      creaturePercent >= 55 &&
      creaturePercent <= 75 &&
      actionPercent >= 10 && actionPercent <= 30;

    const isTempo =
      avgCost < 4.0 &&
      earlyGamePercent >= 30 &&
      earlyGamePercent <= 45 &&
      evasiveCount >= 3 &&
      actionPercent < 20;

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

  const weaknesses = [];
  if (total < 60) weaknesses.push({ type: 'Deck Size', severity: 'High', description: 'Deck is under 60 cards' });
  if (total > 60) weaknesses.push({ type: 'Deck Size', severity: 'High', description: 'Deck is over 60 cards' });

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
    notes: isValid ? 'Analyzer connected successfully.' : 'Deck is not 60 cards.',
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
    }
  };
}

