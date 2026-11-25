import React from 'react';
import { CrownMark } from './CrownMark';

export function SolanaMark({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Solana emblem"
    >
      <defs>
        <linearGradient
          id="solRedWhiteGrad"
          x1="8"
          y1="8"
          x2="56"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#F2F2F2" />
          <stop offset="100%" stopColor="#E10000" />
        </linearGradient>
      </defs>
      <path
        d="M14 14.5C14.6 13.9 15.4 13.5 16.3 13.5H51.2C52.6 13.5 53.3 15.2 52.3 16.2L46.5 22C45.9 22.6 45.1 23 44.2 23H9.3C7.9 23 7.2 21.3 8.2 20.3L14 14.5Z"
        fill="url(#solRedWhiteGrad)"
      />
      <path
        d="M14 39.5C14.6 38.9 15.4 38.5 16.3 38.5H51.2C52.6 38.5 53.3 40.2 52.3 41.2L46.5 47C45.9 47.6 45.1 48 44.2 48H9.3C7.9 48 7.2 46.3 8.2 45.3L14 39.5Z"
        fill="url(#solRedWhiteGrad)"
      />
      <path
        d="M46.5 27C45.9 26.4 45.1 26 44.2 26H9.3C7.9 26 7.2 27.7 8.2 28.7L14 34.5C14.6 35.1 15.4 35.5 16.3 35.5H51.2C52.6 35.5 53.3 33.8 52.3 32.8L46.5 27Z"
        fill="#E10000"
      />
    </svg>
  );
}

export function JayRaidLogoMark({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full border-[1.5px] border-[#E10000] bg-[#0E0E0E] p-3 shadow-[0_0_24px_rgba(225,0,0,0.4)] ${className}`}
    >
      <CrownMark className="h-full w-full" />
    </div>
  );
}
