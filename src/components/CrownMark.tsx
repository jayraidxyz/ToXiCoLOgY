import React, { useState } from 'react';
import { X_PROFILE } from '../data/archive';
import { cn } from '../lib/utils';

interface CrownMarkProps {
  className?: string;
  glow?: boolean;
  strokeWidth?: number;
}

export function CrownMark({
  className = 'h-6 w-6',
  glow = true,
  strokeWidth = 3.2,
}: CrownMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={
        glow
          ? { filter: 'drop-shadow(0 0 12px rgba(225, 0, 0, 0.55))' }
          : undefined
      }
      aria-hidden="true"
    >
      <path
        d="M14 44L11 21L24 33L32 16L40 33L53 21L50 44C39.5 47 24.5 47 14 44Z"
        stroke="#FF2A1F"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 50C25 52.5 39 52.5 50 50"
        stroke="#E10000"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CrownDivider({ className = '' }: { className?: string }) {
  return (
    <div
      className={cn('flex items-center gap-4 py-2', className)}
      aria-hidden="true"
    >
      <div className="h-[1.5px] flex-1 bg-[#2A2A2A]" />
      <CrownMark className="h-5 w-5 shrink-0" />
      <div className="h-[1.5px] flex-1 bg-[#2A2A2A]" />
    </div>
  );
}

interface MascotAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MascotAvatar({
  size = 'md',
  className = '',
}: MascotAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const sizeClass =
    size === 'sm'
      ? 'h-11 w-11 p-[3px]'
      : size === 'lg'
      ? 'h-24 w-24 p-1 sm:h-28 sm:w-28 sm:p-[5px]'
      : 'h-16 w-16 p-1';

  return (
    <div
      className={cn(
        'shrink-0 rounded-full border-2 border-[#E10000] bg-[#050505] shadow-[0_0_24px_rgba(225,0,0,0.42)]',
        sizeClass,
        className
      )}
    >
      {imgFailed ? (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-[#E10000]">
          <CrownMark className="h-1/2 w-1/2" glow={false} />
        </div>
      ) : (
        <img
          src={X_PROFILE.avatarPath}
          alt="Toxicology peace-sign mascot wearing a black cap with a neon-red crown"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-full w-full rounded-full object-cover"
        />
      )}
    </div>
  );
}
