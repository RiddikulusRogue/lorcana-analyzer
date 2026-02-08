// src/logic/comparisonEngine.js

import metaArchetypes from '../data/metaArchetypes.json';
import cardMeta from '../data/cardMeta.json';

/**
 * Normalize card name for comparison
 */
function normalizeCardName(name) {
  return (name || '').toLowerCase().trim();
}

/**
 * Compare user's deck to a specific meta archetype
 */
export function compareToArchetype(userDeck, archetypeId) {
  const archetype = metaArchetypes.find(a => a.id === archetypeId);
  if (!archetype) {
    return { error: 'Archetype not found' };
  }

  const userCards = userDeck.cards || {};
  const metaCards = {};
  
  // Build meta card map
  archetype.keyCards.forEach(card => {
    const normalizedName = normalizeCardName(card.name);
    metaCards[normalizedName] = card.copies;
  });

  const comparison = {
    archetype: archetype,
    missing: [],      // Cards in meta but not in user deck
    extra: [],        // Cards in user deck but not in meta
    different: [],    // Cards with different quantities
    matching: [],     // Cards with same quantity
  };

  // Check what's in meta but missing/different in user deck
  archetype.keyCards.forEach(metaCard => {
    const normalizedMetaName = normalizeCardName(metaCard.name);
    
    // Find if user has this card (check various name formats)
    let userCount = 0;
    let matchedUserName = null;
    
    for (const [userName, count] of Object.entries(userCards)) {
      const normalizedUserName = normalizeCardName(userName);
      if (normalizedUserName === normalizedMetaName || 
          normalizedUserName.includes(normalizedMetaName) ||
          normalizedMetaName.includes(normalizedUserName)) {
        userCount = count;
        matchedUserName = userName;
        break;
      }
    }

    if (userCount === 0) {
      comparison.missing.push({
        name: metaCard.name,
        copies: metaCard.copies,
        priority: metaCard.priority
      });
    } else if (userCount !== metaCard.copies) {
      comparison.different.push({
        name: matchedUserName || metaCard.name,
        userCopies: userCount,
        metaCopies: metaCard.copies,
        priority: metaCard.priority
      });
    } else {
      comparison.matching.push({
        name: matchedUserName || metaCard.name,
        copies: userCount
      });
    }
  });

  // Check for extra cards in user deck
  for (const [userName, userCount] of Object.entries(userCards)) {
    const normalizedUserName = normalizeCardName(userName);
    let inMeta = false;
    
    for (const metaCard of archetype.keyCards) {
      const normalizedMetaName = normalizeCardName(metaCard.name);
      if (normalizedUserName === normalizedMetaName ||
          normalizedUserName.includes(normalizedMetaName) ||
          normalizedMetaName.includes(normalizedUserName)) {
        inMeta = true;
        break;
      }
    }
    
    if (!inMeta) {
      comparison.extra.push({
        name: userName,
        copies: userCount
      });
    }
  }

  return comparison;
}

/**
 * Compare all meta archetypes at once
 */
export function compareToAllArchetypes(userDeck) {
  return metaArchetypes.map(archetype => 
    compareToArchetype(userDeck, archetype.id)
  );
}

/**
 * Calculate curve comparison between user deck and archetype
 */
export function compareCurves(userDeck, archetypeId) {
  const archetype = metaArchetypes.find(a => a.id === archetypeId);
  if (!archetype) {
    return { error: 'Archetype not found' };
  }

  const userCards = userDeck.cards || {};
  const userCurve = {};
  let userTotal = 0;
  let userCostSum = 0;

  // Build user curve
  for (const [cardName, count] of Object.entries(userCards)) {
    const normalizedName = normalizeCardName(cardName);
    const meta = cardMeta[normalizedName];
    if (meta && typeof meta.cost === 'number') {
      const cost = meta.cost;
      userCurve[cost] = (userCurve[cost] || 0) + count;
      userTotal += count;
      userCostSum += cost * count;
    }
  }

  const userAvgCurve = userTotal > 0 ? userCostSum / userTotal : 0;

  return {
    userCurve,
    userAvgCurve: parseFloat(userAvgCurve.toFixed(2)),
    metaAvgCurve: archetype.avgCurve,
    curveDelta: parseFloat((userAvgCurve - archetype.avgCurve).toFixed(2))
  };
}

/**
 * Calculate color distribution comparison
 */
export function compareColors(userDeck, archetypeId) {
  const archetype = metaArchetypes.find(a => a.id === archetypeId);
  if (!archetype) {
    return { error: 'Archetype not found' };
  }

  const userCards = userDeck.cards || {};
  const userColors = {};

  // Count user color distribution
  for (const [cardName, count] of Object.entries(userCards)) {
    const normalizedName = normalizeCardName(cardName);
    const meta = cardMeta[normalizedName];
    if (meta && meta.ink) {
      userColors[meta.ink] = (userColors[meta.ink] || 0) + count;
    }
  }

  return {
    userColors,
    metaColors: archetype.colors
  };
}

/**
 * Generate recommendations based on comparison
 */
export function generateRecommendations(comparison, curveComparison) {
  const recommendations = [];

  // Missing essential cards
  const essentialMissing = comparison.missing.filter(c => c.priority === 'essential');
  if (essentialMissing.length > 0) {
    essentialMissing.forEach(card => {
      recommendations.push({
        type: 'add',
        severity: 'critical',
        message: `Add ${card.copies}x ${card.name} - Essential meta card, you're missing it`,
        card: card.name,
        copies: card.copies
      });
    });
  }

  // Missing high priority cards
  const highPriorityMissing = comparison.missing.filter(c => c.priority === 'high');
  if (highPriorityMissing.length > 0 && highPriorityMissing.length <= 3) {
    highPriorityMissing.forEach(card => {
      recommendations.push({
        type: 'add',
        severity: 'high',
        message: `Add ${card.copies}x ${card.name} - High priority meta card`,
        card: card.name,
        copies: card.copies
      });
    });
  }

  // Wrong quantities
  comparison.different.forEach(card => {
    if (card.priority === 'essential' || card.priority === 'high') {
      const delta = card.metaCopies - card.userCopies;
      if (delta > 0) {
        recommendations.push({
          type: 'adjust',
          severity: 'medium',
          message: `Add ${delta} more ${card.name} (have ${card.userCopies}, meta runs ${card.metaCopies})`,
          card: card.name,
          copies: delta
        });
      } else {
        recommendations.push({
          type: 'adjust',
          severity: 'low',
          message: `Consider cutting ${-delta} ${card.name} (have ${card.userCopies}, meta runs ${card.metaCopies})`,
          card: card.name,
          copies: delta
        });
      }
    }
  });

  // Curve recommendations
  if (curveComparison.curveDelta > 0.5) {
    recommendations.push({
      type: 'curve',
      severity: 'medium',
      message: `Your curve is too high (${curveComparison.userAvgCurve} vs meta ${curveComparison.metaAvgCurve}). Add more low-cost cards.`
    });
  } else if (curveComparison.curveDelta < -0.5) {
    recommendations.push({
      type: 'curve',
      severity: 'low',
      message: `Your curve is lower than meta (${curveComparison.userAvgCurve} vs ${curveComparison.metaAvgCurve}). Consider adding some finishers.`
    });
  }

  // Extra cards warning (if many)
  if (comparison.extra.length > 10) {
    recommendations.push({
      type: 'general',
      severity: 'low',
      message: `You have ${comparison.extra.length} cards not in meta. Review if they're tech choices or off-meta picks.`
    });
  }

  return recommendations.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Calculate estimated win rate vs archetype
 * Based on card similarity and meta matchup data
 */
export function estimateWinRate(userDeck, archetypeId) {
  const comparison = compareToArchetype(userDeck, archetypeId);
  if (comparison.error) {
    return 50; // default
  }

  const totalMetaCards = comparison.archetype.keyCards.length;
  const matching = comparison.matching.length;
  const different = comparison.different.length;
  const missing = comparison.missing.length;

  // Calculate similarity score (0-100)
  const matchingScore = matching / totalMetaCards;
  const differentScore = (different * 0.5) / totalMetaCards;
  const similarityScore = (matchingScore + differentScore) * 100;

  // Base win rate from user's archetype detection
  let baseWinRate = 50;
  
  // Try to determine user's archetype
  const userColors = Object.keys(userDeck.inkColors || {}).sort();
  const matchingArchetype = metaArchetypes.find(arch => {
    const archColors = arch.colors.sort();
    return JSON.stringify(archColors) === JSON.stringify(userColors);
  });

  if (matchingArchetype && comparison.archetype.winRates[matchingArchetype.id]) {
    baseWinRate = comparison.archetype.winRates[matchingArchetype.id];
  }

  // Adjust based on similarity
  // If 100% similar, use base rate. If 0% similar, reduce by 20%
  const adjustment = (similarityScore / 100) * 20 - 10;
  
  return Math.round(Math.max(20, Math.min(80, baseWinRate + adjustment)));
}

/**
 * Get all meta archetypes
 */
export function getAllArchetypes() {
  return metaArchetypes;
}

/**
 * Get specific archetype by ID
 */
export function getArchetype(archetypeId) {
  return metaArchetypes.find(a => a.id === archetypeId);
}

/**
 * Export comparison data as text
 */
export function exportComparisonAsText(comparison, curveComparison, recommendations) {
  let text = `DECK COMPARISON vs ${comparison.archetype.name}\n`;
  text += `Meta Share: ${comparison.archetype.metaShare}%\n`;
  text += `Average Curve: User ${curveComparison.userAvgCurve} vs Meta ${curveComparison.metaAvgCurve}\n\n`;

  text += `MISSING CARDS (${comparison.missing.length}):\n`;
  comparison.missing.forEach(card => {
    text += `  ❌ ${card.copies}x ${card.name} [${card.priority}]\n`;
  });

  text += `\nDIFFERENT QUANTITIES (${comparison.different.length}):\n`;
  comparison.different.forEach(card => {
    text += `  ⚠️ ${card.name}: You have ${card.userCopies}, meta runs ${card.metaCopies}\n`;
  });

  text += `\nMATCHING CARDS (${comparison.matching.length}):\n`;
  comparison.matching.forEach(card => {
    text += `  ✅ ${card.copies}x ${card.name}\n`;
  });

  text += `\nRECOMMENDATIONS:\n`;
  recommendations.forEach(rec => {
    text += `  ${rec.severity.toUpperCase()}: ${rec.message}\n`;
  });

  return text;
}
