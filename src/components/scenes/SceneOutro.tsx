import React from 'react';
import { RotateCcw } from 'lucide-react';
import { X_PROFILE } from '../../data/archive';
import { CrownMark, MascotAvatar } from '../CrownMark';
import { Button } from '../ui/button';

interface SceneOutroProps {
  sceneTime: number;
  isComplete: boolean;
  onReplay: () => void;
}

export function SceneOutro({ isComplete, onReplay }: SceneOutroProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <MascotAvatar size="lg" />

      <div className="flex items-center gap-2">
        <CrownMark className="h-5 w-5" />
        <span className="font-display text-xl font-bold text-white">
          Toxicology Archive
        </span>
      </div>

      <p className="font-mono text-sm font-medium text-[#FF6B63]">
        {X_PROFILE.handle}
      </p>

      <p className="max-w-[240px] text-sm text-[#A3A3A3]">
        Signal, not noise. Verified Web3 breakdowns saved for quick reference.
      </p>

      <Button
        variant={isComplete ? 'primary' : 'secondary'}
        onClick={onReplay}
        className="mt-1"
      >
        <RotateCcw className="h-4 w-4" />
        Replay 55s
      </Button>
    </div>
  );
}
