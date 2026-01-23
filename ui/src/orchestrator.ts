/**
 * Orchestrator Layer
 *
 * Converts generator flow → editor flow
 *
 * Does NOT modify Phase A/B logic.
 * Only adds orchestration on top.
 */

import type { CompileOutput } from '../../compiler/types';

export interface ShootInput {
  characterRef: string;
  shootType: string;
}

export interface ShootResult {
  /** The final refined prompt (single output) */
  finalPrompt: string;
  /** Internal: the base compiled prompt (hidden from user) */
  _basePrompt: string;
  /** Internal: refinement instructions (hidden from user) */
  _refinementPass: string;
  /** Fingerprint for cache/tracking */
  fingerprint: string;
}

/**
 * Refinement pass template
 * Applied after initial generation to polish the final output
 */
const REFINEMENT_TEMPLATE = `
## REFINEMENT PASS

Using the generated image as input, apply the following corrections:

1. IDENTITY LOCK
   - Verify facial features match reference exactly
   - Correct any drift in bone structure, eye shape, or skin tone
   - Ensure hair texture and color are consistent

2. ARTIFACT REMOVAL
   - Fix any hand/finger anomalies
   - Correct asymmetric features
   - Remove seam artifacts or blending errors
   - Clean up any texture inconsistencies

3. PHOTOGRAPHIC POLISH
   - Sharpen focus on key features
   - Balance lighting across the frame
   - Ensure natural skin texture (not plastic/AI look)
   - Verify fabric/material physics are realistic

4. FINAL OUTPUT
   - Deliver ONE image only
   - Professional photography grade
   - Print-ready quality

Reference: {CHARACTER_REF}
`.trim();

/**
 * Select best candidate from variation set
 * Currently: index 0 (deterministic)
 * Future: could use scoring/evaluation
 */
function selectBest(_variationCount: number): number {
  return 0;
}

/**
 * Generate refinement prompt for the polish pass
 */
function buildRefinementPrompt(characterRef: string): string {
  return REFINEMENT_TEMPLATE.replace('{CHARACTER_REF}', characterRef);
}

/**
 * Simple hash for fingerprinting
 */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Main orchestration function
 *
 * Converts generator output → editor output
 *
 * Flow:
 *   1. Take compiled output (from Phase B)
 *   2. Treat as hidden "variation sheet"
 *   3. Auto-select best candidate
 *   4. Apply refinement pass
 *   5. Return single final result
 */
export function runShoot(
  compiled: CompileOutput,
  input: ShootInput
): ShootResult {
  // Step 1: Base prompt comes from compiler (Phase B)
  const basePrompt = compiled.prompt;

  // Step 2: Internally we'd generate 6 variations (hidden)
  // For now, this is conceptual - the prompt already defines the sheet
  const _variationCount = 6;

  // Step 3: Auto-select best
  const _bestIndex = selectBest(_variationCount);

  // Step 4: Build refinement pass
  const refinementPass = buildRefinementPrompt(input.characterRef);

  // Step 5: Combine into final editor output
  const finalPrompt = `${basePrompt}

---

${refinementPass}`;

  // Generate fingerprint
  const fingerprint = hashString(finalPrompt + input.shootType);

  return {
    finalPrompt,
    _basePrompt: basePrompt,
    _refinementPass: refinementPass,
    fingerprint,
  };
}

/**
 * Editor mode flag
 * When true: single image output
 * When false: shows sheet (debug mode)
 */
export const EDITOR_MODE = true;
