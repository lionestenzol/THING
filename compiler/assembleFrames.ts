/**
 * Minimal formatting helpers to keep compilePrompt pure + deterministic.
 */

export function formatSection(title: string, blocks: string[]): string {
  const cleaned = blocks
    .map((b) => (b ?? "").trim())
    .filter((b) => b.length > 0);

  if (cleaned.length === 0) return "";
  return `${title}\n${cleaned.join("\n\n")}\n`;
}

export function formatConstraints(constraints: string[]): string {
  const cleaned = constraints.map((c) => c.trim()).filter((c) => c.length > 0);
  if (cleaned.length === 0) return "";
  const lines = cleaned.map((c) => `- ${c}`);
  return `CONSTRAINTS\n${lines.join("\n")}\n`;
}

export function formatIdentity(input: { character_ref?: string | null; product_ref?: string | null; environment_ref?: string | null }): string {
  const lines: string[] = [];
  if (input.character_ref) lines.push("Use the uploaded CHARACTER REFERENCE IMAGE as the exact identity.");
  if (input.product_ref) lines.push("Use the uploaded PRODUCT REFERENCE IMAGE as the exact source.");
  if (input.environment_ref) lines.push("Use the uploaded ENVIRONMENT REFERENCE IMAGE as the spatial anchor.");
  if (lines.length === 0) lines.push("No reference images specified.");
  return lines.join("\n");
}
