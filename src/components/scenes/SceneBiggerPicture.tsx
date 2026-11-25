import React from 'react';
import { CrownMark } from '../CrownMark';

interface SceneBiggerPictureProps {
  sceneTime: number;
}

const MILESTONES = [
  {
    year: '2020',
    title: 'Mainnet Beta Launch',
    note: 'Single Rust client, proving sub-second block times.',
    offset: 0.4,
  },
  {
    year: '2023–25',
    title: 'Fee Markets & Resilience',
    note: 'QUIC networking, priority fees, and Firedancer testnet.',
    offset: 2.2,
  },
  {
    year: '2026',
    title: 'Solana 1.0 Production',
    note: 'Multi-client consensus ready for institutional settlement.',
    offset: 4.2,
  },
];

export function SceneBiggerPicture({ sceneTime }: SceneBiggerPictureProps) {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2.5 overflow-y-auto px-3 sm:gap-3 sm:px-4">
      <div className="flex items-center justify-center gap-2">
        <CrownMark className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="text-xs font-semibold text-[#FF6B63]">
          THE BIGGER PICTURE
        </span>
      </div>

      <div className="space-y-2 sm:space-y-2.5">
        {MILESTONES.map((item, idx) => {
          const active = sceneTime >= item.offset;
          const isFinal = idx === MILESTONES.length - 1;

          return (
            <div
              key={item.year}
              className={`rounded-[20px] border-[1.5px] p-3 transition-all duration-200 sm:p-3.5 ${
                active
                  ? isFinal
                    ? 'border-[#E10000] bg-[#161616] shadow-[0_0_20px_rgba(225,0,0,0.22)]'
                    : 'border-white/30 bg-[#161616]'
                  : 'border-[#2A2A2A] bg-[#0E0E0E] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-display font-bold tabular-nums text-[#FF6B63]">
                  {item.year}
                </span>
                {isFinal && (
                  <span className="font-semibold text-white">CURRENT</span>
                )}
              </div>
              <p className="mt-0.5 font-display text-sm font-bold text-white">
                {item.title}
              </p>
              <p className="mt-0.5 text-xs text-[#A3A3A3]">{item.note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
