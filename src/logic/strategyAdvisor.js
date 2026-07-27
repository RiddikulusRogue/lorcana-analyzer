const STRATEGY_LABELS = {
  auto: 'Auto',
  aggro: 'Aggro',
  tempo: 'Tempo',
  control: 'Control',
  midrange: 'Midrange',
  combo: 'Combo',
};

const normalizeStrategyPreference = (value) => {
  const query = String(value || '').toLowerCase().trim();
  if (!query || query === 'auto') return 'auto';
  if (query.includes('aggro') || query.includes('aggressive')) return 'aggro';
  if (query.includes('tempo')) return 'tempo';
  if (query.includes('control') || query.includes('ramp') || query.includes('control/ramp')) return 'control';
  if (query.includes('midrange') || query.includes('balanced')) return 'midrange';
  if (query.includes('combo') || query.includes('synergy')) return 'combo';
  return 'auto';
};

const getStrategyLabel = (strategyKey) => STRATEGY_LABELS[strategyKey] || STRATEGY_LABELS.midrange;

const getMetaDrivenStrategyCall = (metaContext = null) => {
  const topDecks = Array.isArray(metaContext?.topDecks) ? metaContext.topDecks : [];
  const pressure = { aggro: 0, control: 0, tempo: 0, midrange: 0 };

  topDecks.forEach((deck) => {
    const text = String([deck?.name, deck?.archetype, deck?.description].filter(Boolean).join(' ')).toLowerCase();
    const weight = (() => {
      const parsed = parseFloat(String(deck?.winRate || deck?.metaCount || deck?.count || 10));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
    })();

    if (text.includes('aggro') || text.includes('dogs') || text.includes('burn')) pressure.aggro += weight;
    if (text.includes('control') || text.includes('ramp') || text.includes('sapphire')) pressure.control += weight;
    if (text.includes('tempo') || text.includes('evasive')) pressure.tempo += weight;
    if (text.includes('midrange')) pressure.midrange += weight;
  });

  const sorted = Object.entries(pressure).sort((a, b) => b[1] - a[1]);
  const [dominant, dominantScore] = sorted[0] || ['midrange', 0];
  const runnerUpScore = sorted[1]?.[1] || 0;

  if (dominant === 'aggro' && dominantScore >= runnerUpScore + 8) {
    return {
      label: 'Control',
      reason: 'Aggro is overrepresented; a sturdier control shell is the cleanest counter-plan.',
    };
  }

  if (dominant === 'control' && dominantScore >= runnerUpScore + 8) {
    return {
      label: 'Aggro',
      reason: 'Control is the biggest share; speed and early pressure punish slow stabilization.',
    };
  }

  if (dominant === 'tempo' && dominantScore >= runnerUpScore + 8) {
    return {
      label: 'Midrange',
      reason: 'Tempo-heavy fields reward sturdier value trades and higher-ceiling threats.',
    };
  }

  if (dominant === 'midrange' && dominantScore >= runnerUpScore + 8) {
    return {
      label: 'Tempo',
      reason: 'Midrange mirrors are decided by initiative and cleaner curve pressure.',
    };
  }

  return {
    label: 'Midrange',
    reason: 'The field is mixed; a balanced value shell is the safest default.',
  };
};

export { STRATEGY_LABELS, getMetaDrivenStrategyCall, getStrategyLabel, normalizeStrategyPreference };