---
name: deck-two-color-validation
description: 'Validate Lorcana decks to ensure they contain exactly two colors and no colors outside the declared main color pair. Use for deck import checks, deck legality validation, and troubleshooting color-rule violations.'
argument-hint: 'Deck source plus the two allowed main colors (for example: Amber and Steel)'
user-invocable: true
---

# Deck Two-Color Validation

## Outcome
Produce a clear legality decision for a deck color profile:
- PASS: Exactly two colors are present and both are in the declared main set.
- FAIL: Fewer or more than two colors are present, or one or more colors are outside the declared main set.

## When To Use
- Verifying deck imports before saving
- Blocking illegal deck submissions
- Debugging wrong color detection in parser or card mapping

## Inputs
- Deck card list (names, quantities, and resolved color where available)
- Declared main color set from user input or deck metadata (expected pair, size must be 2)
- Card-color source (API payload field or normalized local model field)

## Canonical Colors
Only these color names are valid:
- Amber
- Amethyst
- Emerald
- Ruby
- Sapphire
- Steel

## Procedure
1. Normalize color values.
Normalize all color values to canonical form (case-insensitive; trim whitespace).
2. Resolve missing colors.
If a card color is missing, fetch or map it using the project's authoritative source before validation.
3. Build the deck color set.
Create a unique set of colors present in the deck after normalization.
4. Validate count rule.
If deck color set size is not exactly 2, return FAIL with actual color list.
5. Validate allowed-colors rule.
Compare deck color set against declared main color set.
If any deck color is not in main set, return FAIL with disallowed colors.
6. Emit decision and diagnostics.
Return PASS or FAIL, color set found, expected color set, and per-card offenders if any.

## Branching Logic
- If declared main color set is missing or not size 2: stop and return INPUT_ERROR.
- If declared main color set contains any value outside the six canonical colors: stop and return INPUT_ERROR.
- If card colors cannot be resolved for one or more cards: return DATA_ERROR with unresolved cards.
- If deck has exactly two colors but includes a disallowed color: FAIL (out-of-set color violation).
- Do not infer main colors from deck contents; validation must use the declared main color pair only.

## Completion Checks
- Exactly two unique colors found in the deck
- Every deck color is inside the declared main color pair
- No unresolved card colors remain
- Validation result includes machine-checkable status: PASS, FAIL, INPUT_ERROR, or DATA_ERROR

## Output Contract
Return a structured result with:
- status
- expected_main_colors
- detected_deck_colors
- disallowed_colors
- unresolved_cards
- summary
