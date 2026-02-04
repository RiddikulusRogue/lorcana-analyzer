const fs = require('fs');
const path = require('path');

const infile = path.resolve(__dirname, '../src/data/allCards.json');
const outfile = path.resolve(__dirname, '../src/data/cardMeta.json');

const j = JSON.parse(fs.readFileSync(infile, 'utf8'));
const cards = Object.values(j.cards || {});

const meta = {};

cards.forEach(c => {
  const name = (c.simpleName || c.name || c.fullName || '').trim();
  if (!name) return;
  const key = name.toLowerCase();
  meta[key] = {
    name,
    type: c.type || null,
    ink: c.inkwell || c.color || null,
    cost: c.cost !== undefined ? c.cost : null,
    lore: c.lore !== undefined ? c.lore : null,
    keywords: (c.abilities || []).map(a => (a.name || a).toString())
  };
});

fs.writeFileSync(outfile, JSON.stringify(meta, null, 2), 'utf8');
console.log('Wrote', outfile, Object.keys(meta).length, 'entries');
