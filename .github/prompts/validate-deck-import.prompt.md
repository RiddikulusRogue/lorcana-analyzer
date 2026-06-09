---
name: Validate Deck Import
description: One-shot validation of a Lorcana deck import. Checks each card against the API for correct core vs infinity classification, reports mismatches, and proposes fixes.
argument-hint: The deck URL or raw decklist to validate
mode: agent
tools: [read, search, edit]
---
Validate this deck import for correct core vs infinity card classification:

${input}

## Steps
1. Parse each card entry from the import (name, set, quantity).
2. For each card, locate the API call responsible for set classification.
3. Confirm the API response `set` field matches what is being stored.
4. List every card that is misclassified or failed API validation.
5. Propose and apply minimal code fixes for any mismatch found.

## Output
- Table of cards: name | expected set | actual set | status (OK / MISMATCH / API_ERROR)
- Root cause of any mismatch in one sentence per issue.
- Files changed and exact lines modified.
