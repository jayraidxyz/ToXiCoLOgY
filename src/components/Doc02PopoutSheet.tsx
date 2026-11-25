import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronUp, ExternalLink, Minimize2, Sparkles, X } from 'lucide-react';
import { X_PROFILE } from '../data/archive';
import { CrownMark, MascotAvatar } from './CrownMark';

interface Doc02PopoutSheetProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onOpenAiResearch: () => void;
  children: React.ReactNode;
}

export function Doc02PopoutSheet({
  isOpen,
  onOpen,
  onClose,
  onOpenAiResearch,
  children,
}: Doc02PopoutSheetProps) {
  return (
    <>
      {/* Persistent X-Link Style Bottom Peek Bar when DOC-02 Sheet is minimized */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[1200px] px-3 sm:px-6 md:bottom-4"
          >
            <button
              type="button"
              onClick={onOpen}
              className="flex min-h-[54px] w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[#2A2A2A] bg-[#0E0E0E] px-3.5 py-2 text-left shadow-[0_-8px_30px_rgba(0,0,0,0.65),0_0_24px_rgba(225,0,0,0.25)] transition-colors hover:border-[#E10000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MascotAvatar size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-mono text-[11px] font-bold tracking-wider uppercase text-[#FF6B63]">
                    ARCHIVED INTERACTIVE BREAKDOWN · DOC-02
                  </p>
                  <p className="truncate font-display text-xs font-bold text-white sm:text-sm">
                    Solana 1.0 Explained · Tap to pop out 3D Stage &amp; Flashcards
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#E10000] px-3 py-1.5 text-xs font-bold text-white">
                <ChevronUp className="h-4 w-4" />
                <span className="hidden sm:inline">Open 3D</span>
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Pop-Out Drawer (matches X link-preview bottom sheet without backdrop-filter over WebGL) */}
      <AnimatePresence>
        {isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="DOC-02 Interactive 3D Breakdown"
            className="fixed inset-0 z-50 flex flex-col justify-end"
          >
            {/* Solid tinted scrim (no backdrop-blur over WebGL) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/75"
              aria-hidden="true"
            />

            <motion.section
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 mx-auto flex max-h-[92dvh] w-full max-w-[1220px] flex-col overflow-hidden rounded-t-[24px] border-x border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_60px_rgba(0,0,0,0.9)]"
            >
              {/* X-Link Style Grab Handle */}
              <div className="flex justify-center pt-2.5">
                <span
                  aria-hidden="true"
                  className="h-1 w-10 rounded-full bg-[var(--border)]"
                />
              </div>

              {/* Pop-Out Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <MascotAvatar size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <CrownMark className="h-3.5 w-3.5 shrink-0" glow={false} />
                      <p className="truncate font-mono text-[11px] font-bold tracking-widest uppercase text-[var(--accent-text)]">
                        ARCHIVED INTERACTIVE BREAKDOWN · DOC-02
                      </p>
                    </div>
                    <h2 className="truncate font-display text-sm font-bold text-[var(--text)] sm:text-lg">
                      Solana 1.0 Explained · 3D Stage &amp; Flashcards
                    </h2>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenAiResearch}
                    className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)]"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[var(--accent-text)]" />
                    <span>Ask AI</span>
                  </button>

                  <a
                    href={X_PROFILE.xUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View @toxicologyavp on X"
                    className="hidden min-h-[40px] items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)] sm:inline-flex"
                  >
                    <span>@toxicologyavp</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Minimize DOC-02 3D popout"
                    title="Minimize to bottom bar"
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close DOC-02 3D popout"
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Interactive 3D Stage + Unified Controls + Timeline & Flashcards */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {children}
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
