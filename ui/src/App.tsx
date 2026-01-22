import { useReducer, useMemo, useState } from 'react';
import { initialState, reduce } from '../../compiler/stateMachine';
import type { PromptLibrary, PromptModule } from '../../compiler/types';
import type { Event, RefSlot } from '../../compiler/stateMachine';

import globalRulesData from '../../data/global_rules.json';
import facialPoseData from '../../data/facial_pose.json';
import anatomyPoseData from '../../data/anatomy_pose.json';
import apparelTextileData from '../../data/apparel_textile.json';
import cinematographyData from '../../data/cinematography.json';
import macroProductData from '../../data/macro_product.json';

function buildLibrary(): PromptLibrary {
  const all = [
    ...globalRulesData,
    ...facialPoseData,
    ...anatomyPoseData,
    ...apparelTextileData,
    ...cinematographyData,
    ...macroProductData,
  ] as PromptModule[];

  const byId: Record<string, PromptModule> = {};
  for (const m of all) {
    if (byId[m.id]) throw new Error(`Duplicate module id: '${m.id}'`);
    byId[m.id] = m;
  }

  const globals = all.filter((m) => m.category === 'global_rules');

  return { byId, globals };
}

function App() {
  const library = useMemo(() => buildLibrary(), []);

  const [state, dispatch] = useReducer(
    (s: ReturnType<typeof initialState>, e: Event) => reduce(s, e, library),
    initialState()
  );

  const modulesByCategory = useMemo(() => {
    const modules = Object.values(library.byId);
    return {
      facial_pose: modules.filter((m) => m.category === 'facial_pose'),
      anatomy_pose: modules.filter((m) => m.category === 'anatomy_pose'),
      apparel_textile: modules.filter((m) => m.category === 'apparel_textile'),
      product: modules.filter((m) => m.category === 'product'),
      cinematography: modules.filter((m) => m.category === 'cinematography'),
    };
  }, [library]);

  const categories = [
    { key: 'facial_pose' as const, label: 'Facial Poses', modules: modulesByCategory.facial_pose },
    { key: 'anatomy_pose' as const, label: 'Anatomy / Body', modules: modulesByCategory.anatomy_pose },
    { key: 'apparel_textile' as const, label: 'Apparel & Textile', modules: modulesByCategory.apparel_textile },
    { key: 'product' as const, label: 'Macro & Product', modules: modulesByCategory.product },
    { key: 'cinematography' as const, label: 'Cinematography', modules: modulesByCategory.cinematography },
  ];

  const hasErrors = state.errors.length > 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-neon-lime">Prompt Compiler</h1>
          <p className="text-zinc-400">Phase B3 UI - Event-Driven Adapter</p>
        </header>

        {/* Reference Inputs */}
        <section className="mb-8 bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h2 className="text-xl font-semibold mb-4">References</h2>
          <div className="grid grid-cols-3 gap-4">
            <ReferenceInput
              slot="character"
              value={state.refs.character}
              onChange={(value) => dispatch({ type: 'SET_REF', slot: 'character', value })}
            />
            <ReferenceInput
              slot="product"
              value={state.refs.product}
              onChange={(value) => dispatch({ type: 'SET_REF', slot: 'product', value })}
            />
            <ReferenceInput
              slot="environment"
              value={state.refs.environment}
              onChange={(value) => dispatch({ type: 'SET_REF', slot: 'environment', value })}
            />
          </div>
        </section>

        {/* Errors */}
        {hasErrors && (
          <section className="mb-8 bg-red-950/50 border border-red-800 p-4 rounded-lg">
            <h3 className="text-red-400 font-semibold mb-2">Errors</h3>
            <ul className="list-disc list-inside text-red-300 space-y-1">
              {state.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Module Grid */}
        <section className="mb-8">
          {categories.map(cat => (
            <CategorySection
              key={cat.key}
              label={cat.label}
              modules={cat.modules}
              selected={state.selected[cat.key]}
              onSelect={(moduleId) => dispatch({ type: 'SELECT_MODULE', moduleId })}
            />
          ))}
        </section>

        {/* Compile & Output */}
        <section className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Compile</h2>
            <button
              onClick={() => dispatch({ type: 'COMPILE' })}
              disabled={hasErrors}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                hasErrors
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-neon-lime text-zinc-950 hover:bg-neon-lime/90'
              }`}
            >
              Compile Prompt
            </button>
          </div>

          {state.compiled && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-zinc-300">Compiled Output</h3>
                <CopyButton text={state.compiled.prompt} />
              </div>
              <pre className="bg-zinc-950 p-4 rounded border border-zinc-700 overflow-x-auto text-sm text-zinc-300 whitespace-pre-wrap">
                {state.compiled.prompt}
              </pre>
              <p className="text-xs text-zinc-500 mt-2">
                Fingerprint: {state.compiled.fingerprint}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ReferenceInput({
  slot,
  value,
  onChange
}: {
  slot: RefSlot;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 capitalize">{slot}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder={`${slot} reference...`}
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 focus:outline-none focus:border-neon-lime transition-colors"
      />
    </div>
  );
}

function CategorySection({
  label,
  modules,
  selected,
  onSelect
}: {
  label: string;
  modules: any[];
  selected: string[];
  onSelect: (moduleId: string) => void;
}) {
  if (modules.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3 text-zinc-300">
        {label} <span className="text-sm text-zinc-500">({modules.length})</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {modules.map((mod) => (
          <ModuleCard
            key={mod.id}
            module={mod}
            isSelected={selected.includes(mod.id)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function ModuleCard({
  module,
  isSelected,
  onSelect
}: {
  module: any;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(module.id)}
      className={`text-left p-4 rounded-lg border-2 transition-all ${
        isSelected
          ? 'bg-neon-lime/10 border-neon-lime'
          : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
      }`}
    >
      <h4 className="font-semibold mb-1 text-sm">{module.label}</h4>
      <p className="text-xs text-zinc-400 line-clamp-2">{module.prompt_text.substring(0, 100)}...</p>
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
        copied
          ? 'bg-green-600 text-white'
          : 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600'
      }`}
    >
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
  );
}

export default App
