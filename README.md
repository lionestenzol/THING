# Prompt Compiler (Phase B1 + B2)

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/lionestenzol/lionestenzol?utm_source=oss&utm_medium=github&utm_campaign=lionestenzol%2Flionestenzol&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

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
