import React, { useState } from 'react';
import {
  Check,
  Copy,
  Layers,
  MessageSquareText,
  Music,
  RotateCw,
  Shield,
  SlidersHorizontal,
} from 'lucide-react';
import {
  FLASHCARDS,
  SCENES,
  SOCIAL_CAPTION,
  USER_ASSETS,
  type SceneSpec,
} from '../data/documentary';
import { Button } from './ui/button';
import { Card } from './ui/card';

type DeckTab = 'storyboard' | 'flashcards' | 'caption';

interface CompanionDeckProps {
  currentTime: number;
  activeScene: SceneSpec;
  isMuted: boolean;
  voiceNarration: boolean;
  showCaptions: boolean;
  manualFlips: Record<string, boolean>;
  onSelectScene: (startSec: number) => void;
  onToggleCard: (id: string) => void;
  onResetCards: () => void;
  onToggleMute: () => void;
  onToggleVoiceNarration: () => void;
  onToggleCaptions: () => void;
}

export function CompanionDeck({
  currentTime,
  activeScene,
  isMuted,
  voiceNarration,
  showCaptions,
  manualFlips,
  onSelectScene,
  onToggleCard,
  onResetCards,
  onToggleMute,
  onToggleVoiceNarration,
  onToggleCaptions,
}: CompanionDeckProps) {
  const [activeTab, setActiveTab] = useState<DeckTab>('storyboard');
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
    <div className="flex min-w-0 flex-col gap-6">
      {/* Documentary Header & Active Scene Context */}
      <Card className="p-3.5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2A2A] pb-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-[#FF6B63]">
              SOLANA 1.0 EXPLAINED · 55 SECONDS · 9:16 VERTICAL
            </p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-white sm:text-[28px]">
              {activeScene.number}. {activeScene.title}
            </h2>
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-[#A3A3A3]">
            {activeScene.startSec}s – {activeScene.endSec}s
          </span>
        </div>

        {/* Synchronized Voiceover Script */}
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A3A3A3]">
            <span>Voiceover Script</span>
            <span className="font-semibold text-[#FF6B63]">
              {activeScene.soundCue}
            </span>
          </div>
          <p className="text-base leading-relaxed text-white">
            “{activeScene.voiceover}”
          </p>
        </div>

        {/* Audio & Caption Controls */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#2A2A2A] pt-4">
          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={!isMuted}
            className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] sm:px-4 whitespace-nowrap shrink-0 ${
              !isMuted
                ? 'border-[#E10000] bg-[#E10000]/15 text-white'
                : 'border-[#2A2A2A] bg-[#161616] text-[#A3A3A3] hover:text-white'
            }`}
          >
            <Music className="h-4 w-4 text-[#FF6B63]" />
            {isMuted ? 'Sound Design Off' : 'Sound Design On'}
          </button>

          <button
            type="button"
            onClick={onToggleVoiceNarration}
            aria-pressed={voiceNarration}
            className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] sm:px-4 whitespace-nowrap shrink-0 ${
              voiceNarration
                ? 'border-[#E10000] bg-[#E10000]/15 text-white'
                : 'border-[#2A2A2A] bg-[#161616] text-[#A3A3A3] hover:text-white'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 text-[#FF6B63]" />
            {voiceNarration ? 'Voiceover Speech On' : 'Voiceover Speech Off'}
          </button>

          <button
            type="button"
            onClick={onToggleCaptions}
            aria-pressed={showCaptions}
            className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] sm:px-4 whitespace-nowrap shrink-0 ${
              showCaptions
                ? 'border-[#E10000] bg-[#E10000]/15 text-white'
                : 'border-[#2A2A2A] bg-[#161616] text-[#A3A3A3] hover:text-white'
            }`}
          >
            <MessageSquareText className="h-4 w-4 text-[#FF6B63]" />
            {showCaptions ? 'Captions On' : 'Captions Off'}
          </button>
        </div>
      </Card>

      {/* Interactive Segmented Tabs */}
      <Card className="p-3.5 sm:p-6">
        <div
          role="tablist"
          aria-label="Documentary companion tools"
          className="mb-5 grid grid-cols-3 gap-1.5 rounded-full border-[1.5px] border-[#2A2A2A] bg-[#050505] p-1 sm:gap-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'storyboard'}
            onClick={() => setActiveTab('storyboard')}
            className={`min-h-[44px] min-w-0 cursor-pointer truncate rounded-full px-2 py-2 text-xs font-semibold transition-colors sm:px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] ${
              activeTab === 'storyboard'
                ? 'bg-[#E10000] text-white'
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            Timeline
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'flashcards'}
            onClick={() => setActiveTab('flashcards')}
            className={`min-h-[44px] min-w-0 cursor-pointer truncate rounded-full px-2 py-2 text-xs font-semibold transition-colors sm:px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] ${
              activeTab === 'flashcards'
                ? 'bg-[#E10000] text-white'
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            Flashcards
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'caption'}
            onClick={() => setActiveTab('caption')}
            className={`min-h-[44px] min-w-0 cursor-pointer truncate rounded-full px-2 py-2 text-xs font-semibold transition-colors sm:px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] ${
              activeTab === 'caption'
                ? 'bg-[#E10000] text-white'
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            Share Copy
          </button>
        </div>

        {/* Tab 1: 6-Scene Storyboard */}
        {activeTab === 'storyboard' && (
          <div className="space-y-2">
            {SCENES.map((scene) => {
              const isCurrent = activeScene.id === scene.id;
              const isPassed = currentTime >= scene.endSec;

              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => onSelectScene(scene.startSec)}
                  className={`flex min-h-[44px] w-full cursor-pointer items-start justify-between gap-4 rounded-[20px] border-[1.5px] p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] ${
                    isCurrent
                      ? 'border-[#E10000] bg-[#161616] shadow-[0_0_20px_rgba(225,0,0,0.2)]'
                      : 'border-[#2A2A2A] bg-[#050505] hover:border-[#E10000]/50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className={`font-display font-bold tabular-nums ${
                          isCurrent
                            ? 'text-[#FF6B63]'
                            : isPassed
                            ? 'text-white'
                            : 'text-[#A3A3A3]'
                        }`}
                      >
                        {scene.number}
                      </span>
                      <span className="font-display font-bold text-white">
                        {scene.title}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#A3A3A3]">
                      {scene.voiceover}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-[#A3A3A3]">
                    {scene.startSec}s–{scene.endSec}s
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab 2: Interactive Flashcards + User Asset Lock Study */}
        {activeTab === 'flashcards' && (
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Layers className="h-4 w-4 text-[#FF6B63]" />
                  <span>Core Concepts (Click any card to flip)</span>
                </div>
                <button
                  type="button"
                  onClick={onResetCards}
                  className="min-h-[44px] cursor-pointer px-3 text-xs font-semibold text-[#FF6B63] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63]"
                >
                  Sync with Timeline
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {FLASHCARDS.map((card) => {
                  const flipped = Boolean(manualFlips[card.id]);
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => onToggleCard(card.id)}
                      className="perspective-1200 h-[168px] w-full cursor-pointer rounded-[20px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63]"
                    >
                      <div
                        className={`preserve-3d relative h-full w-full transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          flipped ? 'rotate-y-180' : ''
                        }`}
                      >
                        <div className="backface-hidden absolute inset-0 flex flex-col justify-between rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#161616] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-display font-bold text-[#FF6B63]">
                              {card.code}
                            </span>
                            <RotateCw className="h-3.5 w-3.5 text-[#A3A3A3]" />
                          </div>
                          <p className="font-display text-sm font-bold leading-snug text-white">
                            {card.front}
                          </p>
                          <span className="text-xs text-[#A3A3A3]">
                            Tap to reveal answer
                          </span>
                        </div>

                        <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-[20px] border-[1.5px] border-[#E10000] bg-[#161616] p-4 shadow-[0_0_24px_rgba(225,0,0,0.22)]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-display font-bold text-[#FF6B63]">
                              {card.code}
                            </span>
                            <RotateCw className="h-3.5 w-3.5 text-[#FF6B63]" />
                          </div>
                          <p className="text-xs font-semibold leading-snug text-white">
                            {card.back}
                          </p>
                          <p className="text-xs leading-snug text-[#A3A3A3]">
                            {card.detail}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#2A2A2A] pt-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Shield className="h-4 w-4 text-[#FF6B63]" />
                <span>What Stays Unchanged (No Migration Required)</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {USER_ASSETS.map((asset) => (
                  <div
                    key={asset.id}
                    className="rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#161616] p-4"
                  >
                    <p className="font-display text-xs font-bold tracking-wide text-[#FF6B63]">
                      {asset.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#A3A3A3]">
                      {asset.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Ready-to-Post Social Caption */}
        {activeTab === 'caption' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-[#A3A3A3]">
                Prepared Social Caption &amp; Hashtags
              </p>
              <Button variant="secondary" onClick={handleCopyCaption}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-[#FF6B63]" />
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

            <pre className="whitespace-pre-wrap break-words rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#050505] p-4 font-sans text-sm leading-relaxed text-[#F2F2F2]">
              {SOCIAL_CAPTION}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}
