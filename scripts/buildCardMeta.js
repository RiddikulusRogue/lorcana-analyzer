import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const infile = path.resolve(__dirname, '../src/data/allCards.json');
const outfile = path.resolve(__dirname, '../src/data/cardMeta.json');

const j = JSON.parse(fs.readFileSync(infile, 'utf8'));
const cards = Array.isArray(j.cards) ? j.cards : Object.values(j.cards || {});

function toNumberOrNull(value) {
  return typeof value === 'number' ? value : null;
}

function extractKeywords(card) {
  const abilities = Array.isArray(card?.abilities) ? card.abilities : [];
  const keywords = [];

  abilities.forEach((ability) => {
    if (!ability) return;

    if (typeof ability === 'string') {
      keywords.push(ability);
      return;
    }

    if (ability.keyword) keywords.push(String(ability.keyword));
    if (ability.name) keywords.push(String(ability.name));
  });

  return [...new Set(keywords.filter(Boolean))];
}

const meta = {};

cards.forEach((card) => {
  const name = (card.simpleName || card.name || card.fullName || '').trim();
  if (!name) return;

  const key = name.toLowerCase();
  meta[key] = {
    name,
    type: card.type || null,
    ink: card.color || null,
    cost: toNumberOrNull(card.cost),
    lore: toNumberOrNull(card.lore),
    keywords: extractKeywords(card),
  };
});

fs.writeFileSync(outfile, JSON.stringify(meta, null, 2), 'utf8');
console.log('Wrote', outfile, Object.keys(meta).length, 'entries');
