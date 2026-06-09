# Domain Docs

How engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- `CONTEXT.md` at the repo root
- Relevant architectural decision records under `docs/adr/`

If these files do not exist, proceed silently. Do not suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions are resolved.

## File structure

This is a single-context repository:

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Use the glossary's vocabulary

When output names a domain concept, use the term defined in `CONTEXT.md`. Do not drift to synonyms the glossary explicitly avoids.

If a needed concept is not in the glossary, reconsider whether the term belongs to the project or note the gap for `/grill-with-docs`.

## Flag ADR conflicts

If output contradicts an existing ADR, surface the conflict explicitly rather than silently overriding it.
