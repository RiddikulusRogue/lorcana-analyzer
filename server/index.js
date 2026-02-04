const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

const DB = path.resolve(__dirname, 'data', 'decks.json');

const ensureDB = () => {
  try {
    const dir = path.dirname(DB);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DB)) {
      fs.writeFileSync(DB, JSON.stringify([]));
    }
  } catch (e) {
    console.error('[ERROR] ensureDB failed:', e.message);
  }
};

ensureDB();

function readDB() {
  try {
    const content = fs.readFileSync(DB, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.warn('[WARN] readDB failed:', e.message);
    return [];
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[ERROR] writeDB failed:', e.message);
    throw e;
  }
}

app.get('/api/decks', (req, res) => {
  try {
    const data = readDB();
    res.json(data);
  } catch (e) {
    console.error('[ERROR] GET /api/decks:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/decks', (req, res) => {
  try {
    const { name, deckText, analysis } = req.body || {};
    const data = readDB();
    const item = {
      id: nanoid(),
      name: name || 'Saved Deck',
      deckText: deckText || '',
      analysis: analysis || null,
      createdAt: new Date().toISOString()
    };
    data.unshift(item);
    writeDB(data);
    res.json(item);
  } catch (e) {
    console.error('[ERROR] POST /api/decks:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/decks/:id/share', (req, res) => {
  try {
    const data = readDB();
    const item = data.find(d => d.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'not found' });
    }
    const encoded = Buffer.from(item.deckText || '').toString('base64');
    const url = `${req.protocol}://${req.get('host')}/share/${item.id}?deck=${encoded}`;
    res.json({ viewUrl: url });
  } catch (e) {
    console.error('[ERROR] POST /api/decks/:id/share:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/coach', (req, res) => {
  try {
    const { deckText, analysis } = req.body || {};
    const advice = [];
    if (!analysis) {
      advice.push('No analysis provided; run analyzer first.');
    } else {
      if (analysis.total && analysis.total < 60) {
        advice.push('Deck has fewer than 60 cards; consider adding more.');
      }
      if (analysis.avgCost && parseFloat(analysis.avgCost) < 4) {
        advice.push('Average cost is low - consider more high-cost options to stabilize mid/late game.');
      }
      if (analysis.songCount && analysis.songCount > 0) {
        advice.push('Songs detected - ensure you have singers or ways to play them.');
      }
    }
    if (advice.length === 0) {
      advice.push('Deck looks reasonable; practice and iterate.');
    }
    res.json({ coaching: advice.join('\n') });
  } catch (e) {
    console.error('[ERROR] POST /api/coach:', e.message);
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 4000;
const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

server.on('error', (e) => {
  console.error('[ERROR] Server error:', e.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

