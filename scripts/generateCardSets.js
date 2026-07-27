#!/usr/bin/env node

/**
 * Generates cardSets.json from local allCards.json (preferred) with API fallback.
 *
 * Usage: node scripts/generateCardSets.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'cardSets.json');
const ALL_CARDS_FILE = path.join(DATA_DIR, 'allCards.json');
const LORCANA_JSON_URL = 'https://api.lorcana-api.com/cards/all';

function normalizeName(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function addMappingEntry(mapping, name, setNum) {
    const normalizedName = normalizeName(name);
    if (!normalizedName || !Number.isFinite(setNum)) return;
    if (!mapping[normalizedName]) mapping[normalizedName] = [];
    if (!mapping[normalizedName].includes(setNum)) {
        mapping[normalizedName].push(setNum);
    }
}

function sortMapping(mapping) {
    const sorted = {};
    Object.keys(mapping)
        .sort((a, b) => a.localeCompare(b))
        .forEach((key) => {
            sorted[key] = mapping[key].slice().sort((a, b) => a - b);
        });
    return sorted;
}

function buildFromLocalAllCards() {
    if (!fs.existsSync(ALL_CARDS_FILE)) {
        return null;
    }

    console.log('📦 Building card set mapping from local allCards.json...');
    const parsed = JSON.parse(fs.readFileSync(ALL_CARDS_FILE, 'utf8'));
    const cards = Array.isArray(parsed.cards) ? parsed.cards : [];

    const mapping = {};
    cards.forEach((card) => {
        const setNum = parseInt(card?.setCode, 10);
        const names = [card?.fullName, card?.name, card?.simpleName];
        names.forEach((name) => addMappingEntry(mapping, name, setNum));
    });

    return {
        source: 'local:src/data/allCards.json',
        cardSetMapping: sortMapping(mapping),
    };
}

function fetchFromApi() {
    console.log('📥 Fetching Lorcana card data from Lorcana-api.com...');
    console.log(`   Source: ${LORCANA_JSON_URL}`);

    return new Promise((resolve, reject) => {
        https.get(LORCANA_JSON_URL, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to fetch data. Status: ${res.statusCode}`));
                return;
            }

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
                process.stdout.write('.');
            });

            res.on('end', () => {
                console.log('\n✅ Data received!');
                try {
                    const response = JSON.parse(data);
                    const allCards = Array.isArray(response) ? response : (response.data || response.cards || []);
                    const mapping = {};

                    allCards.forEach((card) => {
                        addMappingEntry(mapping, card?.Name, Number(card?.Set_Num));
                    });

                    resolve({
                        source: LORCANA_JSON_URL,
                        cardSetMapping: sortMapping(mapping),
                    });
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

function writeOutput(source, cardSetMapping) {
    const totalUniqueCards = Object.keys(cardSetMapping).length;
    const output = {
        description: 'Maps card names to their set numbers (as arrays to handle reprints). Generated from local allCards data when available, with API fallback. For Core Constructed, a card is legal if ANY of its sets is in the current legal set window configured in src/data/coreConstructed.json.',
        lastUpdated: new Date().toISOString(),
        source,
        totalUniqueCards,
        cardSetMapping,
        notes: 'This file was auto-generated. To refresh with latest card data, run: npm run generate-cards. Each card stores all sets it appears in to support reprints.',
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`\n✅ SUCCESS! Generated ${OUTPUT_FILE}`);
    console.log(`   Total unique cards mapped: ${totalUniqueCards}`);
    console.log(`   File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`);
}

async function main() {
    try {
        let result = buildFromLocalAllCards();

        if (!result || !result.cardSetMapping || Object.keys(result.cardSetMapping).length === 0) {
            console.log('⚠️ Local allCards.json unavailable or empty; falling back to API.');
            result = await fetchFromApi();
        }

        writeOutput(result.source, result.cardSetMapping);
    } catch (err) {
        console.error(`❌ Error generating card sets: ${err.message}`);
        process.exit(1);
    }
}

main();
