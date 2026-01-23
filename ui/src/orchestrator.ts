/**
 * Phase C: Orchestration Layer
 *
 * Converts generator output into editor output.
 * Lives entirely in the UI layer - no business logic duplication.
 *
 * Flow:
 *   runShoot(input) -> hidden variations -> pick best -> refine -> final image
 */

export interface ShootInput {
  referenceImage: string;      // Base64 or URL of character reference
  compiledPrompt: string;      // From Phase B compiler
  shootType: string;           // Module ID for context
}

export interface ShootOutput {
  finalImage: string;          // Single refined result
  generationPrompt: string;    // Hidden: initial generation prompt
  refinementPrompt: string;    // Hidden: refinement prompt used
}

/**
 * Builds the refinement prompt for the second-pass generation.
 * Focuses on: identity preservation, artifact cleanup, realism.
 */
export function buildRefinementPrompt(
  candidateIndex: number,
  shootType: string
): string {
  return `REFINEMENT PASS - SINGLE IMAGE OUTPUT

SOURCE: Selected candidate #${candidateIndex + 1} from contact sheet generation.

OBJECTIVES:
1. IDENTITY LOCK - Preserve exact facial features, bone structure, skin tone from reference
2. ARTIFACT REMOVAL - Clean any generation artifacts, noise, or inconsistencies
3. SYMMETRY CORRECTION - Fix any asymmetrical features (eyes, ears, shoulders)
4. REALISM ENHANCEMENT - Improve skin texture, hair detail, fabric weave
5. SHARPENING - Enhance fine details without over-processing

CONSTRAINTS:
- Do NOT change pose, expression, or composition from candidate
- Do NOT alter lighting direction or color temperature
- Do NOT add or remove any elements
- Maintain exact framing and crop

OUTPUT: Single polished image at maximum quality.
Shoot context: ${shootType}`;
}

/**
 * Main orchestration function.
 *
 * Executes the full shoot pipeline:
 * 1. Lock identity from reference
 * 2. Generate variations (internally, hidden from user)
 * 3. Auto-select best candidate (index 0 for v1)
 * 4. Run refinement pass
 * 5. Return single final image
 */
export async function runShoot(input: ShootInput): Promise<ShootOutput> {
  const { referenceImage, compiledPrompt, shootType } = input;

  // Step 1: Identity is locked via the compiled prompt (CHARACTER REFERENCE IMAGE)
  // No additional work needed - Phase B handles this

  // Step 2: Generate variations (hidden)
  // In production, this would call the image generation API
  // The 3x2 contact sheet is generated but never shown to user
  const _hiddenContactSheet = await generateHiddenVariations(compiledPrompt, referenceImage);

  // Step 3: Auto-select best candidate
  // v1: Always select index 0
  // Future: Could use scoring/ranking algorithm
  const selectedIndex = 0;
  const selectedCandidate = _hiddenContactSheet[selectedIndex];

  // Step 4: Build and execute refinement pass
  const refinementPrompt = buildRefinementPrompt(selectedIndex, shootType);
  const finalImage = await refineCandidate(selectedCandidate, referenceImage, refinementPrompt);

  // Step 5: Return only the final refined image
  return {
    finalImage,
    generationPrompt: compiledPrompt,      // Hidden from UI
    refinementPrompt,                       // Hidden from UI
  };
}

/**
 * Generates the hidden contact sheet variations.
 * Returns array of 6 candidate images (3x2 grid internally).
 *
 * NOTE: This is a simulation for the UI layer.
 * In production, replace with actual API call.
 */
async function generateHiddenVariations(
  _prompt: string,
  referenceImage: string
): Promise<string[]> {
  // Simulate generation delay
  await delay(800);

  // Return 6 variations (using reference as placeholder)
  // In production: actual generated images from API
  return Array(6).fill(referenceImage);
}

/**
 * Refines a candidate image for final output.
 *
 * NOTE: This is a simulation for the UI layer.
 * In production, replace with actual refinement API call.
 */
async function refineCandidate(
  candidate: string,
  _reference: string,
  _refinementPrompt: string
): Promise<string> {
  // Simulate refinement delay
  await delay(700);

  // Return refined image (using candidate as placeholder)
  // In production: actual refined image from API
  return candidate;
}

/**
 * Utility: Promise-based delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
