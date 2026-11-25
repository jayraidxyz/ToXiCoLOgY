import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  SCENES,
  TOTAL_DURATION,
  type SceneSpec,
} from '../data/documentary';
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
  showCaptions: boolean;
  manualFlips: Record<string, boolean>;
  manualPulseTick: number;
  onTogglePlay: () => void;
  onToggleMute: () => void;
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
  showCaptions,
  manualFlips,
  manualPulseTick,
  onTogglePlay,
  onToggleMute,
  onSeek,
  onPrevScene,
  onNextScene,
  onReplay,
  onToggleCard,
  onTriggerSync,
  onAssetSelect,
}: VerticalStageProps) {
  const sceneTime = Math.max(0, currentTime - activeScene.startSec);
  const progressPct = Math.min(100, (currentTime / TOTAL_DURATION) * 100);
  const isComplete = currentTime >= TOTAL_DURATION - 0.05;

  const renderScene = () => {
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
        return <SceneUsers sceneTime={sceneTime} onAssetSelect={onAssetSelect} />;
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
    <div className="flex flex-col items-center">
      {/* 9:16 Vertical Documentary Frame */}
      <div className="relative aspect-[9/16] w-full max-w-[390px] overflow-hidden rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#050505] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_60px_rgba(0,0,0,0.85)]">
        {/* Faint Red Grid */}
        <div className="red-grid pointer-events-none absolute inset-0 opacity-80" />

        {/* Top Progress Segments (6 Scenes) */}
        <div className="absolute inset-x-4 top-3 z-20 flex items-center gap-2">
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
                className="group relative h-2 flex-1 cursor-pointer overflow-hidden rounded-full bg-[#2A2A2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63]"
              >
                <div
                  className="h-full rounded-full bg-[#E10000] transition-[width] duration-75"
                  style={{ width: `${segProgress * 100}%` }}
                />
              </button>
            );
          })}
        </div>

        {/* Unboxed Frame Metadata Header */}
        <div className="absolute inset-x-4 top-8 z-20 flex items-center justify-between gap-2 text-xs text-[#A3A3A3]">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="font-mono font-semibold text-[#FF6B63]">
              @toxicologyavp
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate text-white">
              {activeScene.number}. {activeScene.title}
            </span>
          </div>
          <span className="shrink-0 font-semibold tabular-nums text-[#A3A3A3]">
            {formatSec(currentTime)} / {formatSec(TOTAL_DURATION)}
          </span>
        </div>

        {/* Active Animated Scene */}
        <div className="relative z-10 h-full w-full pt-14 pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScene.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="h-full w-full"
            >
              {renderScene()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Synchronized Voiceover Subtitle Scrim */}
        {showCaptions && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent px-5 pb-5 pt-10">
            <p className="text-center text-sm font-medium leading-relaxed text-white">
              “{activeScene.voiceover}”
            </p>
          </div>
        )}
      </div>

      {/* Player Transport & Scrub Bar */}
      <div className="clay-card mt-4 w-full max-w-[390px] p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="text-xs font-semibold tabular-nums text-[#FF6B63]">
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
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[#2A2A2A] accent-[#E10000]"
          />
          <span className="text-xs tabular-nums text-[#A3A3A3]">
            {formatSec(TOTAL_DURATION)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevScene}
              aria-label="Previous scene"
              className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-[#2A2A2A] bg-[#161616] text-white transition-all duration-200 hover:border-[#E10000]/70 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={isComplete ? onReplay : onTogglePlay}
              className="flex h-12 cursor-pointer items-center gap-2 rounded-full bg-[#E10000] px-5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(225,0,0,0.3)] transition-all duration-200 hover:bg-[#FF2A1F] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] whitespace-nowrap shrink-0"
            >
              {isComplete ? (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Replay
                </>
              ) : isPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Play 55s
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onNextScene}
              aria-label="Next scene"
              className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-[#2A2A2A] bg-[#161616] text-white transition-all duration-200 hover:border-[#E10000]/70 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs tabular-nums text-[#A3A3A3] sm:inline">
              {Math.round(progressPct)}%
            </span>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
              aria-pressed={!isMuted}
              className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-[1.5px] transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] ${
                isMuted
                  ? 'border-[#2A2A2A] bg-[#161616] text-[#A3A3A3] hover:text-white'
                  : 'border-[#E10000] bg-[#E10000]/15 text-[#FF6B63]'
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
      </div>
    </div>
  );
}
