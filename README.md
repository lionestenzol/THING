# Prompt Compiler (Phase B1 + B2)

This repo contains the deterministic prompt compiler core (B1) and the state machine governor (B2).

## What it does
- Loads frozen Phase A JSON modules from `/data`
- Compiles a single prompt string from selected module IDs
- Enforces canonical ordering (independent of selection order)
- Deduplicates + sorts constraints for determinism
- Fail-fast validation for required references
- B2 reducer governs selection + reference requirements + scope rules

## Install
```bash
npm i
```

## Test
```bash
npm test
```

## Typecheck / Build
```bash
npm run typecheck
npm run build
```
