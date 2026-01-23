/**
 * Phase C Orchestration Layer
 *
 * Converts generator workflow into editor workflow.
 * Does NOT modify Phase A/B - only wraps their outputs.
 */

export type ShootInput = {
  prompt: string;
  characterRef: string;
  generateFn: (prompt: string) => Promise<string[]>; // returns image URLs
};

export type ShootResult = {
  finalImage: string;
  status: 'idle' | 'generating' | 'refining' | 'complete' | 'error';
  error?: string;
};

/**
 * Refinement prompt template.
 * Preserves identity while cleaning artifacts.
 */
const REFINE_SUFFIX = `

[REFINEMENT PASS]
- Preserve exact identity from reference
- Clean any artifacts or noise
- Fix asymmetry in face/body
- Improve photorealism
- Sharpen fine details
- Maintain lighting consistency
- No style drift allowed`;

/**
 * Refine a candidate image.
 * Takes the best candidate and applies cleanup pass.
 */
export async function refine(
  candidate: string,
  characterRef: string,
  generateFn: (prompt: string) => Promise<string[]>
): Promise<string> {
  const refinePrompt = `Refine this image: ${candidate}
Character reference: ${characterRef}
${REFINE_SUFFIX}`;

  const results = await generateFn(refinePrompt);
  return results[0]; // single refined output
}

/**
 * Main orchestration function.
 *
 * Workflow:
 * 1. Lock identity (via characterRef)
 * 2. Generate variations (hidden from user)
 * 3. Pick best candidate (index 0)
 * 4. Refine best
 * 5. Return single final image
 */
export async function runShoot(input: ShootInput): Promise<string> {
  const { prompt, characterRef, generateFn } = input;

  // Step 1-2: Generate variations (hidden)
  // This produces the 3x2 sheet internally but user never sees it
  const variations = await generateFn(prompt);

  if (!variations || variations.length === 0) {
    throw new Error('Generation produced no results');
  }

  // Step 3: Auto-select best candidate (index 0)
  const bestCandidate = variations[0];

  // Step 4: Refine best
  const finalImage = await refine(bestCandidate, characterRef, generateFn);

  // Step 5: Return single final image
  return finalImage;
}

/**
 * Orchestration state for React integration.
 */
export type OrchestrationState = {
  status: 'idle' | 'generating' | 'refining' | 'complete' | 'error';
  finalImage: string | null;
  error: string | null;
};

export const initialOrchestrationState: OrchestrationState = {
  status: 'idle',
  finalImage: null,
  error: null,
};

export type OrchestrationEvent =
  | { type: 'START' }
  | { type: 'VARIATIONS_DONE' }
  | { type: 'REFINE_DONE'; image: string }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' };

/**
 * Pure reducer for orchestration state.
 * Event-driven, deterministic.
 */
export function orchestrationReducer(
  state: OrchestrationState,
  event: OrchestrationEvent
): OrchestrationState {
  switch (event.type) {
    case 'START':
      return { status: 'generating', finalImage: null, error: null };
    case 'VARIATIONS_DONE':
      return { ...state, status: 'refining' };
    case 'REFINE_DONE':
      return { status: 'complete', finalImage: event.image, error: null };
    case 'ERROR':
      return { status: 'error', finalImage: null, error: event.message };
    case 'RESET':
      return initialOrchestrationState;
    default:
      return state;
  }
}
