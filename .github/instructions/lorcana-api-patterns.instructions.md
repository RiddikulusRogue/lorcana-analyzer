---
applyTo: "**"
---
# Lorcana API Patterns

When working in this repo, always follow these rules for card data and API usage.

## Card Validity Source of Truth
- Card set classification (core vs infinity) **must** come from the external Lorcana API, never from hardcoded local tables.
- If the API is unreachable, surface the error clearly and do NOT silently fall back to assumptions.

## API Call Conventions
- Normalize all card names and set identifiers to lowercase before sending to the API.
- Always check the `set` field in the API response to classify core vs infinity — do not infer from card number alone.
- Cache API responses per session where possible to avoid redundant calls, but never use a cached result past the session boundary.

## Card Insertion Rules
- A card may only be added to a deck after its validity has been confirmed by an API response.
- Reject and report any card whose API response is missing, malformed, or returns an unexpected set value.
- Deduplication must happen after validation, not before.

## General
- Do not introduce local set-classification logic that duplicates or contradicts API data.
- Keep API fetch, validation, and insertion as separate, traceable steps in the code.
