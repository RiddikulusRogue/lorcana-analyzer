import {
  getMetaDrivenStrategyCall,
  getStrategyLabel,
  normalizeStrategyPreference,
} from '../src/logic/strategyAdvisor.js'

function fail(message) {
  console.error(`FAIL: ${message}`)
  process.exit(1)
}

const normalizationCases = [
  ['Auto', 'auto'],
  ['Aggressive speed', 'aggro'],
  ['tempo', 'tempo'],
  ['Control / Ramp', 'control'],
  ['Balanced midrange', 'midrange'],
  ['combo synergy', 'combo'],
  ['unknown text', 'auto'],
]

for (const [input, expected] of normalizationCases) {
  const actual = normalizeStrategyPreference(input)
  if (actual !== expected) {
    fail(`normalizeStrategyPreference('${input}') expected '${expected}' but got '${actual}'`)
  }
}

const labelCases = [
  ['auto', 'Auto'],
  ['aggro', 'Aggro'],
  ['tempo', 'Tempo'],
  ['control', 'Control'],
  ['midrange', 'Midrange'],
  ['combo', 'Combo'],
]

for (const [input, expected] of labelCases) {
  const actual = getStrategyLabel(input)
  if (actual !== expected) {
    fail(`getStrategyLabel('${input}') expected '${expected}' but got '${actual}'`)
  }
}

const aggroHeavyMeta = {
  topDecks: [
    { name: 'Amber Aggro', archetype: 'Aggro', description: 'fast pressure', winRate: '61.2%' },
    { name: 'Ruby Burn', archetype: 'Aggro', description: 'burn and reach', winRate: '58.0%' },
    { name: 'Emerald Tempo', archetype: 'Tempo', description: 'evasive trading', winRate: '49.0%' },
  ],
}

const controlHeavyMeta = {
  topDecks: [
    { name: 'Steel Control', archetype: 'Control', description: 'long game stabilization', winRate: '62.0%' },
    { name: 'Sapphire Ramp', archetype: 'Control/Ramp', description: 'slow resource engine', winRate: '60.0%' },
    { name: 'Amethyst Control', archetype: 'Control', description: 'answers and draw', winRate: '57.0%' },
  ],
}

const aggroCounter = getMetaDrivenStrategyCall(aggroHeavyMeta)
if (aggroCounter.label !== 'Control') {
  fail(`Expected aggro-heavy meta to recommend Control, got '${aggroCounter.label}'`)
}

const controlCounter = getMetaDrivenStrategyCall(controlHeavyMeta)
if (controlCounter.label !== 'Aggro') {
  fail(`Expected control-heavy meta to recommend Aggro, got '${controlCounter.label}'`)
}

if (!aggroCounter.reason || !controlCounter.reason) {
  fail('Meta-driven strategy recommendations should include a reason')
}

console.log('PASS: Strategy advisor regression checks passed.')