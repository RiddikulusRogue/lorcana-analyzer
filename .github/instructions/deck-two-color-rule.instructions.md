---
description: "Use when validating deck imports, adding cards, or checking deck legality in the Lorcana analyzer. Enforce exactly two playable colors and flag cards outside the specified main colors."
---
# Deck Two-Color Rule

Enforce this as a hard rule for all deck validation and card-insertion flows.

## Required Behavior
- A deck is playable only if it contains exactly two unique colors.
- The two playable colors must match the declared main colors for that deck.
- If declared main colors are missing, validation must fail immediately.
- Any card with a color outside the declared main colors must be flagged.

## Validation Steps
1. Read or resolve the deck's declared main colors.
2. Normalize color names (trim and case-normalize) before comparing.
3. Build the set of unique colors present in the deck.
4. Fail validation if unique deck colors are not exactly two.
5. Flag each card whose color is not in the declared main colors.
6. Block insertion or save if flagged cards exist.

## Output Requirements
- Return a machine-checkable status: PASS or FAIL.
- Include detected deck colors and declared main colors.
- Include a list of flagged cards with their disallowed colors.

## Safety
- Do not auto-correct card colors silently.
- Do not infer a replacement color for flagged cards.
- Do not infer main colors from deck cards.
