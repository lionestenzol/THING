import { useReducer, useMemo, useState, useEffect } from 'react';
import { initialState, reduce } from '../../compiler/stateMachine';
import type { PromptLibrary, PromptModule } from '../../compiler/types';
import type { Event } from '../../compiler/stateMachine';

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

const CATEGORY_LABELS: Record<string, string> = {
  facial_pose: 'FACIAL',
  anatomy_pose: 'ANATOMY',
  apparel_textile: 'APPAREL',
  cinematography: 'CINEMATOGRAPHY',
  product: 'PRODUCT',
};

const CARD_DESCRIPTIONS: Record<string, string> = {
  facial_pose_primary_moods: '6-frame facial expression lock',
  facial_pose_bizarre_expressions: 'Extreme facial expressions, no drift',
  facial_pose_ocular_macro: 'Eye-focused detail shots',
  anatomy_pose_fashion_stances: 'Full-body pose consistency',
  anatomy_pose_floating_poses: 'Suspended body positions',
  anatomy_pose_floor_poses: 'Ground-level body control',
  anatomy_pose_kung_fu_moves: 'Action pose lock',
  anatomy_pose_hand_gestures: 'Hand position precision',
  apparel_textile_luxury_editorial: 'Garment structure, no distortion',
  apparel_textile_street_utility: 'Streetwear consistency',
  product_macro: 'Product interaction, no drift',
  cinematography_essential_angles: 'Core camera angles',
  cinematography_kinetic_flash: 'Motion flash freeze',
  cinematography_street_flash: 'Street flash, frozen motion',
  cinematography_editorial_set_projection: 'Editorial lighting control',
};

function App() {
  const library = useMemo(() => buildLibrary(), []);

  const [state, dispatch] = useReducer(
    (s: ReturnType<typeof initialState>, e: Event) => reduce(s, e, library),
    initialState()
  );

  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Auto-set all references to remove friction
  useEffect(() => {
    dispatch({ type: 'SET_REF', slot: 'character', value: 'uploaded' });
    dispatch({ type: 'SET_REF', slot: 'product', value: 'uploaded' });
    dispatch({ type: 'SET_REF', slot: 'environment', value: 'uploaded' });
  }, []);

  // Auto-compile when module is selected
  useEffect(() => {
    if (selectedModuleId && state.errors.length === 0) {
      dispatch({ type: 'COMPILE' });
    }
  }, [selectedModuleId, state.errors.length]);

  const allModules = useMemo(() => {
    return Object.values(library.byId).filter((m) => m.category !== 'global_rules');
  }, [library]);

  const handleCardClick = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    dispatch({ type: 'SELECT_MODULE', moduleId });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Headline */}
        <header className="mb-12 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-zinc-100 leading-tight">
            Same character. Every shoot. Guaranteed.
          </h1>
        </header>

        {/* Grid Section Header */}
        <div className="mb-6">
          <p className="text-sm text-zinc-500 uppercase tracking-wide">Ready-to-use visual systems</p>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {allModules.map((module) => (
            <PromptCard
              key={module.id}
              module={module}
              isSelected={selectedModuleId === module.id}
              onClick={() => handleCardClick(module.id)}
            />
          ))}
        </div>

        {/* Compiled Prompt Panel */}
        {state.compiled && (
          <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setSelectedModuleId(null)}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Compiled Prompt</h2>
                <button
                  onClick={() => setSelectedModuleId(null)}
                  className="text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <pre className="bg-zinc-950 p-4 rounded border border-zinc-700 text-sm text-zinc-300 whitespace-pre-wrap">
                  {state.compiled.prompt}
                </pre>
              </div>
              <div className="p-6 border-t border-zinc-800">
                <CopyButton text={state.compiled.prompt} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PromptCard({
  module,
  isSelected,
  onClick
}: {
  module: PromptModule;
  isSelected: boolean;
  onClick: () => void;
}) {
  const categoryTag = CATEGORY_LABELS[module.category] || module.category.toUpperCase();
  const description = CARD_DESCRIPTIONS[module.id] || 'Professional visual consistency';

  return (
    <button
      onClick={onClick}
      className={`text-left p-6 rounded-lg border transition-all ${
        isSelected
          ? 'bg-neon-lime/10 border-neon-lime'
          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">{categoryTag}</div>
      <h3 className="text-lg font-bold mb-2">{module.label}</h3>
      <p className="text-sm text-zinc-400">{description}</p>
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
      className={`w-full px-8 py-4 rounded-lg font-bold text-lg transition-all ${
        copied
          ? 'bg-green-600 text-white'
          : 'bg-neon-lime text-zinc-950 hover:bg-neon-lime/90'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy Full Prompt'}
    </button>
  );
}

export default App
