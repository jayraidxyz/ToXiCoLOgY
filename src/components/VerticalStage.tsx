import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Box,
  ChevronLeft,
  ChevronRight,
  Layers,
  MessageSquareText,
  Music,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  SCENES,
  TOTAL_DURATION,
  type SceneSpec,
} from '../data/documentary';
import {
  ThreeSolanaStage,
  type CameraPreset,
} from './ThreeSolanaStage';
import { SceneHook } from './scenes/SceneHook';
import { SceneFlashcards } from './scenes/SceneFlashcards';
import { SceneProtocol } from './scenes/SceneProtocol';
import { SceneUsers } from './scenes/SceneUsers';
import { SceneBiggerPicture } from './scenes/SceneBiggerPicture';
import { SceneOutro } from './scenes/SceneOutro';

interface VerticalStageProps {
  currentTime: number;
  activeScene: SceneSpec;
  isPlaying: boolean;
  isMuted: boolean;
  voiceNarration: boolean;
  showCaptions: boolean;
  manualFlips: Record<string, boolean>;
  manualPulseTick: number;
  cameraPreset: CameraPreset;
  onCameraPresetChange: (preset: CameraPreset) => void;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onToggleVoiceNarration: () => void;
  onToggleCaptions: () => void;
  onSeek: (timeSec: number) => void;
  onPrevScene: () => void;
  onNextScene: () => void;
  onReplay: () => void;
  onToggleCard: (id: string) => void;
  onTriggerSync: () => void;
  onAssetSelect: () => void;
}

export function formatSec(seconds: number): string {
  const clamped = Math.max(0, Math.min(TOTAL_DURATION, Math.floor(seconds)));
  return `00:${String(clamped).padStart(2, '0')}`;
}

export function VerticalStage({
  currentTime,
  activeScene,
  isPlaying,
  isMuted,
  voiceNarration,
  showCaptions,
  manualFlips,
  manualPulseTick,
  cameraPreset,
  onCameraPresetChange,
  onTogglePlay,
  onToggleMute,
  onToggleVoiceNarration,
  onToggleCaptions,
  onSeek,
  onPrevScene,
  onNextScene,
  onReplay,
  onToggleCard,
  onTriggerSync,
  onAssetSelect,
}: VerticalStageProps) {
  const [visualMode, setVisualMode] = useState<'3d' | 'story'>('3d');
  const sceneTime = Math.max(0, currentTime - activeScene.startSec);
  const progressPct = Math.min(100, (currentTime / TOTAL_DURATION) * 100);
  const isComplete = currentTime >= TOTAL_DURATION - 0.05;

  const render2DScene = () => {
    switch (activeScene.id) {
      case 'hook':
        return <SceneHook sceneTime={sceneTime} />;
      case 'flashcards':
        return (
          <SceneFlashcards
            sceneTime={sceneTime}
            manualFlips={manualFlips}
            onToggleCard={onToggleCard}
          />
        );
      case 'protocol':
        return (
          <SceneProtocol
            sceneTime={sceneTime}
            manualPulseTick={manualPulseTick}
            onTriggerSync={onTriggerSync}
          />
        );
      case 'users':
        return (
          <SceneUsers sceneTime={sceneTime} onAssetSelect={onAssetSelect} />
        );
      case 'bigger-picture':
        return <SceneBiggerPicture sceneTime={sceneTime} />;
      case 'outro':
        return (
          <SceneOutro
            sceneTime={sceneTime}
            isComplete={isComplete}
            onReplay={onReplay}
          />
        );
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col items-center">
      {/* Stage Top Progress + Mode Bar */}
      <div className="mb-2.5 flex w-full flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="font-mono font-bold text-[var(--accent-text)]">
            @toxicologyavp
          </span>
          <span aria-hidden="true" className="text-[var(--muted)]">
            ·
          </span>
          <span className="truncate font-semibold text-[var(--text)]">
            {activeScene.number}. {activeScene.title}
          </span>
        </div>

        <div
          role="group"
          aria-label="Visual stage mode"
          className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
        >
          <button
            type="button"
            onClick={() => setVisualMode('3d')}
            className={`inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              visualMode === '3d'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Box className="h-3.5 w-3.5" />
            3D Scene
          </button>
          <button
            type="button"
            onClick={() => setVisualMode('story')}
            className={`inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              visualMode === 'story'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            9:16 Slide
          </button>
        </div>
      </div>

      {/* Primary Visual Viewport: Default 3D Interactive Stage OR 9:16 Story Frame */}
      {visualMode === '3d' ? (
        <div className="w-full space-y-2.5">
          <ThreeSolanaStage
            currentTime={currentTime}
            activeScene={activeScene}
            isPlaying={isPlaying}
            manualFlips={manualFlips}
            manualPulseTick={manualPulseTick}
            cameraPreset={cameraPreset}
            onCameraPresetChange={onCameraPresetChange}
            onToggleCard={onToggleCard}
            onAssetSelect={onAssetSelect}
            className="h-[340px] w-full sm:h-[420px]"
          />

          {/* Clean Solid Synchronized Caption Strip Below Canvas (no blur over WebGL) */}
          {showCaptions && (
            <div className="rounded-xl border border-[var(--border)] bg-[#0A0A0C] px-4 py-3 text-center">
              <p className="text-xs font-medium leading-relaxed text-white sm:text-sm">
                “{activeScene.voiceover}”
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative aspect-[9/16] w-full max-w-[390px] overflow-hidden rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#050505] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_60px_rgba(0,0,0,0.85)]">
          <div className="red-grid pointer-events-none absolute inset-0 opacity-80" />

          {/* Top Progress Segments (6 Scenes) */}
          <div className="absolute inset-x-3 top-0 z-20 flex items-center gap-1.5 sm:inset-x-4 sm:gap-2">
            {SCENES.map((scene) => {
              const segDuration = scene.endSec - scene.startSec;
              const segProgress = Math.max(
                0,
                Math.min(1, (currentTime - scene.startSec) / segDuration)
              );
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => onSeek(scene.startSec)}
                  aria-label={`Jump to Scene ${scene.number}: ${scene.title}`}
                  className="group relative flex min-h-[44px] flex-1 cursor-pointer items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63]"
                >
                  <span className="block h-1.5 w-full overflow-hidden rounded-full bg-[#2A2A2A]">
                    <span
                      className="block h-full rounded-full bg-[#E10000] transition-[width] duration-75"
                      style={{ width: `${segProgress * 100}%` }}
                    />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative z-10 h-full w-full pb-24 pt-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeScene.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="h-full w-full"
              >
                {render2DScene()}
              </motion.div>
            </AnimatePresence>
          </div>

          {showCaptions && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent px-4 pb-4 pt-8 sm:px-5 sm:pb-5 sm:pt-10">
              <p className="text-center text-xs font-medium leading-relaxed text-white sm:text-sm">
                “{activeScene.voiceover}”
              </p>
            </div>
          )}
        </div>
      )}

      {/* UNIFIED SINGLE CONTROL PANEL (Scrubber + Prev/Play/Next/Volume + Sound Design/Voiceover/Captions all in ONE box) */}
      <div className="clay-card mt-3 w-full overflow-hidden rounded-2xl p-3 sm:p-4">
        {/* Scene Segment Progress Bar */}
        <div className="mb-2 flex items-center gap-1.5">
          {SCENES.map((scene) => {
            const segDuration = scene.endSec - scene.startSec;
            const segProgress = Math.max(
              0,
              Math.min(1, (currentTime - scene.startSec) / segDuration)
            );
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => {
                  onCameraPresetChange('auto');
                  onSeek(scene.startSec);
                }}
                aria-label={`Jump to ${scene.number}. ${scene.title}`}
                className="flex h-6 flex-1 cursor-pointer items-center"
              >
                <span className="block h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                  <span
                    className="block h-full rounded-full bg-[var(--accent)] transition-[width] duration-75"
                    style={{ width: `${segProgress * 100}%` }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {/* Scrubber Row */}
        <div className="mb-2.5 flex min-h-[40px] w-full min-w-0 items-center gap-2 sm:gap-3">
          <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--accent-text)]">
            {formatSec(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={TOTAL_DURATION}
            step={0.1}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="Documentary timeline scrubber"
            className="h-3 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--border)] accent-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
          />
          <span className="shrink-0 text-xs tabular-nums text-[var(--muted)]">
            {formatSec(TOTAL_DURATION)}
          </span>
        </div>

        {/* Transport Row: Prev / Play 55s / Next / Mute */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevScene}
              aria-label="Previous scene"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] transition-all duration-200 hover:border-[var(--accent)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={isComplete ? onReplay : onTogglePlay}
              className="flex h-11 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-[var(--accent)] px-4 text-xs font-semibold text-white shadow-[0_0_20px_var(--accent-glow)] transition-all duration-200 hover:bg-[var(--accent-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] sm:px-5 sm:text-sm"
            >
              {isComplete ? (
                <>
                  <RotateCcw className="h-4 w-4 shrink-0" />
                  <span>Replay</span>
                </>
              ) : isPlaying ? (
                <>
                  <Pause className="h-4 w-4 shrink-0" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 shrink-0" />
                  <span>Play 55s</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onNextScene}
              aria-label="Next scene"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] transition-all duration-200 hover:border-[var(--accent)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium tabular-nums text-[var(--muted)]">
              {Math.round(progressPct)}%
            </span>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
              aria-pressed={!isMuted}
              className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] ${
                isMuted
                  ? 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]'
                  : 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-text)]'
              }`}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Consolidated Audio & Caption Controls (Inside the SAME unified control box) */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={!isMuted}
            className={`inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] ${
              !isMuted
                ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text)]'
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Music className="h-3.5 w-3.5 shrink-0 text-[var(--accent-text)]" />
            <span>{isMuted ? 'Sound Off' : 'Sound On'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleVoiceNarration}
            aria-pressed={voiceNarration}
            className={`inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] ${
              voiceNarration
                ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text)]'
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-[var(--accent-text)]" />
            <span>{voiceNarration ? 'Voice On' : 'Voice Off'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleCaptions}
            aria-pressed={showCaptions}
            className={`inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] ${
              showCaptions
                ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text)]'
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-[var(--accent-text)]" />
            <span>{showCaptions ? 'Captions On' : 'Captions Off'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
