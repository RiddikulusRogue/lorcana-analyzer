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

  for (const [rawName, count] of Object.entries(cards)) {
    const key = rawName.toLowerCase();
    const meta = cardMeta[key];
    if (meta) {
      if (meta.ink) inkColors[meta.ink] = (inkColors[meta.ink] || 0) + count;
      if (typeof meta.cost === 'number') { costSum += meta.cost * count; costKnownCount += count }
      if (meta.type && meta.type.toLowerCase().includes('song')) songCount += count;
      const kws = (meta.keywords || []).map(k => k.toLowerCase());
      if (kws.some(k=>k.includes('shift'))) hasShift = true;
      if (kws.some(k=>k.includes('evasive'))) hasEvasive = true;
      if (kws.some(k=>k.includes('singer') || k.includes('sing'))) hasSinger = true;
    }
  }

  const avgCost = costKnownCount > 0 ? (costSum / costKnownCount) : null;

  let archetype = isValid ? 'Unclassified (ready)' : 'Unclassified (incomplete)';
  if (avgCost !== null) {
    if (avgCost < 3.8) archetype = 'Aggro';
    else if (avgCost < 5.0) archetype = 'Midrange';
    else archetype = 'Control/Ramp';
  }

  const synergies = [];
  if (hasSinger && songCount > 0) synergies.push({ type: 'Singer/Song Synergy', strength: 'High', description: 'Deck has singers to play songs for free' });
  if (hasEvasive && archetype === 'Aggro') synergies.push({ type: 'Evasive Aggro', strength: 'High', description: 'Evasive characters support aggressive strategy' });
  if (hasShift && uniqueCount > 10) synergies.push({ type: 'Shift Value', strength: 'Medium', description: 'Shift characters can generate tempo advantage' });

  const weaknesses = [];
  if (total < 60) weaknesses.push({ type: 'Deck Size', severity: 'High', description: 'Deck is under 60 cards' });
  if (total > 60) weaknesses.push({ type: 'Deck Size', severity: 'High', description: 'Deck is over 60 cards' });

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
    notes: isValid ? 'Analyzer connected successfully.' : 'Deck is not 60 cards.'
  };
}

