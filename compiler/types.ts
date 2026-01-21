export type PromptModule = {
  id: string;
  category: string;
  label: string;
  prompt_text: string;
  constraints: string[];
};

export type PromptLibrary = {
  byId: Record<string, PromptModule>;
  globals: PromptModule[]; // category === "global_rules"
};

export type CompileInput = {
  character_ref?: string | null;
  product_ref?: string | null;
  environment_ref?: string | null;
  selected_modules: string[];
  variation_ids?: string[]; // reserved for Phase B2/B3
};

export type CompileOutput = {
  prompt: string;
  usedModuleIds: string[];
  dedupedConstraints: string[];
};
