import React, { useState } from 'react';
import {
  Box,
  Check,
  Copy,
  Layers,
  RotateCw,
  Shield,
} from 'lucide-react';
import {
  FLASHCARDS,
  SCENES,
  SOCIAL_CAPTION,
  USER_ASSETS,
  type SceneId,
  type SceneSpec,
} from '../data/documentary';
import type { CameraPreset } from './ThreeSolanaStage';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface CompanionDeckProps {
  currentTime: number;
  activeScene: SceneSpec;
  manualFlips: Record<string, boolean>;
  onSelectScene: (startSec: number) => void;
  onCameraPresetChange: (preset: CameraPreset) => void;
  onToggleCard: (id: string) => void;
  onResetCards: () => void;
}

const SCENE_3D_LABELS: Record<SceneId, { tag: string; preset: CameraPreset }> = {
  hook: { tag: '3D Crown Beacon', preset: 'crown' },
  flashcards: { tag: '3D Flashcard Arc', preset: 'flashcards' },
  protocol: { tag: '3D Agave + Firedancer', preset: 'validators' },
  users: { tag: '3D Asset Vaults', preset: 'vaults' },
  'bigger-picture': { tag: '3D Full Network', preset: 'auto' },
  outro: { tag: '3D Beacon Finale', preset: 'crown' },
};

export function CompanionDeck({
  currentTime,
  activeScene,
  manualFlips,
  onSelectScene,
  onCameraPresetChange,
  onToggleCard,
  onResetCards,
}: CompanionDeckProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(SOCIAL_CAPTION);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Active Scene Header & Voiceover Script (Controls moved to unified Play/Next/Volume panel) */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)]">
              SOLANA 1.0 EXPLAINED · 55 SECONDS · 3D + AUDIO
            </p>
            <h3 className="heading-section mt-1 font-display font-bold tracking-tight text-[var(--text)]">
              {activeScene.number}. {activeScene.title}
            </h3>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold tabular-nums text-[var(--accent-text)]">
            {activeScene.startSec}s – {activeScene.endSec}s
          </span>
        </div>

        <div className="mt-3.5 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
            <span className="tracking-widest uppercase">Voiceover Script</span>
            <span className="font-semibold text-[var(--accent-text)]">
              {activeScene.soundCue}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-[var(--text)] sm:text-base">
            “{activeScene.voiceover}”
          </p>
        </div>
      </Card>

      {/* ALL ACCESSIBLE AT ONCE: 3D Scene Timeline + 3D Flashcards + Asset Vaults + Share Copy */}
      <Card className="space-y-6 p-4 sm:p-5">
        {/* 1. 6-Scene 3D Interactive Timeline */}
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-[var(--accent-text)]" />
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text)]">
                3D Scene Timeline (Tap any chapter to jump 3D camera)
              </h4>
            </div>
            <span className="text-xs text-[var(--muted)]">6 synced chapters</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {SCENES.map((scene) => {
              const isCurrent = activeScene.id === scene.id;
              const isPassed = currentTime >= scene.endSec;
              const scene3D = SCENE_3D_LABELS[scene.id];

              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => {
                    onCameraPresetChange(scene3D.preset);
                    onSelectScene(scene.startSec);
                  }}
                  className={`flex min-h-[44px] w-full min-w-0 cursor-pointer flex-col justify-between gap-2 rounded-xl border p-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] ${
                    isCurrent
                      ? 'border-[var(--accent)] bg-[var(--surface-2)] shadow-[0_0_16px_var(--accent-glow)]'
                      : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)]/50'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2 text-sm">
                      <span
                        className={`font-display font-bold tabular-nums ${
                          isCurrent
                            ? 'text-[var(--accent-text)]'
                            : isPassed
                            ? 'text-[var(--text)]'
                            : 'text-[var(--muted)]'
                        }`}
                      >
                        {scene.number}
                      </span>
                      <span className="truncate font-display font-bold text-[var(--text)]">
                        {scene.title}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--muted)]">
                      {scene.startSec}s–{scene.endSec}s
                    </span>
                  </div>

                  <p className="line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">
                    {scene.voiceover}
                  </p>

                  <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2 text-[11px]">
                    <span className="font-mono font-semibold text-[var(--accent-text)]">
                      {scene3D.tag}
                    </span>
                    <span className="text-[var(--muted)]">
                      {isCurrent ? 'Active in 3D' : 'Focus 3D'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Always-Accessible 3D Interactive Flashcards */}
        <div className="border-t border-[var(--border)] pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
              <Layers className="h-4 w-4 text-[var(--accent-text)]" />
              <span>3D Flashcards (Tap here or in 3D stage to flip)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onCameraPresetChange('flashcards')}
                className="min-h-[40px] cursor-pointer rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)]"
              >
                Focus in 3D
              </button>
              <button
                type="button"
                onClick={onResetCards}
                className="min-h-[40px] cursor-pointer px-2.5 text-xs font-semibold text-[var(--accent-text)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
              >
                Sync Timeline
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {FLASHCARDS.map((card) => {
              const sceneTime = Math.max(0, currentTime - 5);
              const autoFlipped =
                activeScene.id === 'flashcards'
                  ? sceneTime >= card.flipOffsetSec
                  : currentTime >= 20;
              const flipped =
                typeof manualFlips[card.id] === 'boolean'
                  ? manualFlips[card.id]
                  : autoFlipped;

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onToggleCard(card.id)}
                  className="perspective-1200 h-[168px] w-full min-w-0 cursor-pointer rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
                >
                  <div
                    className={`preserve-3d relative h-full w-full transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      flipped ? 'rotate-y-180' : ''
                    }`}
                  >
                    <div className="backface-hidden absolute inset-0 flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-display font-bold text-[var(--accent-text)]">
                          Card {card.code}
                        </span>
                        <RotateCw className="h-3.5 w-3.5 text-[var(--muted)]" />
                      </div>
                      <p className="font-display text-sm font-bold leading-snug text-[var(--text)]">
                        {card.front}
                      </p>
                      <span className="text-xs text-[var(--muted)]">
                        Tap to reveal answer
                      </span>
                    </div>

                    <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-xl border border-[var(--accent)] bg-[var(--surface-2)] p-4 shadow-[0_0_20px_var(--accent-glow)]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-display font-bold text-[var(--accent-text)]">
                          Card {card.code}
                        </span>
                        <RotateCw className="h-3.5 w-3.5 text-[var(--accent-text)]" />
                      </div>
                      <p className="text-xs font-semibold leading-snug text-[var(--text)]">
                        {card.back}
                      </p>
                      <p className="text-xs leading-snug text-[var(--muted)]">
                        {card.detail}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. What Stays Unchanged (4 User Asset Locks) */}
        <div className="border-t border-[var(--border)] pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
              <Shield className="h-4 w-4 text-[var(--accent-text)]" />
              <span>What Stays Unchanged (No Migration Required)</span>
            </div>
            <button
              type="button"
              onClick={() => onCameraPresetChange('vaults')}
              className="min-h-[36px] cursor-pointer rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)]"
            >
              Inspect Vaults in 3D
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {USER_ASSETS.map((asset) => (
              <div
                key={asset.id}
                className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5"
              >
                <p className="font-display text-xs font-bold tracking-wide text-[var(--accent-text)]">
                  {asset.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                  {asset.summary}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Ready-to-Post Social Caption */}
        <div className="border-t border-[var(--border)] pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--text)]">
              Prepared Social Caption &amp; Hashtags
            </p>
            <Button variant="secondary" size="compact" onClick={handleCopyCaption}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-[var(--accent-text)]" />
                  Copied Caption
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Caption
                </>
              )}
            </Button>
          </div>

          <pre className="max-w-full whitespace-pre-wrap break-words rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3.5 font-sans text-xs leading-relaxed text-[var(--text)] sm:text-sm">
            {SOCIAL_CAPTION}
          </pre>
        </div>
      </Card>
    </div>
  );
}
