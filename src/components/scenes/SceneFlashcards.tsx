import React from 'react';
import { RotateCw } from 'lucide-react';
import { FLASHCARDS } from '../../data/documentary';

interface SceneFlashcardsProps {
  sceneTime: number;
  manualFlips: Record<string, boolean>;
  onToggleCard: (id: string) => void;
}

export function SceneFlashcards({
  sceneTime,
  manualFlips,
  onToggleCard,
}: SceneFlashcardsProps) {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2 px-3 sm:gap-2.5 sm:px-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-[#FF6B63]">
          TAP ANY CARD TO FLIP
        </span>
        <span className="text-xs tabular-nums text-[#A3A3A3]">3 CARDS</span>
      </div>

      {FLASHCARDS.map((card) => {
        const autoFlipped = sceneTime >= card.flipOffsetSec;
        const flipped =
          typeof manualFlips[card.id] === 'boolean'
            ? manualFlips[card.id]
            : autoFlipped;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onToggleCard(card.id)}
            aria-pressed={flipped}
            className="perspective-1200 min-h-[86px] max-h-[110px] w-full flex-1 cursor-pointer rounded-[20px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63]"
          >
            <div
              className={`preserve-3d relative h-full w-full transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                flipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Front */}
              <div className="backface-hidden absolute inset-0 flex flex-col justify-between rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#0E0E0E] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-display font-bold text-[#FF6B63]">
                    {card.code}
                  </span>
                  <RotateCw className="h-3.5 w-3.5 text-[#A3A3A3]" />
                </div>
                <p className="font-display text-xs font-bold leading-snug text-white sm:text-sm">
                  {card.front}
                </p>
              </div>

              {/* Back */}
              <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-[20px] border-[1.5px] border-[#E10000] bg-[#161616] p-3 shadow-[0_0_20px_rgba(225,0,0,0.22)] sm:p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-display font-bold text-[#FF6B63]">
                    {card.code} · ANSWER
                  </span>
                  <RotateCw className="h-3.5 w-3.5 text-[#FF6B63]" />
                </div>
                <p className="text-xs font-semibold leading-snug text-white">
                  {card.back}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
