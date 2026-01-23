import { useReducer, useMemo, useState, useRef } from 'react';
import { initialState, reduce } from '../../compiler/stateMachine';
import type { PromptLibrary, PromptModule } from '../../compiler/types';
import type { Event } from '../../compiler/stateMachine';
import { runShoot, EDITOR_MODE } from './orchestrator';
import type { ShootResult } from './orchestrator';

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

// Human-friendly shoot type names
const SHOOT_TYPE_NAMES: Record<string, string> = {
  facial_pose_primary_moods: '6 Professional Headshots',
  facial_pose_bizarre_expressions: 'Expressive Character Shots',
  facial_pose_ocular_macro: 'Eye Detail Close-ups',
  facial_pose_full_head_dynamics: 'Dynamic Head Angles',
  anatomy_pose_fashion_stances: 'Full-Body Fashion Shoot',
  anatomy_pose_floating_poses: 'Floating Suspended Poses',
  anatomy_pose_floor_poses: 'Floor & Reclined Poses',
  anatomy_pose_kung_fu_moves: 'Action Pose Shoot',
  anatomy_pose_hand_gestures: 'Hand Detail Shots',
  apparel_textile_luxury_editorial: 'Luxury Fashion Editorial',
  apparel_textile_street_utility: 'Streetwear Lookbook',
  product_macro: 'Product Hero Shots',
  cinematography_essential_angles: 'Classic Studio Angles',
  cinematography_kinetic_flash: 'Motion Flash Shoot',
  cinematography_street_flash: 'Street Style Flash',
  cinematography_editorial_set_projection: 'Editorial Lighting Setup',
};

const SHOOT_TYPE_DESCRIPTIONS: Record<string, string> = {
  facial_pose_primary_moods: 'Professional headshot grid with 6 expressions',
  facial_pose_bizarre_expressions: 'Bold, editorial facial expressions',
  facial_pose_ocular_macro: 'Extreme close-up eye photography',
  facial_pose_full_head_dynamics: 'Head tilts and dynamic angles',
  anatomy_pose_fashion_stances: 'Classic fashion model poses',
  anatomy_pose_floating_poses: 'Weightless, suspended body shots',
  anatomy_pose_floor_poses: 'Elegant floor and reclined poses',
  anatomy_pose_kung_fu_moves: 'Dynamic martial arts action poses',
  anatomy_pose_hand_gestures: 'Detailed hand and gesture shots',
  apparel_textile_luxury_editorial: 'High-end fashion garment focus',
  apparel_textile_street_utility: 'Urban streetwear aesthetic',
  product_macro: 'Product interaction close-ups',
  cinematography_essential_angles: 'Foundational camera angles',
  cinematography_kinetic_flash: 'Frozen motion with flash',
  cinematography_street_flash: 'Gritty street flash aesthetic',
  cinematography_editorial_set_projection: 'Controlled studio lighting',
};

type Screen = 'landing' | 'upload' | 'choose' | 'results';

function App() {
  const library = useMemo(() => buildLibrary(), []);

  const [state, dispatch] = useReducer(
    (s: ReturnType<typeof initialState>, e: Event) => reduce(s, e, library),
    initialState()
  );

  const [screen, setScreen] = useState<Screen>('landing');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedShootType, setSelectedShootType] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shootResult, setShootResult] = useState<ShootResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allModules = useMemo(() => {
    return Object.values(library.byId).filter((m) => m.category !== 'global_rules');
  }, [library]);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  const handleGenerate = () => {
    if (!selectedShootType) return;

    setIsGenerating(true);

    // Set refs and compile (Phase B - unchanged)
    dispatch({ type: 'SET_REF', slot: 'character', value: 'uploaded' });
    dispatch({ type: 'SET_REF', slot: 'product', value: 'uploaded' });
    dispatch({ type: 'SET_REF', slot: 'environment', value: 'uploaded' });
    dispatch({ type: 'SELECT_MODULE', moduleId: selectedShootType });
    dispatch({ type: 'COMPILE' });

    // Orchestration: simulate generation + refinement pipeline
    setTimeout(() => {
      // Get compiled output from state machine
      const compiled = state.compiled;
      if (compiled) {
        // Run orchestrator: generates variations (hidden) → selects best → refines → returns one
        const result = runShoot(compiled, {
          characterRef: 'uploaded',
          shootType: selectedShootType,
        });
        setShootResult(result);
      }
      setIsGenerating(false);
      setScreen('results');
    }, 2000); // Slightly longer to simulate refinement pass
  };

  const handleTryAnother = () => {
    setSelectedShootType(null);
    setScreen('choose');
  };

  const handleStartOver = () => {
    setUploadedImage(null);
    setSelectedShootType(null);
    setShootResult(null);
    setScreen('landing');
  };

  const copyPrompt = () => {
    // In editor mode, copy the final refined prompt
    if (shootResult?.finalPrompt) {
      navigator.clipboard.writeText(shootResult.finalPrompt);
    }
  };

  // Screen 1: Landing
  if (screen === 'landing') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <header className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bold text-zinc-100 leading-tight mb-6">
              Same character.<br />Every shoot.<br />Guaranteed.
            </h1>
            <p className="text-xl md:text-2xl text-zinc-400">
              Generate a full professional photoshoot in 10 seconds.
            </p>
          </header>

          <button
            onClick={() => setScreen('upload')}
            className="bg-neon-lime text-zinc-950 text-xl md:text-2xl font-bold px-12 py-6 rounded-xl hover:bg-neon-lime/90 transition-all transform hover:scale-105"
          >
            Upload Character
          </button>

          {/* Below the fold - secondary presets */}
          <div className="mt-24 text-center">
            <p className="text-sm text-zinc-600 uppercase tracking-wide mb-6">Popular shoot types</p>
            <div className="flex flex-wrap justify-center gap-3">
              {['Headshots', 'Fashion Poses', 'Product Shots'].map((preset) => (
                <span key={preset} className="text-sm text-zinc-500 px-4 py-2 border border-zinc-800 rounded-full">
                  {preset}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 2: Upload
  if (screen === 'upload') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-2xl mx-auto w-full">
          <button
            onClick={() => setScreen('landing')}
            className="self-start mb-8 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            &larr; Back
          </button>

          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
            Upload your character
          </h2>

          {!uploadedImage ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-square max-w-md border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-zinc-500 transition-colors"
            >
              <div className="text-6xl mb-4 text-zinc-600">+</div>
              <p className="text-zinc-400 text-lg">Drop image here</p>
              <p className="text-zinc-600 text-sm mt-2">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
          ) : (
            <div className="w-full max-w-md">
              <div className="relative aspect-square rounded-2xl overflow-hidden mb-6">
                <img
                  src={uploadedImage}
                  alt="Uploaded character"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setUploadedImage(null)}
                  className="absolute top-4 right-4 bg-zinc-900/80 text-zinc-300 w-10 h-10 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors"
                >
                  &times;
                </button>
              </div>
              <button
                onClick={() => setScreen('choose')}
                className="w-full bg-neon-lime text-zinc-950 text-xl font-bold px-8 py-5 rounded-xl hover:bg-neon-lime/90 transition-all"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Screen 3: Choose Shoot Type
  if (screen === 'choose') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <div className="flex-1 px-6 py-12 max-w-4xl mx-auto w-full">
          <button
            onClick={() => setScreen('upload')}
            className="mb-8 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            &larr; Back
          </button>

          <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">
            Choose your shoot type
          </h2>
          <p className="text-zinc-500 text-center mb-10">
            Tap one to select
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {allModules.map((module) => (
              <button
                key={module.id}
                onClick={() => setSelectedShootType(module.id)}
                className={`text-left p-6 rounded-xl border-2 transition-all ${
                  selectedShootType === module.id
                    ? 'bg-neon-lime/10 border-neon-lime'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <h3 className="text-lg font-bold mb-1">
                  {SHOOT_TYPE_NAMES[module.id] || module.label}
                </h3>
                <p className="text-sm text-zinc-400">
                  {SHOOT_TYPE_DESCRIPTIONS[module.id] || 'Professional visual consistency'}
                </p>
              </button>
            ))}
          </div>

          {selectedShootType && (
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-zinc-950/95 border-t border-zinc-800">
              <div className="max-w-4xl mx-auto">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full bg-neon-lime text-zinc-950 text-xl font-bold px-8 py-5 rounded-xl hover:bg-neon-lime/90 transition-all disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Generate Shoot'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Screen 4: Results (Editor Mode - Single Final Image)
  if (screen === 'results') {
    const shootTypeName = selectedShootType
      ? (SHOOT_TYPE_NAMES[selectedShootType] || 'Your Shoot')
      : 'Your Shoot';

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <div className="flex-1 px-6 py-12 max-w-2xl mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-neon-lime text-sm font-medium uppercase tracking-wide mb-2">
              Final Result
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">
              {shootTypeName}
            </h2>
          </div>

          {/* Single Final Image (Editor Mode) */}
          {EDITOR_MODE ? (
            <div className="mb-8">
              {/* Single polished result */}
              <div className="relative aspect-[4/5] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-4">
                {uploadedImage ? (
                  <img
                    src={uploadedImage}
                    alt="Final result"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-zinc-600">Final Image</span>
                  </div>
                )}
                {/* Refinement badge */}
                <div className="absolute top-4 right-4 bg-zinc-900/90 backdrop-blur-sm text-zinc-300 text-xs px-3 py-1 rounded-full border border-zinc-700">
                  Refined
                </div>
              </div>

              {/* Minimal metadata */}
              {shootResult && (
                <p className="text-center text-zinc-600 text-xs font-mono">
                  ID: {shootResult.fingerprint}
                </p>
              )}
            </div>
          ) : (
            /* Debug mode: show sheet (hidden in production) */
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-zinc-800 rounded-lg flex items-center justify-center"
                  >
                    {uploadedImage ? (
                      <img
                        src={uploadedImage}
                        alt={`Frame ${i + 1}`}
                        className="w-full h-full object-cover rounded-lg opacity-60"
                      />
                    ) : (
                      <span className="text-zinc-600 text-xs">Frame {i + 1}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="bg-zinc-950 rounded-lg p-4 max-h-48 overflow-y-auto">
                <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono">
                  {shootResult?._basePrompt || 'Prompt not available'}
                </pre>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={copyPrompt}
              className="w-full bg-neon-lime text-zinc-950 text-xl font-bold px-8 py-5 rounded-xl hover:bg-neon-lime/90 transition-all"
            >
              Copy Prompt
            </button>
            <button
              onClick={handleTryAnother}
              className="w-full bg-zinc-800 text-zinc-100 font-semibold px-6 py-4 rounded-xl hover:bg-zinc-700 transition-all"
            >
              Try Another Style
            </button>
            <button
              onClick={handleStartOver}
              className="w-full text-zinc-500 hover:text-zinc-300 py-3 transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
