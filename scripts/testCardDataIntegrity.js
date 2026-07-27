import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function fail(message) {
  console.error(`FAIL: ${message}`)
  process.exit(1)
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function toCardArray(raw) {
  if (Array.isArray(raw?.cards)) return raw.cards
  if (raw?.cards && typeof raw.cards === 'object') return Object.values(raw.cards)
  return []
}

function toSetList(value) {
  if (Array.isArray(value)) return value.filter((entry) => Number.isFinite(entry)).map((entry) => Number(entry)).sort((a, b) => a - b)
  return []
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const allCardsPath = path.join(root, 'src', 'data', 'allCards.json')
const cardMetaPath = path.join(root, 'src', 'data', 'cardMeta.json')
const cardSetsPath = path.join(root, 'src', 'data', 'cardSets.json')
const coreConstructedPath = path.join(root, 'src', 'data', 'coreConstructed.json')

const allCardsData = loadJson(allCardsPath)
const cardMeta = loadJson(cardMetaPath)
const cardSets = loadJson(cardSetsPath)
const coreConstructed = loadJson(coreConstructedPath)

const cards = toCardArray(allCardsData)
if (cards.length === 0) {
  fail('allCards.json does not contain any card records')
}

const normalizedCards = new Map()
const duplicateNames = []
const missingNames = []
const missingSetCodes = []

cards.forEach((card) => {
  const names = [card?.simpleName, card?.fullName, card?.name].map(normalizeName).filter(Boolean)
  const primaryName = names[0]
  if (!primaryName) {
    missingNames.push(card)
    return
  }

  if (card?.setCode == null || String(card.setCode).trim() === '') {
    missingSetCodes.push(primaryName)
  }

  if (!normalizedCards.has(primaryName)) {
    normalizedCards.set(primaryName, card)
  } else {
    duplicateNames.push(primaryName)
  }
})

if (missingNames.length > 0) {
  fail(`Found ${missingNames.length} cards without a usable name`) 
}

if (missingSetCodes.length > 0) {
  fail(`Found ${missingSetCodes.length} cards without a setCode value`) 
}

const expectedSetMapping = new Map()
for (const card of cards) {
  const setNum = parseInt(card?.setCode, 10)
  if (!Number.isFinite(setNum)) continue
  const canonicalName = normalizeName(card?.simpleName || card?.fullName || card?.name)
  if (!canonicalName) continue

  if (!expectedSetMapping.has(canonicalName)) {
    expectedSetMapping.set(canonicalName, new Set())
  }
  expectedSetMapping.get(canonicalName).add(setNum)
}

const actualSetMapping = cardSets?.cardSetMapping || {}
const setMappingMismatches = []

for (const [name, setNumbers] of expectedSetMapping.entries()) {
  const actual = toSetList(actualSetMapping[name])
  const expected = Array.from(setNumbers).sort((a, b) => a - b)
  const matches = actual.length === expected.length && actual.every((value, index) => value === expected[index])
  if (!matches) {
    setMappingMismatches.push({ name, expected, actual })
  }
}

const extraSetMappings = Object.keys(actualSetMapping).filter((name) => !expectedSetMapping.has(name))

if (setMappingMismatches.length > 0) {
  const sample = setMappingMismatches.slice(0, 5).map((entry) => `${entry.name}: expected [${entry.expected.join(', ')}], got [${entry.actual.join(', ')}]`)
  fail(`cardSets.json has ${setMappingMismatches.length} mismatched entries. Sample: ${sample.join(' | ')}`)
}

if (extraSetMappings.length > 0) {
  console.log(`Note: cardSets.json includes ${extraSetMappings.length} alias entries not used as canonical allCards keys.`)
}

const missingMetaEntries = []
const metaMismatchEntries = []

for (const [name, card] of normalizedCards.entries()) {
  const meta = cardMeta[name]
  if (!meta) {
    missingMetaEntries.push(name)
    continue
  }

  const expectedInk = card?.color ?? null
  if (typeof expectedInk === 'string' && expectedInk.length > 0 && String(meta.ink || '') !== expectedInk) {
    metaMismatchEntries.push(`${name} (ink expected ${expectedInk}, got ${meta.ink || 'null'})`)
  }

  if (normalizeName(meta.name) !== name) {
    metaMismatchEntries.push(`${name} (meta name mismatch: ${meta.name || 'null'})`)
  }
}

const extraMetaEntries = Object.keys(cardMeta).filter((name) => !normalizedCards.has(name))

if (missingMetaEntries.length > 0) {
  fail(`cardMeta.json is missing ${missingMetaEntries.length} card entries`)
}

if (metaMismatchEntries.length > 0) {
  const sample = metaMismatchEntries.slice(0, 5).join(' | ')
  fail(`cardMeta.json has mismatched fields. Sample: ${sample}`)
}

if (extraMetaEntries.length > 0) {
  fail(`cardMeta.json has ${extraMetaEntries.length} entries not present in allCards.json`)
}

const legalSets = toSetList(coreConstructed?.legalSets)
if (legalSets.length === 0) {
  fail('coreConstructed.json does not define any legal sets')
}

const expectedCoreWindow = [9, 10, 11, 12, 13]
const coreWindowMatches = legalSets.length === expectedCoreWindow.length && legalSets.every((value, index) => value === expectedCoreWindow[index])
if (!coreWindowMatches) {
  fail(`coreConstructed.json legalSets should be [${expectedCoreWindow.join(', ')}], got [${legalSets.join(', ')}]`)
}

if (!Array.isArray(coreConstructed?.legalCards) || coreConstructed.legalCards.length === 0) {
  fail('coreConstructed.json does not list any legal cards')
}

if (duplicateNames.length > 0) {
  console.log(`Note: found ${duplicateNames.length} repeated normalized card names in allCards.json. This is expected for reprints and aliases.`)
}

console.log('PASS: Card data integrity checks passed.')