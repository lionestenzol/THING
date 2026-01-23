import { useReducer, useMemo, useState, useEffect, useCallback } from 'react';
import { initialState, reduce } from '../../compiler/stateMachine';
import type { PromptLibrary, PromptModule } from '../../compiler/types';
import type { Event } from '../../compiler/stateMachine';
import {
  orchestrationReducer,
  initialOrchestrationState,
  runShoot,
  type OrchestrationEvent,
} from './orchestration';

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

// Mock generate function - replace with real API
async function mockGenerate(_prompt: string): Promise<string[]> {
  await new Promise((r) => setTimeout(r, 1500));
  // Returns placeholder URLs - replace with actual generation API
  return [
    'https://placehold.co/1024x1024/1a1a1a/ccff00?text=Generated',
    'https://placehold.co/1024x1024/1a1a1a/ccff00?text=Variation+2',
    'https://placehold.co/1024x1024/1a1a1a/ccff00?text=Variation+3',
    'https://placehold.co/1024x1024/1a1a1a/ccff00?text=Variation+4',
    'https://placehold.co/1024x1024/1a1a1a/ccff00?text=Variation+5',
    'https://placehold.co/1024x1024/1a1a1a/ccff00?text=Variation+6',
  ];
}

function App() {
  const library = useMemo(() => buildLibrary(), []);

  const [state, dispatch] = useReducer(
    (s: ReturnType<typeof initialState>, e: Event) => reduce(s, e, library),
    initialState()
  );

  const [orchState, orchDispatch] = useReducer(
    orchestrationReducer,
    initialOrchestrationState
  );

  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Auto-set all references to remove friction
  useEffect(() => {
    dispatch({ type: 'SET_REF', slot: 'character', value: 'uploaded' });
    dispatch({ type: 'SET_REF', slot: 'product', value: 'uploaded' });
    dispatch({ type: 'SET_REF', slot: 'environment', value: 'uploaded' });
  }, []);

  // Auto-compile when module is selected (internal only)
  useEffect(() => {
    if (selectedModuleId && state.errors.length === 0) {
      dispatch({ type: 'COMPILE' });
    }
  }, [selectedModuleId, state.errors.length]);

  // Run orchestration when prompt is compiled
  const executeShoot = useCallback(async () => {
    if (!state.compiled) return;

    orchDispatch({ type: 'START' });

    try {
      // Hidden: generates variations internally
      orchDispatch({ type: 'VARIATIONS_DONE' } as OrchestrationEvent);

      // Run full orchestration: generate -> pick best -> refine -> return one
      const finalImage = await runShoot({
        prompt: state.compiled.prompt,
        characterRef: state.refs.character || 'default',
        generateFn: mockGenerate,
      });

      orchDispatch({ type: 'REFINE_DONE', image: finalImage });
    } catch (err) {
      orchDispatch({
        type: 'ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [state.compiled, state.refs.character]);

  // Auto-execute shoot when compiled
  useEffect(() => {
    if (state.compiled && orchState.status === 'idle') {
      executeShoot();
    }
  }, [state.compiled, orchState.status, executeShoot]);

  const allModules = useMemo(() => {
    return Object.values(library.byId).filter((m) => m.category !== 'global_rules');
  }, [library]);

  const handleCardClick = (moduleId: string) => {
    // Reset orchestration for new shoot
    orchDispatch({ type: 'RESET' });
    setSelectedModuleId(moduleId);
    dispatch({ type: 'SELECT_MODULE', moduleId });
  };

  const handleClose = () => {
    orchDispatch({ type: 'RESET' });
    setSelectedModuleId(null);
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

        {/* Final Image Result - Single image only, no grids/variations/prompts */}
        {(orchState.status !== 'idle' || orchState.finalImage) && (
          <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={handleClose}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {orchState.status === 'generating' && 'Creating...'}
                  {orchState.status === 'refining' && 'Refining...'}
                  {orchState.status === 'complete' && 'Your Image'}
                  {orchState.status === 'error' && 'Error'}
                </h2>
                <button
                  onClick={handleClose}
                  className="text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                {(orchState.status === 'generating' || orchState.status === 'refining') && (
                  <div className="aspect-square bg-zinc-950 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-neon-lime border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-zinc-400">
                        {orchState.status === 'generating' ? 'Generating...' : 'Refining details...'}
                      </p>
                    </div>
                  </div>
                )}
                {orchState.status === 'complete' && orchState.finalImage && (
                  <img
                    src={orchState.finalImage}
                    alt="Final result"
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                )}
                {orchState.status === 'error' && (
                  <div className="aspect-square bg-zinc-950 rounded-lg flex items-center justify-center">
                    <p className="text-red-400">{orchState.error}</p>
                  </div>
                )}
              </div>
              {orchState.status === 'complete' && (
                <div className="p-6 border-t border-zinc-800">
                  <DownloadButton imageUrl={orchState.finalImage!} />
                </div>
              )}
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

function DownloadButton({ imageUrl }: { imageUrl: string }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shoot-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    }
    setDownloading(false);
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="w-full px-8 py-4 rounded-lg font-bold text-lg transition-all bg-neon-lime text-zinc-950 hover:bg-neon-lime/90 disabled:opacity-50"
    >
      {downloading ? 'Downloading...' : 'Download Image'}
    </button>
  );
}

export default App
