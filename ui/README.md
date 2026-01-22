# Phase B3: UI Adapter Layer

Event-driven React UI for the Prompt Compiler system.

## Architecture

This UI is a **pure adapter layer** that:
- Dispatches user actions as events to `reduce(state, event, library)`
- Renders state exactly as returned by the reducer
- Displays errors only from `state.errors`
- Shows compiled output from `state.compiled`

## No Logic Duplication

- ✅ All validation logic lives in Phase B2 (`compiler/stateMachine.ts`)
- ✅ All compilation logic lives in Phase B1 (`compiler/compilePrompt.ts`)
- ✅ All data lives in Phase A (`data/*.json`)
- ✅ The UI contains zero business logic

## Running

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
```

## B3 Checklist Compliance

1. ✅ **No Logic Drift**: Calls `reduce()` directly, no duplicated logic
2. ✅ **No Phase A Mutation**: JSON files consumed read-only
3. ✅ **No Phase B1/B2 Mutation**: Compiler files unchanged
4. ✅ **Single Source of Truth**: All UI state from reducer
5. ✅ **Event-Only UI**: All actions dispatch explicit events
6. ✅ **Error Authority**: Errors displayed only from `state.errors`
7. ✅ **Compile Gate Integrity**: Compile disabled when `state.errors.length > 0`
8. ✅ **Scope Obedience**: No scope enforcement in UI, relies on B2
9. ✅ **Deterministic Output**: Same inputs produce identical output
10. ✅ **Copy Is Primary Action**: Instant copy with visual feedback

## Technology Stack

- React 18
- TypeScript 5
- Vite 7
- Tailwind CSS 3
