import type { PromptLibrary, PromptModule, CompileInput, CompileOutput } from "./types";
import { compilePrompt } from "./compilePrompt";

export type RefSlot = "character" | "product" | "environment";
export type Scope = "full_body" | "face_only" | "hands_only" | "environment_only" | "mixed";

export type DerivedModuleMeta = {
  requires: { character: boolean; product: boolean; environment: boolean };
  scope: Scope;
  category: PromptModule["category"];
};

export type AppState = {
  refs: {
    character?: string | null;
    product?: string | null;
    environment?: string | null;
  };
  selected: {
    facial_pose: string[];
    anatomy_pose: string[];
    apparel_textile: string[];
    product: string[];
    cinematography: string[];
  };
  variations: string[];
  compiled?: (CompileOutput & { fingerprint: string }) | null;
  errors: string[];
};

export type Event =
  | { type: "SET_REF"; slot: RefSlot; value: string | null }
  | { type: "CLEAR_REF"; slot: RefSlot }
  | { type: "SELECT_MODULE"; moduleId: string }
  | { type: "DESELECT_MODULE"; moduleId: string }
  | { type: "CLEAR_CATEGORY"; category: keyof AppState["selected"] }
  | { type: "ADD_VARIATION"; variationId: string }
  | { type: "REMOVE_VARIATION"; variationId: string }
  | { type: "COMPILE" };

export function initialState(): AppState {
  return {
    refs: { character: null, product: null, environment: null },
    selected: {
      facial_pose: [],
      anatomy_pose: [],
      apparel_textile: [],
      product: [],
      cinematography: [],
    },
    variations: [],
    compiled: null,
    errors: [],
  };
}

/**
 * Derive requirements + scope without changing the frozen JSON schema.
 * Keep this strict and simple for v1.
 */
export function deriveMeta(module: PromptModule): DerivedModuleMeta {
  const t = module.prompt_text ?? "";

  const requires = {
    character: t.includes("CHARACTER REFERENCE IMAGE"),
    product: t.includes("PRODUCT REFERENCE IMAGE"),
    environment: t.includes("ENVIRONMENT REFERENCE IMAGE"),
  };

  const upper = t.toUpperCase();

  let scope: Scope = "full_body";
  if (upper.includes("HANDS ONLY")) scope = "hands_only";
  else if (requires.environment && !requires.character && !requires.product) scope = "environment_only";
  else if (module.category === "facial_pose") scope = "face_only";
  else if (t.toLowerCase().includes("facial close-up") || t.toLowerCase().includes("extreme facial close-up")) scope = "face_only";
  else scope = "full_body";

  return { requires, scope, category: module.category };
}

function flattenSelected(selected: AppState["selected"]): string[] {
  return [
    ...selected.facial_pose,
    ...selected.anatomy_pose,
    ...selected.apparel_textile,
    ...selected.product,
    ...selected.cinematography,
  ];
}

export function resolveModules(state: AppState, library: PromptLibrary): PromptModule[] {
  const ids = flattenSelected(state.selected);
  return ids.map((id) => {
    const m = library.byId[id];
    if (!m) throw new Error(`Unknown module id in state: '${id}'`);
    return m;
  });
}

function anyScope(metas: DerivedModuleMeta[], scope: Scope): boolean {
  return metas.some((m) => m.scope === scope);
}

export function validateState(state: AppState, library: PromptLibrary): string[] {
  const errors: string[] = [];
  const modules = resolveModules(state, library);
  const metas = modules.map(deriveMeta);

  const needsCharacter = metas.some((m) => m.requires.character);
  const needsProduct = metas.some((m) => m.requires.product);
  const needsEnvironment = metas.some((m) => m.requires.environment);

  if (needsCharacter && !state.refs.character) errors.push("Missing character reference.");
  if (needsProduct && !state.refs.product) errors.push("Missing product reference.");
  if (needsEnvironment && !state.refs.environment) errors.push("Missing environment reference.");

  const selectedCount = metas.length;

  // v1 strict scope compatibility
  if (anyScope(metas, "hands_only") && selectedCount > 1) {
    errors.push("Hands-only module cannot be combined with other modules in v1.");
  }
  if (anyScope(metas, "environment_only") && selectedCount > 1) {
    errors.push("Environment-only module cannot be combined with other modules in v1.");
  }

  return errors;
}

function violatesScopeOnSelect(nextModule: PromptModule, state: AppState, library: PromptLibrary): string | null {
  const nextMeta = deriveMeta(nextModule);
  const existingMetas = resolveModules(state, library).map(deriveMeta);

  if (existingMetas.length === 0) return null;

  if (nextMeta.scope === "hands_only") return "Hands-only module must be used alone in v1.";
  if (anyScope(existingMetas, "hands_only")) return "Cannot add modules when a hands-only module is selected in v1.";

  if (nextMeta.scope === "environment_only") return "Environment-only module must be used alone in v1.";
  if (anyScope(existingMetas, "environment_only")) return "Cannot add modules when an Environment-only module is selected in v1.";

  return null;
}

export function fingerprint(state: AppState): string {
  const stable = stableStringify({
    refs: state.refs,
    selected: state.selected,
    variations: [...state.variations].sort(),
  });
  return djb2(stable).toString(16);
}

function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(stableStringify).join(",") + "]";

  const rec = obj as Record<string, unknown>;
  const keys = Object.keys(rec).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(rec[k])).join(",") + "}";
}

function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  return hash >>> 0;
}

function findCategoryKeyForModule(mod: PromptModule): keyof AppState["selected"] | null {
  if (mod.category === "facial_pose") return "facial_pose";
  if (mod.category === "anatomy_pose") return "anatomy_pose";
  if (mod.category === "apparel_textile") return "apparel_textile";
  if (mod.category === "product") return "product";
  if (mod.category === "cinematography") return "cinematography";
  return null;
}

function makeCompileInput(state: AppState): CompileInput {
  const selected_modules = flattenSelected(state.selected);
  return {
    character_ref: state.refs.character ?? null,
    product_ref: state.refs.product ?? null,
    environment_ref: state.refs.environment ?? null,
    selected_modules,
    variation_ids: state.variations,
  };
}

export function reduce(state: AppState, event: Event, library: PromptLibrary): AppState {
  const next: AppState = {
    ...state,
    refs: { ...state.refs },
    selected: {
      facial_pose: [...state.selected.facial_pose],
      anatomy_pose: [...state.selected.anatomy_pose],
      apparel_textile: [...state.selected.apparel_textile],
      product: [...state.selected.product],
      cinematography: [...state.selected.cinematography],
    },
    variations: [...state.variations],
    compiled: state.compiled ?? null,
    errors: [],
  };

  const applyErrors = () => {
    next.errors = validateState(next, library);
    if (next.errors.length > 0) next.compiled = null;
  };

  switch (event.type) {
    case "SET_REF":
      next.refs[event.slot] = event.value;
      applyErrors();
      return next;

    case "CLEAR_REF":
      next.refs[event.slot] = null;
      applyErrors();
      return next;

    case "ADD_VARIATION":
      if (!next.variations.includes(event.variationId)) next.variations.push(event.variationId);
      applyErrors();
      return next;

    case "REMOVE_VARIATION":
      next.variations = next.variations.filter((v) => v !== event.variationId);
      applyErrors();
      return next;

    case "CLEAR_CATEGORY":
      next.selected[event.category] = [];
      applyErrors();
      return next;

    case "DESELECT_MODULE": {
      const mod = library.byId[event.moduleId];
      if (mod) {
        const key = findCategoryKeyForModule(mod);
        if (key) next.selected[key] = next.selected[key].filter((id) => id !== event.moduleId);
      } else {
        for (const k of Object.keys(next.selected) as Array<keyof AppState["selected"]>) {
          next.selected[k] = next.selected[k].filter((id) => id !== event.moduleId);
        }
      }
      applyErrors();
      return next;
    }

    case "SELECT_MODULE": {
      const mod = library.byId[event.moduleId];
      if (!mod) {
        next.errors = [`Unknown module id: '${event.moduleId}'`];
        next.compiled = null;
        return next;
      }

      const scopeError = violatesScopeOnSelect(mod, next, library);
      if (scopeError) {
        next.errors = [scopeError];
        next.compiled = null;
        return next;
      }

      const key = findCategoryKeyForModule(mod);
      if (!key) {
        next.errors = [`Unsupported module category for selection: '${mod.category}'`];
        next.compiled = null;
        return next;
      }

      // v1 cap: replace existing selection in category
      next.selected[key] = [mod.id];
      applyErrors();
      return next;
    }

    case "COMPILE": {
      const errors = validateState(next, library);
      if (errors.length > 0) {
        next.errors = errors;
        next.compiled = null;
        return next;
      }

      const input = makeCompileInput(next);
      const out = compilePrompt(input, library);
      next.compiled = { ...out, fingerprint: fingerprint(next) };
      next.errors = [];
      return next;
    }

    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}
