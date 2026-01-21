import fs from "node:fs";
import path from "node:path";
import type { PromptLibrary, PromptModule } from "./types";
import { compilePrompt } from "./compilePrompt";

export function loadLibraryFromDataDir(dataDir: string): PromptLibrary {
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".json")).sort();
  const all: PromptModule[] = [];

  for (const f of files) {
    const full = path.join(dataDir, f);
    const raw = fs.readFileSync(full, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error(`Expected array in ${f}`);
    for (const item of parsed) all.push(item as PromptModule);
  }

  const byId: Record<string, PromptModule> = {};
  for (const m of all) {
    if (!m?.id) throw new Error("Module missing id");
    if (byId[m.id]) throw new Error(`Duplicate module id in library: '${m.id}'`);
    byId[m.id] = m;
  }

  const globals = all.filter((m) => m.category === "global_rules");

  return { byId, globals };
}

export { compilePrompt };
export type { CompileInput, CompileOutput, PromptLibrary, PromptModule } from "./types";

export { initialState, reduce, validateState, deriveMeta, fingerprint } from './stateMachine';
export type { AppState, Event, RefSlot, Scope, DerivedModuleMeta } from './stateMachine';
