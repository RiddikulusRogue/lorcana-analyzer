#!/usr/bin/env node

/**
 * Generates cardSets.json from LorcanaJSON database
 * This script fetches all Lorcana cards and creates a mapping of card names to set numbers
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

// URL to Lorcana-api.com cards endpoint
const LORCANA_JSON_URL = 'https://api.lorcana-api.com/cards/all';

console.log('📥 Fetching Lorcana card data from Lorcana-api.com...');
console.log(`   Source: ${LORCANA_JSON_URL}`);

// Fetch the data
https.get(LORCANA_JSON_URL, (res) => {
    if (res.statusCode !== 200) {
        console.error(`❌ Failed to fetch data. Status: ${res.statusCode}`);
        process.exit(1);
    }

    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
        process.stdout.write('.');
    });

    res.on('end', () => {
        console.log('\n✅ Data received!');
        processCards(data);
    });
}).on('error', (err) => {
    console.error(`❌ Network error: ${err.message}`);
    process.exit(1);
});

function processCards(jsonData) {
    try {
        console.log('🔄 Processing cards...');

        const response = JSON.parse(jsonData);
        const allCards = Array.isArray(response) ? response : (response.data || response.cards || []);
        const cardSetMapping = {};
        let uniqueCards = 0;

        // Build the mapping from the API response
        // Store ALL sets a card appears in (handles reprints)
        if (Array.isArray(allCards)) {
            allCards.forEach((card) => {
                // API returns Name and Set_Num fields
                if (card.Name && card.Set_Num !== undefined) {
                    // Normalize to lowercase to match your existing data format
                    const normalizedName = card.Name.toLowerCase();

                    // Store as array of sets (to handle reprints)
                    if (!cardSetMapping[normalizedName]) {
                        cardSetMapping[normalizedName] = [];
                        uniqueCards++;
                    }

                    // Add set if not already present (avoid duplicates)
                    if (!cardSetMapping[normalizedName].includes(card.Set_Num)) {
                        cardSetMapping[normalizedName].push(card.Set_Num);
                    }
                }
            });

            // Sort sets for each card for readability
            Object.keys(cardSetMapping).forEach(cardName => {
                cardSetMapping[cardName].sort((a, b) => a - b);
            });
        }

        console.log(`✅ Processed ${uniqueCards} unique cards`);

        // Create the output structure
        const output = {
            description: 'Maps card names to their set numbers (as arrays to handle reprints). Automatically generated from Lorcana-api.com database. For Core Constructed, a card is legal if ANY of its sets is in 5-11.',
            lastUpdated: new Date().toISOString(),
            source: 'https://api.lorcana-api.com',
            totalUniqueCards: uniqueCards,
            cardSetMapping: cardSetMapping,
            notes: 'This file was auto-generated. To refresh with latest card data, run: npm run generate-cards. Each card now stores an array of sets it appears in, supporting reprints.'
        };

        // Write the file
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
        console.log(`\n✅ SUCCESS! Generated ${OUTPUT_FILE}`);
        console.log(`   Total unique cards mapped: ${uniqueCards}`);
        console.log(`   File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`);

    } catch (err) {
        console.error(`❌ Error processing cards: ${err.message}`);
        process.exit(1);
    }
}
