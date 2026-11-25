import React from 'react';
import { motion } from 'motion/react';
import { Activity, Layers } from 'lucide-react';
import { SolanaMark } from '../SolanaMark';

interface SceneProtocolProps {
  sceneTime: number;
  manualPulseTick: number;
  onTriggerSync: () => void;
}

export function SceneProtocol({
  sceneTime,
  manualPulseTick,
  onTriggerSync,
}: SceneProtocolProps) {
  const pulseStep = Math.floor(sceneTime / 2.2) + manualPulseTick;
  const agaveActive = pulseStep % 2 === 0;

  return (
    <div className="flex h-full w-full flex-col justify-between gap-2 overflow-y-auto px-3 py-1 sm:px-4 sm:py-2">
      <div className="text-center">
        <span className="text-xs font-semibold text-[#FF6B63]">
          MULTI-CLIENT ARCHITECTURE
        </span>
        <h3 className="mt-0.5 font-display text-lg font-bold text-white sm:text-xl">
          Two Clients, One State
        </h3>
      </div>

      {/* Validator Client Nodes */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <motion.div
          animate={{
            borderColor: agaveActive ? '#E10000' : '#2A2A2A',
            scale: agaveActive ? 1.02 : 1,
          }}
          transition={{ duration: 0.2 }}
          className="rounded-[20px] border-[1.5px] bg-[#0E0E0E] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-3.5"
        >
          <span className="font-display text-xs font-bold text-[#FF6B63]">
            CLIENT 01
          </span>
          <p className="mt-1 font-display text-sm font-bold text-white sm:text-base">
            Agave
          </p>
          <p className="mt-0.5 text-xs text-[#A3A3A3]">
            Anza Rust validator runtime
          </p>
        </motion.div>

        <motion.div
          animate={{
            borderColor: !agaveActive ? '#E10000' : '#2A2A2A',
            scale: !agaveActive ? 1.02 : 1,
          }}
          transition={{ duration: 0.2 }}
          className="rounded-[20px] border-[1.5px] bg-[#0E0E0E] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-3.5"
        >
          <span className="font-display text-xs font-bold text-[#FF6B63]">
            CLIENT 02
          </span>
          <p className="mt-1 font-display text-sm font-bold text-white sm:text-base">
            Firedancer
          </p>
          <p className="mt-0.5 text-xs text-[#A3A3A3]">
            Independent C validator client
          </p>
        </motion.div>
      </div>

      {/* Central Consensus Bridge */}
      <div className="flex flex-col items-center gap-2 rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#161616] p-3 text-center sm:p-4">
        <div className="flex items-center gap-2">
          <SolanaMark className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
          <Layers className="h-4 w-4 shrink-0 text-[#FF6B63]" />
          <span className="font-display text-xs font-bold text-white sm:text-sm">
            QUIC + Local Fee Markets
          </span>
        </div>
        <p className="text-xs leading-relaxed text-[#A3A3A3]">
          Hotspot spam is priced locally instead of stalling unrelated apps.
        </p>

        <button
          type="button"
          onClick={onTriggerSync}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-white/80 bg-transparent px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63]"
        >
          <Activity className="h-4 w-4 text-[#FF6B63]" />
          Pulse Sync Check
        </button>
      </div>
    </div>
  );
}
