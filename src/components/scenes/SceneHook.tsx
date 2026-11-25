import React from 'react';
import { motion } from 'motion/react';
import { CrownMark } from '../CrownMark';
import { SolanaMark } from '../SolanaMark';

interface SceneHookProps {
  sceneTime: number;
}

export function SceneHook({ sceneTime }: SceneHookProps) {
  const showSub = sceneTime >= 1.2;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-4 text-center sm:px-6">
      {/* Subtle red ambient halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-44 w-44 rounded-full blur-3xl sm:h-52 sm:w-52"
        style={{ background: 'rgba(225, 0, 0, 0.24)' }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col items-center gap-3 sm:gap-4"
      >
        <div className="flex items-center gap-2 rounded-full border-[1.5px] border-[#2A2A2A] bg-[#0E0E0E] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:gap-3 sm:px-4 sm:py-2">
          <SolanaMark className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-xs font-semibold text-[#A3A3A3]">
            NETWORK MILESTONE
          </span>
          <CrownMark className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>

        <h3 className="font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-[28px]">
          Mainnet Beta is{' '}
          <span className="text-[#FF6B63] line-through decoration-[#E10000] decoration-2">
            retired
          </span>
          .
          <br />
          Welcome to Solana 1.0.
        </h3>

        <motion.p
          initial={false}
          animate={{ opacity: showSub ? 1 : 0.35, y: showSub ? 0 : 4 }}
          transition={{ duration: 0.2 }}
          className="max-w-[260px] text-xs leading-relaxed text-[#A3A3A3] sm:text-sm"
        >
          No token swap. No wallet migration. Just production-grade architecture.
        </motion.p>
      </motion.div>
    </div>
  );
}
