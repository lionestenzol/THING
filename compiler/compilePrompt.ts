import type { CompileInput, CompileOutput, PromptLibrary, PromptModule } from "./types";
import { assertUniqueModuleIds, validateReferences } from "./enforceConstraints";
import { formatConstraints, formatIdentity, formatSection } from "./assembleFrames";

const CATEGORY_ORDER: Array<{
  category: PromptModule["category"];
  sectionTitle: string;
}> = [
  { category: "facial_pose", sectionTitle: "FACIAL POSES" },
  { category: "anatomy_pose", sectionTitle: "ANATOMY / BODY" },
  { category: "apparel_textile", sectionTitle: "APPAREL / TEXTILE" },
  { category: "product", sectionTitle: "PRODUCT / MACRO" },
  { category: "cinematography", sectionTitle: "CINEMATOGRAPHY" },
];

/**
 * Deterministic prompt compiler.
 * - Enforces canonical section order (independent of user selection order).
 * - Deduplicates and sorts constraints lexicographically.
 * - Includes GLOBAL RULES always (category === "global_rules").
 * - Fail-fast validation for required references.
 */
export function compilePrompt(input: CompileInput, library: PromptLibrary): CompileOutput {
  assertUniqueModuleIds(input.selected_modules);

  const resolved: PromptModule[] = input.selected_modules.map((id) => {
    const mod = library.byId[id];
    if (!mod) throw new Error(`Unknown module id: '${id}'`);
    return mod;
  });

  validateReferences(resolved, input);

  // Constraints: dedupe exact string matches; deterministic lexicographic sort
  const constraintSet = new Set<string>();
  for (const m of resolved) {
    for (const c of m.constraints ?? []) constraintSet.add(String(c));
  }
  const dedupedConstraints = Array.from(constraintSet).map((c) => c.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));

  // Prompts grouped by category in canonical order
  const byCategory: Record<string, PromptModule[]> = {};
  for (const m of resolved) {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m);
  }

  // Deterministic within-category ordering: by id (not label) for stability
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].sort((a, b) => a.id.localeCompare(b.id));
  }

  const blocks: string[] = [];

  blocks.push(formatSection("IDENTITY & REFERENCES", [formatIdentity(input)]));
  blocks.push(formatSection("GLOBAL RULES", library.globals.map((g) => g.prompt_text)));

  for (const { category, sectionTitle } of CATEGORY_ORDER) {
    const mods = byCategory[category] ?? [];
    blocks.push(formatSection(sectionTitle, mods.map((m) => m.prompt_text)));
  }

  // Variations reserved; included only if present (string passthrough in v1)
  if (input.variation_ids && input.variation_ids.length > 0) {
    blocks.push(formatSection("VARIATIONS", input.variation_ids.map((v) => String(v))));
  }

  blocks.push(formatConstraints(dedupedConstraints));

  const prompt = blocks.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";

  return {
    prompt,
    usedModuleIds: resolved.map((m) => m.id),
    dedupedConstraints,
  };
}
