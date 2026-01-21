import type { CompileInput, PromptModule } from "./types";

/**
 * Fail-fast validation for required references.
 * Uses literal substring checks on prompt_text to avoid inventing schema fields.
 */
export function validateReferences(modules: PromptModule[], input: CompileInput): void {
  const needsCharacter = modules.some((m) => m.prompt_text.includes("CHARACTER REFERENCE IMAGE"));
  const needsProduct = modules.some((m) => m.prompt_text.includes("PRODUCT REFERENCE IMAGE"));
  const needsEnvironment = modules.some((m) => m.prompt_text.includes("ENVIRONMENT REFERENCE IMAGE"));

  if (needsCharacter && !input.character_ref) {
    throw new Error("Character reference required: a selected module mentions 'CHARACTER REFERENCE IMAGE'.");
  }
  if (needsProduct && !input.product_ref) {
    throw new Error("Product reference required: a selected module mentions 'PRODUCT REFERENCE IMAGE'.");
  }
  if (needsEnvironment && !input.environment_ref) {
    throw new Error("Environment reference required: a selected module mentions 'ENVIRONMENT REFERENCE IMAGE'.");
  }
}

export function assertUniqueModuleIds(ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`Duplicate module id selected: '${id}'`);
    seen.add(id);
  }
}
