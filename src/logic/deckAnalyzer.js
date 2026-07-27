// src/logic/deckAnalyzer.js

import cardMeta from '../data/cardMeta.json'

function normalizeName(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

const OFFICIAL_INK_BY_LOWER = {
  amber: 'Amber',
  amethyst: 'Amethyst',
  emerald: 'Emerald',
  ruby: 'Ruby',
  sapphire: 'Sapphire',
  steel: 'Steel',
}

function parseInkColors(rawInk) {
  if (!rawInk) return []
  const rawTokens = Array.isArray(rawInk)
    ? rawInk
    : String(rawInk).split(/[\/,&-]+/g)

  const normalized = rawTokens
    .map((token) => String(token || '').toLowerCase().trim())
    .map((token) => OFFICIAL_INK_BY_LOWER[token] || null)
    .filter(Boolean)

  return Array.from(new Set(normalized))
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

function normalizeWinRateValue(rawValue) {
  const match = String(rawValue || '').match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const parsed = parseFloat(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

function toFormatMetaKey(format) {
  if (format === 'core') return 'coreConstructed'
  if (format === 'sealed') return 'sealed'
  return 'infinity'
}

function getFormatMetaContext(format, competitiveMeta) {
  const key = toFormatMetaKey(format)
  const formatData = competitiveMeta?.formats?.[key] || null

  const fallbackTopDecks = Array.isArray(competitiveMeta?.topDecks) ? competitiveMeta.topDecks : []
  const fallbackPairings = Array.isArray(competitiveMeta?.metaPairings) ? competitiveMeta.metaPairings : []
  const fallbackCombos = Array.isArray(competitiveMeta?.comboPackages) ? competitiveMeta.comboPackages : []

  return {
    topDecks: Array.isArray(formatData?.topDecks) && formatData.topDecks.length > 0 ? formatData.topDecks : fallbackTopDecks,
    metaPairings: Array.isArray(formatData?.metaPairings) && formatData.metaPairings.length > 0 ? formatData.metaPairings : fallbackPairings,
    comboPackages: Array.isArray(formatData?.comboPackages) && formatData.comboPackages.length > 0 ? formatData.comboPackages : fallbackCombos,
  }
}

function isCardLegalForFormatAnalysis(normalizedCardName, format, cardSetsData, coreConstructed) {
  if (format === 'sealed') return true
  if (!cardSetsData || !cardSetsData.cardSetMapping) return false

  const cardSets = cardSetsData.cardSetMapping[normalizedCardName]
  if (!Array.isArray(cardSets) || cardSets.length === 0) return false

  if (format === 'core') {
    const legalSets = Array.isArray(coreConstructed?.legalSets) ? coreConstructed.legalSets : []
    if (legalSets.length === 0) return true
    return cardSets.some((setNum) => legalSets.includes(setNum))
  }

  return true
}

function summarizeTournamentSynergy(deckEntries, format, competitiveMeta, cardSetsData = null, coreConstructed = null) {
  const deckMap = new Map(
    deckEntries.map(([name, count]) => [normalizeName(name), count]).filter(([name]) => Boolean(name))
  )
  const context = getFormatMetaContext(format, competitiveMeta)

  const weightedComboPackages = (Array.isArray(context.comboPackages) ? context.comboPackages : [])
    .map((combo) => {
      const comboCards = Array.isArray(combo?.cards)
        ? Array.from(new Set(combo.cards.map((card) => normalizeName(card)).filter(Boolean)))
        : []
      if (comboCards.length < 2) return null

      const matchedCards = comboCards.filter((card) => deckMap.has(card) && isCardLegalForFormatAnalysis(card, format, cardSetsData, coreConstructed))
      const missingCards = comboCards.filter((card) => !deckMap.has(card) && isCardLegalForFormatAnalysis(card, format, cardSetsData, coreConstructed))
      const completion = matchedCards.length / comboCards.length

      return {
        name: combo?.name || 'Unnamed combo package',
        archetype: combo?.archetype || null,
        matchedCards,
        missingCards,
        completion,
        source: 'tournament_combo_package',
      }
    })
    .filter(Boolean)

  const weightedTopDeckPackages = (Array.isArray(context.topDecks) ? context.topDecks : [])
    .map((deck) => {
      const keyCards = Array.isArray(deck?.keyCards)
        ? Array.from(new Set(deck.keyCards.map((card) => normalizeName(card)).filter(Boolean)))
        : []
      if (keyCards.length < 3) return null

      const matchedCards = keyCards.filter((card) => deckMap.has(card) && isCardLegalForFormatAnalysis(card, format, cardSetsData, coreConstructed))
      const missingCards = keyCards.filter((card) => !deckMap.has(card) && isCardLegalForFormatAnalysis(card, format, cardSetsData, coreConstructed))
      const completion = matchedCards.length / keyCards.length
      const wr = normalizeWinRateValue(deck?.winRate)

      return {
        name: `${deck?.name || 'Meta Deck'} Core Line`,
        archetype: deck?.archetype || null,
        matchedCards,
        missingCards,
        completion,
        source: 'tournament_top_deck_line',
        winRate: wr,
      }
    })
    .filter(Boolean)

  const allPackages = [...weightedComboPackages, ...weightedTopDeckPackages]
  const ranked = allPackages
    .map((pkg) => {
      const completedBonus = pkg.completion >= 1 ? 10 : 0
      const winRateBonus = pkg.winRate ? Math.max(0, (pkg.winRate - 45) * 0.5) : 0
      const sourceBonus = pkg.source === 'tournament_combo_package' ? 6 : 3
      const matchBonus = pkg.matchedCards.length * 4
      const packageScore = Math.round(pkg.completion * 70 + matchBonus + completedBonus + sourceBonus + winRateBonus)

      let status = 'missing_pieces'
      if (pkg.completion >= 1) status = 'fully_online'
      else if (pkg.completion >= 0.67) status = 'mostly_online'
      else if (pkg.completion >= 0.34) status = 'partial_shell'

      return {
        ...pkg,
        packageScore,
        status,
      }
    })
    .filter((pkg) => pkg.matchedCards.length > 0)
    .sort((a, b) => b.packageScore - a.packageScore)

  const top = ranked.slice(0, 6)
  const avgScore = top.length > 0
    ? top.reduce((sum, pkg) => sum + pkg.packageScore, 0) / top.length
    : 0

  return {
    model: 'tournament_combo_alignment_v1',
    score: Math.max(0, Math.min(100, Math.round(avgScore))),
    packages: top,
  }
}

function summarizeLogicalSynergy({
  songCount,
  singerCount,
  shiftCount,
  rampCount,
  interactionCount,
  cost5PlusCount,
  evasiveCount,
  rushCount,
  bodyguardCount,
  challengerCount,
  drawEngineCount,
  cardCount,
}) {
  const signals = []

  const singerSongScore = Math.min(100, Math.round(Math.min(songCount, singerCount) * 12 + Math.max(0, singerCount - songCount) * 3))
  signals.push({
    name: 'Singer + Song Engine',
    score: singerSongScore,
    evidence: `singers=${singerCount}, songs=${songCount}`,
  })

  const rampPayoffScore = Math.min(100, Math.round((rampCount * 8) + (cost5PlusCount * 4)))
  signals.push({
    name: 'Ramp Into Payoff Curve',
    score: rampPayoffScore,
    evidence: `rampPieces=${rampCount}, payoffs5Plus=${cost5PlusCount}`,
  })

  const tempoPressureScore = Math.min(100, Math.round((interactionCount * 4) + ((evasiveCount + rushCount + challengerCount) * 3)))
  signals.push({
    name: 'Tempo Pressure Chain',
    score: tempoPressureScore,
    evidence: `interaction=${interactionCount}, pressureKeywords=${evasiveCount + rushCount + challengerCount}`,
  })

  const valueEngineScore = Math.min(100, Math.round((drawEngineCount * 7) + (bodyguardCount * 3) + (shiftCount * 4)))
  signals.push({
    name: 'Value Engine Stack',
    score: valueEngineScore,
    evidence: `draw=${drawEngineCount}, bodyguard=${bodyguardCount}, shift=${shiftCount}`,
  })

  const normalizedSignals = signals.map((signal) => {
    const scale = cardCount > 0 ? Math.min(1.3, 60 / cardCount) : 1
    return {
      ...signal,
      score: Math.max(0, Math.min(100, Math.round(signal.score * scale))),
    }
  })

  const weighted = normalizedSignals.reduce((sum, signal) => sum + signal.score, 0)
  const overall = normalizedSignals.length > 0 ? Math.round(weighted / normalizedSignals.length) : 0

  return {
    model: 'logical_combo_inference_v1',
    score: overall,
    signals: normalizedSignals.sort((a, b) => b.score - a.score),
  }
}

function scoreMatchupSynergy({
  format,
  competitiveMetaData,
  archetype,
  inkColors,
  logicalSynergy,
}) {
  const context = getFormatMetaContext(format, competitiveMetaData)
  const pairings = Array.isArray(context.metaPairings) ? context.metaPairings : []
  if (pairings.length === 0) {
    return {
      model: 'matchup_synergy_projection_v1',
      overallScore: 0,
      matchups: [],
    }
  }

  const archetypeLower = String(archetype || '').toLowerCase()
  const colorTokens = Object.keys(inkColors || {}).map((color) => String(color || '').toLowerCase())
  const signalMap = new Map(
    (logicalSynergy?.signals || []).map((signal) => [String(signal.name || '').toLowerCase(), signal.score || 0])
  )

  const interactionSignal = signalMap.get('tempo pressure chain') || 0
  const rampSignal = signalMap.get('ramp into payoff curve') || 0
  const valueSignal = signalMap.get('value engine stack') || 0
  const singerSignal = signalMap.get('singer + song engine') || 0

  const scored = pairings.map((entry) => {
    const deckLabel = String(entry?.deck || '').toLowerCase()
    const againstLabel = String(entry?.against || '').toLowerCase()
    const assessment = String(entry?.assessment || '').toLowerCase()

    let relevance = 0
    if (archetypeLower && deckLabel.includes(archetypeLower)) relevance += 45
    colorTokens.forEach((token) => {
      if (deckLabel.includes(token)) relevance += 15
    })
    if (relevance === 0) relevance = 18

    const wr = normalizeWinRateValue(entry?.winRate)
    const wrScore = wr !== null ? Math.max(0, Math.min(100, (wr - 35) * 2.5)) : 50

    let fitScore = 50
    if (againstLabel.includes('aggro') || againstLabel.includes('dogs')) {
      fitScore = Math.round((interactionSignal * 0.55) + (valueSignal * 0.30) + (rampSignal * 0.15))
    } else if (againstLabel.includes('control') || againstLabel.includes('sapphire')) {
      fitScore = Math.round((rampSignal * 0.35) + (valueSignal * 0.40) + (singerSignal * 0.25))
    } else if (againstLabel.includes('midrange') || againstLabel.includes('tempo')) {
      fitScore = Math.round((interactionSignal * 0.45) + (valueSignal * 0.35) + (singerSignal * 0.20))
    }
    fitScore = Math.max(0, Math.min(100, fitScore))

    let projection = Math.round((wrScore * 0.6) + (fitScore * 0.4))
    if (assessment.includes('strongly favored')) projection += 4
    if (assessment.includes('slightly favored')) projection += 2
    if (assessment.includes('strongly unfavored')) projection -= 4
    if (assessment.includes('slightly unfavored')) projection -= 2
    projection = Math.max(0, Math.min(100, projection))

    return {
      deck: entry?.deck || 'Unknown deck shell',
      against: entry?.against || 'Unknown matchup',
      winRate: entry?.winRate || null,
      assessment: entry?.assessment || null,
      relevance,
      wrScore,
      fitScore,
      projection,
      plan: entry?.plan || null,
    }
  })

  scored.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance
    return b.projection - a.projection
  })

  const topMatchups = scored.slice(0, 8)
  const weightedTotal = topMatchups.reduce((sum, item) => sum + (item.projection * item.relevance), 0)
  const weightSum = topMatchups.reduce((sum, item) => sum + item.relevance, 0)
  const overallScore = weightSum > 0 ? Math.round(weightedTotal / weightSum) : 0

  return {
    model: 'matchup_synergy_projection_v1',
    overallScore,
    matchups: topMatchups,
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function getArchetypeTargets(archetype) {
  const lower = String(archetype || '').toLowerCase()
  if (lower.includes('aggro')) {
    return {
      profile: 'Aggro pressure profile',
      earlyGamePercent: 40,
      lateGamePercent: 20,
      interactionRate: 14,
      rampRate: 4,
      drawRate: 10,
    }
  }
  if (lower.includes('tempo')) {
    return {
      profile: 'Tempo initiative profile',
      earlyGamePercent: 35,
      lateGamePercent: 22,
      interactionRate: 18,
      rampRate: 5,
      drawRate: 12,
    }
  }
  if (lower.includes('control') || lower.includes('ramp')) {
    return {
      profile: 'Control inevitability profile',
      earlyGamePercent: 20,
      lateGamePercent: 34,
      interactionRate: 22,
      rampRate: 10,
      drawRate: 15,
    }
  }
  return {
    profile: 'Midrange balance profile',
    earlyGamePercent: 30,
    lateGamePercent: 26,
    interactionRate: 17,
    rampRate: 7,
    drawRate: 12,
  }
}

function buildStrategyEngineInsights({
  archetype,
  totalCards,
  earlyGamePercent,
  lateGamePercent,
  interactionCount,
  rampCount,
  drawEngineCount,
  opening7,
  turn2Stability,
  interactionByTurn3,
  synergyModelScore,
  tournamentSynergy,
  logicalSynergy,
  matchupSynergy,
}) {
  const targets = getArchetypeTargets(archetype)
  const safeTotal = Math.max(1, totalCards || 0)
  const interactionRate = (interactionCount / safeTotal) * 100
  const rampRate = (rampCount / safeTotal) * 100
  const drawRate = (drawEngineCount / safeTotal) * 100

  const focusAreas = []

  const pushFocus = (area, current, target, action, impact) => {
    const delta = Number((current - target).toFixed(1))
    const gap = Math.abs(delta)
    const severity = gap >= 10 ? 'Critical' : gap >= 6 ? 'High' : gap >= 3 ? 'Medium' : 'Low'
    const status = gap <= 2.5 ? 'On Target' : current < target ? 'Below Target' : 'Above Target'
    focusAreas.push({
      area,
      current: Number(current.toFixed(1)),
      target: Number(target.toFixed(1)),
      delta,
      gap: Number(gap.toFixed(1)),
      status,
      severity,
      impact,
      action,
    })
  }

  pushFocus(
    'Early curve pressure (1-2 cost share)',
    earlyGamePercent,
    targets.earlyGamePercent,
    earlyGamePercent < targets.earlyGamePercent
      ? 'Increase 1-2 cost proactive slots by 2-4 cards to improve opening pressure.'
      : 'Trim 1-2 low-impact slots for stronger mid-game conversion cards.',
    'Opening stability and tempo starts'
  )

  pushFocus(
    'Late-game conversion (5+ cost share)',
    lateGamePercent,
    targets.lateGamePercent,
    lateGamePercent < targets.lateGamePercent
      ? 'Add 1-2 high-impact finishers that immediately swing board or lore races.'
      : 'Cut top-heavy cards that do not stabilize or close quickly.',
    'Closing power and inevitability'
  )

  pushFocus(
    'Interaction density',
    interactionRate,
    targets.interactionRate,
    interactionRate < targets.interactionRate
      ? 'Add cheap removal/challenge tools to hit opposing engines by turn 3.'
      : 'Replace excess interaction with proactive threats when matchup coverage is already strong.',
    'Matchup resilience versus fast and value decks'
  )

  pushFocus(
    'Ramp density',
    rampRate,
    targets.rampRate,
    rampRate < targets.rampRate
      ? 'Add acceleration pieces to unlock stronger turn-4 and turn-5 pivots.'
      : 'Trim redundant ramp for stronger payoffs if you flood on setup pieces.',
    'Speed to key power spikes'
  )

  pushFocus(
    'Card flow density (draw/search/filter)',
    drawRate,
    targets.drawRate,
    drawRate < targets.drawRate
      ? 'Add card flow effects so your best lines appear more often by turns 4-6.'
      : 'Convert extra card flow into board-impact cards if games are already stable.',
    'Consistency of high-value lines'
  )

  const consistencyFocus = {
    area: 'Tournament consistency checks',
    current: Number((opening7 * 100).toFixed(1)),
    target: 78,
    delta: Number(((opening7 * 100) - 78).toFixed(1)),
    gap: Number(Math.abs(((opening7 * 100) - 78)).toFixed(1)),
    status: opening7 >= 0.78 && turn2Stability >= 0.72 && interactionByTurn3 >= 0.58 ? 'On Target' : 'Below Target',
    severity: opening7 >= 0.78 && turn2Stability >= 0.72 && interactionByTurn3 >= 0.58 ? 'Low' : 'High',
    impact: 'Round-to-round reliability',
    action: opening7 >= 0.78 && turn2Stability >= 0.72
      ? 'Maintain curve discipline while refining matchup tech slots.'
      : 'Raise early playable count and cheap interaction to improve openers and turn-2 stability.',
    details: {
      opening7EarlyPlay: Math.round(opening7 * 100),
      turn2TwoPlays: Math.round(turn2Stability * 100),
      turn3Interaction: Math.round(interactionByTurn3 * 100),
    }
  }
  focusAreas.push(consistencyFocus)

  const weightedPenalty = focusAreas.reduce((sum, area) => {
    const weight = area.severity === 'Critical' ? 1.35 : area.severity === 'High' ? 1.15 : area.severity === 'Medium' ? 0.8 : 0.35
    return sum + (area.gap * weight)
  }, 0)

  const synergyBonus = (synergyModelScore >= 75 ? 9 : synergyModelScore >= 60 ? 5 : synergyModelScore >= 45 ? 2 : -4)
  const matchupBonus = (matchupSynergy?.overallScore || 0) >= 72 ? 5 : (matchupSynergy?.overallScore || 0) >= 60 ? 2 : -3
  const optimizationScore = clamp(Math.round(100 - weightedPenalty + synergyBonus + matchupBonus), 0, 100)

  const sortedFocus = [...focusAreas].sort((a, b) => {
    if (a.status === 'On Target' && b.status !== 'On Target') return 1
    if (a.status !== 'On Target' && b.status === 'On Target') return -1
    if (b.gap !== a.gap) return b.gap - a.gap
    return a.area.localeCompare(b.area)
  })

  const topPackage = Array.isArray(tournamentSynergy?.packages) ? tournamentSynergy.packages[0] : null
  const topSignal = Array.isArray(logicalSynergy?.signals) ? logicalSynergy.signals[0] : null
  const weakestMatchup = Array.isArray(matchupSynergy?.matchups) && matchupSynergy.matchups.length > 0
    ? [...matchupSynergy.matchups].sort((a, b) => a.projection - b.projection)[0]
    : null

  const recommendations = sortedFocus
    .filter((area) => area.status !== 'On Target')
    .slice(0, 5)
    .map((area, idx) => `${idx + 1}. ${area.area}: ${area.action}`)

  const mulliganRule = opening7 >= 0.8
    ? 'Keep proactive hands with at least one early play and one curve follow-up.'
    : 'Mulligan hands without a turn-1/turn-2 play or cheap interaction by default.'

  return {
    model: 'adaptive_strategy_engine_v1',
    profile: targets.profile,
    optimizationScore,
    focusAreas: sortedFocus,
    recommendations,
    winPath: {
      primaryTournamentLine: topPackage ? `${topPackage.name} (${Math.round((topPackage.completion || 0) * 100)}% online)` : 'No tournament package identified yet',
      primaryLogicalEngine: topSignal ? `${topSignal.name} (${topSignal.score}/100)` : 'No logical engine signal yet',
      weakestMatchup: weakestMatchup ? `${weakestMatchup.against} (${weakestMatchup.projection}/100)` : 'No matchup projection available',
      mulliganRule,
    },
    trainingSignals: {
      opening7EarlyPlay: Math.round(opening7 * 100),
      turn2TwoPlays: Math.round(turn2Stability * 100),
      turn3Interaction: Math.round(interactionByTurn3 * 100),
      synergyModelScore,
      matchupProjection: matchupSynergy?.overallScore || 0,
    },
  }
}

export function analyzeDeck(deckText, format = 'infinity', competitiveMetaData = null, cardSetsData = null, coreConstructed = null) {
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
  let singerCount = 0;
  let shiftCount = 0;
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
      parseInkColors(meta.ink).forEach((ink) => {
        inkColors[ink] = (inkColors[ink] || 0) + count
      })

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
      if (kws.some(k => k.includes('shift'))) { hasShift = true; shiftCount += count; }
      if (kws.some(k => k.includes('evasive'))) { hasEvasive = true; evasiveCount += count; }
      if (kws.some(k => k.includes('singer') || k.includes('sing'))) { hasSinger = true; singerCount += count; }
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

  const tournamentSynergy = summarizeTournamentSynergy(Object.entries(cards), format, competitiveMetaData, cardSetsData, coreConstructed)
  const logicalSynergy = summarizeLogicalSynergy({
    songCount,
    singerCount,
    shiftCount,
    rampCount,
    interactionCount,
    cost5PlusCount,
    evasiveCount,
    rushCount,
    bodyguardCount,
    challengerCount,
    drawEngineCount,
    cardCount: total,
  })

  const matchupSynergy = scoreMatchupSynergy({
    format,
    competitiveMetaData,
    archetype,
    inkColors,
    logicalSynergy,
  })

  const synergyModelScore = Math.round(
    (tournamentSynergy.score * 0.45) +
    (logicalSynergy.score * 0.35) +
    (matchupSynergy.overallScore * 0.20)
  )

  const strategyEngine = buildStrategyEngineInsights({
    archetype,
    totalCards: total,
    earlyGamePercent,
    lateGamePercent,
    interactionCount,
    rampCount,
    drawEngineCount,
    opening7,
    turn2Stability,
    interactionByTurn3,
    synergyModelScore,
    tournamentSynergy,
    logicalSynergy,
    matchupSynergy,
  })

  if (tournamentSynergy.packages.length > 0) {
    const topPkg = tournamentSynergy.packages[0]
    synergies.push({
      type: `Tournament Line: ${topPkg.name}`,
      strength: topPkg.status === 'fully_online' ? 'High' : topPkg.status === 'mostly_online' ? 'Medium' : 'Low',
      description: `Completion ${(topPkg.completion * 100).toFixed(0)}% (${topPkg.matchedCards.length}/${topPkg.matchedCards.length + topPkg.missingCards.length} pieces).`,
    })
  }

  const bestLogicalSignal = logicalSynergy.signals[0]
  if (bestLogicalSignal && bestLogicalSignal.score >= 40) {
    synergies.push({
      type: `Logical Engine: ${bestLogicalSignal.name}`,
      strength: bestLogicalSignal.score >= 70 ? 'High' : 'Medium',
      description: `${bestLogicalSignal.evidence} (score ${bestLogicalSignal.score}/100).`,
    })
  }

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
  if (synergyModelScore >= 70) competitiveScore += 4;
  else if (synergyModelScore >= 55) competitiveScore += 2;
  else if (synergyModelScore < 35) competitiveScore -= 4;
  if (strategyEngine.optimizationScore >= 80) competitiveScore += 2;
  else if (strategyEngine.optimizationScore < 45) competitiveScore -= 3;

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

  if (synergyModelScore < 40) {
    weaknesses.push({
      type: 'Synergy Coherence',
      severity: 'Medium',
      description: 'Deck has weak combo cohesion versus tournament lines and logical engine checks.'
    });
  }

  if ((strategyEngine?.optimizationScore || 0) < 55) {
    weaknesses.push({
      type: 'Strategy Engine Drift',
      severity: 'Medium',
      description: 'Deck is off target versus archetype curve and interaction benchmarks. Use strategy engine focus areas to tighten performance.'
    })
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
    synergyInsights: {
      overallScore: synergyModelScore,
      tournament: tournamentSynergy,
      logical: logicalSynergy,
      matchup: matchupSynergy,
    },
    strategyEngine,
    competitiveScore,
    competitiveTier
  };
}

