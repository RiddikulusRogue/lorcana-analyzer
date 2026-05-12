#!/usr/bin/env node

/**
 * Refreshes src/data/allCards.json from LorcanaJSON.
 *
 * Usage: node scripts/refreshAllCards.js
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputFile = path.join(rootDir, 'src/data/allCards.json');
const sourceUrl = 'https://lorcanajson.org/files/current/en/allCards.json';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to fetch ${url}. Status: ${res.statusCode}`));
          return;
        }

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(`Invalid JSON from ${url}: ${err.message}`));
          }
        });
      })
      .on('error', (err) => reject(err));
  });
}

function summarizeCards(allCards) {
  const cards = Array.isArray(allCards?.cards) ? allCards.cards : Object.values(allCards?.cards || {});
  const setNumbers = [...new Set(cards.map((card) => Number(card?.setCode)).filter(Number.isFinite))].sort((a, b) => a - b);
  const maxSet = setNumbers.length ? setNumbers[setNumbers.length - 1] : null;
  return {
    totalCards: cards.length,
    setNumbers,
    maxSet,
  };
}

async function main() {
  try {
    console.log(`Fetching latest allCards from ${sourceUrl}...`);
    const allCards = await fetchJson(sourceUrl);

    fs.writeFileSync(outputFile, JSON.stringify(allCards, null, 2), 'utf8');

    const summary = summarizeCards(allCards);
    console.log(`Updated ${outputFile}`);
    console.log(`Cards: ${summary.totalCards}`);
    console.log(`Sets: ${summary.setNumbers.join(', ')}`);
    console.log(`Max set: ${summary.maxSet ?? 'n/a'}`);
  } catch (err) {
    console.error(`Failed to refresh allCards.json: ${err.message}`);
    process.exit(1);
  }
}

main();
