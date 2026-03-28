import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function fail(message) {
  console.error(`FAIL: ${message}`)
  process.exit(1)
}

function normalizeCardKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a, b) {
  if (!a) return b ? b.length : 0
  if (!b) return a.length
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }

  return dp[m][n]
}

function buildMatcher(cardMeta) {
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

    const compact = n.replace(/\s+/g, '')
    for (const normalized of normalizedMetaKeys) {
      if (normalized.replace(/\s+/g, '') === compact) {
        return normalizedMetaKeyToKey.get(normalized)
      }
    }

    let best = null
    let bestDist = Infinity
    for (const normalized of normalizedMetaKeys) {
      const d = levenshtein(n, normalized)
      if (d < bestDist) {
        bestDist = d
        best = normalized
      }
    }

    if (best && bestDist <= Math.max(1, Math.floor(best.length * 0.3))) {
      return normalizedMetaKeyToKey.get(best)
    }

    return null
  }

  return { findBestMatch }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')
const cardMetaPath = path.join(root, 'src', 'data', 'cardMeta.json')
const allCardsPath = path.join(root, 'src', 'data', 'allCards.json')
const cardMeta = JSON.parse(fs.readFileSync(cardMetaPath, 'utf8'))
const allCardsData = JSON.parse(fs.readFileSync(allCardsPath, 'utf8'))

function buildAllCardsColorsMap(raw) {
  const map = new Map()
  const cards = raw && Array.isArray(raw.cards) ? raw.cards : []
  for (const card of cards) {
    const colors = Array.isArray(card?.colors) && card.colors.length > 0
      ? card.colors
      : (card?.color ? [card.color] : null)
    if (!colors) continue

    for (const name of [card.simpleName, card.fullName, card.name]) {
      const normalized = normalizeCardKey(name)
      if (normalized && !map.has(normalized)) {
        map.set(normalized, colors)
      }
    }
  }
  return map
}

function resolveColor(cardName, allCardsColorsMap) {
  const normalized = normalizeCardKey(cardName)
  if (!normalized) return null

  const meta = cardMeta[normalized]
  if (meta && typeof meta.ink === 'string') {
    return meta.ink
  }

  const fallbackColors = allCardsColorsMap.get(normalized)
  if (Array.isArray(fallbackColors) && fallbackColors.length > 0) {
    return fallbackColors[0]
  }

  return null
}

const matcher = buildMatcher(cardMeta)
const testInputs = ['raging storm', 'rabbit - fed up', 'mowgli - man cub']
const expectedRecognizedNames = ['raging storm', 'rabbit fed up', 'mowgli man cub']
for (let i = 0; i < testInputs.length; i++) {
  const match = matcher.findBestMatch(testInputs[i])
  const expected = expectedRecognizedNames[i]
  if (match !== expected) {
    fail(`Card input '${testInputs[i]}' did not resolve to '${expected}'. Got '${match}'`)
  }
}

const allCardsColorsMap = buildAllCardsColorsMap(allCardsData)
const expectedColors = {
  'raging storm': 'Amber',
  'rabbit fed up': 'Amethyst',
  'mowgli man cub': 'Amber',
}

for (const [name, expectedColor] of Object.entries(expectedColors)) {
  const resolved = resolveColor(name, allCardsColorsMap)
  if (!resolved) {
    fail(`No color resolved for card: ${name}`)
  }
  if (resolved !== expectedColor) {
    fail(`Unexpected color for ${name}. Expected ${expectedColor}, got ${resolved}`)
  }
}

console.log('PASS: Card recognition and color fallback regression checks passed.')
