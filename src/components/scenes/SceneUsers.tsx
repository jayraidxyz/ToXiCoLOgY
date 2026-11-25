import React from 'react';
import { Check, Lock } from 'lucide-react';
import { USER_ASSETS } from '../../data/documentary';

interface SceneUsersProps {
  sceneTime: number;
  onAssetSelect: () => void;
}

export function SceneUsers({ sceneTime, onAssetSelect }: SceneUsersProps) {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2 overflow-y-auto px-3 sm:gap-2.5 sm:px-4">
      <div className="text-center">
        <span className="text-xs font-semibold text-[#FF6B63]">
          ZERO USER MIGRATION
        </span>
        <h3 className="mt-0.5 font-display text-lg font-bold text-white sm:text-xl">
          What Stays Untouched
        </h3>
      </div>

      {USER_ASSETS.map((asset) => {
        const locked = sceneTime >= asset.lockOffsetSec;
        return (
          <button
            key={asset.id}
            type="button"
            onClick={onAssetSelect}
            className={`flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-2.5 rounded-[20px] border-[1.5px] px-3 py-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] sm:min-h-[60px] sm:p-3 ${
              locked
                ? 'border-[#E10000]/75 bg-[#161616] shadow-[0_0_16px_rgba(225,0,0,0.16)]'
                : 'border-[#2A2A2A] bg-[#0E0E0E]'
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-display text-xs font-bold text-white sm:text-sm">
                {asset.label}
              </p>
              <p className="truncate text-xs text-[#A3A3A3]">{asset.summary}</p>
            </div>
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border sm:h-9 sm:w-9 ${
                locked
                  ? 'border-[#E10000] bg-[#E10000] text-white'
                  : 'border-[#2A2A2A] bg-[#050505] text-[#A3A3A3]'
              }`}
            >
              {locked ? (
                <Check className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
