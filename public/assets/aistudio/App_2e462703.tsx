import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  FileText,
  Filter,
  Handshake,
  Home,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  FLASHCARDS,
  SCENES,
  TOTAL_DURATION,
  USER_ASSETS,
  type SceneId,
} from './data/documentary';
import { X_PROFILE } from './data/archive';
import { soundEngine } from './audio/soundEngine';
import { CrownDivider, CrownMark, MascotAvatar } from './components/CrownMark';
import {
  ArchiveSkeletonLoader,
  Button,
  ClayCard,
} from './components/ui/primitives';
import { VerticalStage } from './components/VerticalStage';
import { CompanionDeck } from './components/CompanionDeck';
import { ProfileHero } from './components/ProfileHero';
import { Web3FilterSection } from './components/Web3FilterSection';
import { ArchiveVaultSection } from './components/ArchiveVaultSection';
import { MethodologyPartnerSection } from './components/MethodologyPartnerSection';

type PageId = 'home' | 'three-step' | 'archive' | 'solana' | 'partner' | 'not-found';

function getSceneAtTime(timeSec: number) {
  for (let i = SCENES.length - 1; i >= 0; i--) {
    if (timeSec >= SCENES[i].startSec) {
      return SCENES[i];
    }
  }
  return SCENES[0];
}

function resolveInitialPage(): PageId {
  if (typeof window === 'undefined') return 'home';
  const hash = window.location.hash;
  if (hash.startsWith('#doc=') || hash === '#archive') return 'archive';
  if (hash === '#3-step' || hash === '#three-step-filter') return 'three-step';
  if (hash === '#solana' || hash === '#solana-breakdown') return 'solana';
  if (hash === '#partner' || hash === '#partner-hub') return 'partner';
  if (hash === '#404') return 'not-found';
  return 'home';
}

export default function App() {
  const [activePage, setActivePage] = useState<PageId>(resolveInitialPage);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceNarration, setVoiceNarration] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [manualFlips, setManualFlips] = useState<Record<string, boolean>>({});
  const [manualPulseTick, setManualPulseTick] = useState(0);

  const lastFrameRef = useRef<number | null>(null);
  const prevSceneIdRef = useRef<SceneId>('hook');
  const firedCuesRef = useRef<Set<string>>(new Set());

  const activeScene = useMemo(() => getSceneAtTime(currentTime), [currentTime]);
  const isComplete = currentTime >= TOTAL_DURATION - 0.05;

  const navigateTo = useCallback((page: PageId) => {
    setIsTransitioning(true);
    setActivePage(page);
    if (typeof window !== 'undefined') {
      const hashMap: Record<PageId, string> = {
        home: '#home',
        'three-step': '#3-step',
        archive: '#archive',
        solana: '#solana',
        partner: '#partner',
        'not-found': '#404',
      };
      window.history.replaceState(null, '', hashMap[page]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.setTimeout(() => {
      setIsTransitioning(false);
    }, 180);
  }, []);

  const handleJumpFromDoc = useCallback(
    (targetId: string) => {
      if (targetId === 'three-step-filter') navigateTo('three-step');
      else if (targetId === 'solana-breakdown') navigateTo('solana');
      else if (targetId === 'partner-hub' || targetId === 'signal-methodology')
        navigateTo('partner');
      else navigateTo('archive');
    },
    [navigateTo]
  );

  // Listen to hash changes (e.g., #doc=...)
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#doc=') || hash === '#archive') {
        setActivePage('archive');
      } else if (hash === '#404') {
        setActivePage('not-found');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Trigger procedural sound cues as the 55-second timeline advances
  const processTimelineCues = useCallback(
    (time: number, playing: boolean) => {
      if (!playing) return;
      const scene = getSceneAtTime(time);

      if (prevSceneIdRef.current !== scene.id) {
        prevSceneIdRef.current = scene.id;

        if (scene.id === 'hook') {
          soundEngine.playHookImpact();
        } else if (scene.id === 'flashcards') {
          soundEngine.playCardWhoosh();
        } else if (scene.id === 'protocol' || scene.id === 'bigger-picture') {
          soundEngine.playNetworkPulse();
        } else if (scene.id === 'outro') {
          soundEngine.playOutroBass();
        }

        if (voiceNarration) {
          soundEngine.speakVoiceover(scene.voiceover);
        }
      }

      if (scene.id === 'flashcards') {
        const sceneElapsed = time - scene.startSec;
        FLASHCARDS.forEach((card) => {
          const cueKey = `flip-${card.id}`;
          if (
            sceneElapsed >= card.flipOffsetSec &&
            !firedCuesRef.current.has(cueKey)
          ) {
            firedCuesRef.current.add(cueKey);
            soundEngine.playCardWhoosh();
            soundEngine.playCardClick();
          }
        });
      }

      if (scene.id === 'protocol') {
        const pulseIdx = Math.floor((time - scene.startSec) / 2.2);
        const cueKey = `proto-pulse-${pulseIdx}`;
        if (!firedCuesRef.current.has(cueKey)) {
          firedCuesRef.current.add(cueKey);
          soundEngine.playNetworkPulse();
        }
      }

      if (scene.id === 'users') {
        const sceneElapsed = time - scene.startSec;
        USER_ASSETS.forEach((asset) => {
          const cueKey = `lock-${asset.id}`;
          if (
            sceneElapsed >= asset.lockOffsetSec &&
            !firedCuesRef.current.has(cueKey)
          ) {
            firedCuesRef.current.add(cueKey);
            soundEngine.playCardClick();
          }
        });
      }
    },
    [voiceNarration]
  );

  // High-precision rAF playback loop
  useEffect(() => {
    if (!isPlaying) {
      lastFrameRef.current = null;
      soundEngine.stopAmbient();
      return;
    }

    if (!isMuted) {
      soundEngine.startAmbient();
    }

    let rafId = 0;
    const tick = (timestamp: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = timestamp;
      }
      const deltaSec = (timestamp - lastFrameRef.current) / 1000;
      lastFrameRef.current = timestamp;

      setCurrentTime((prev) => {
        const next = Math.min(TOTAL_DURATION, prev + deltaSec);
        processTimelineCues(next, true);
        if (next >= TOTAL_DURATION) {
          setIsPlaying(false);
          soundEngine.stopAmbient();
        }
        return next;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      soundEngine.stopAmbient();
    };
  }, [isPlaying, isMuted, processTimelineCues]);

  const handleTogglePlay = useCallback(() => {
    if (isComplete) {
      firedCuesRef.current.clear();
      setManualFlips({});
      setCurrentTime(0);
      prevSceneIdRef.current = 'hook';
      soundEngine.playHookImpact();
      if (voiceNarration) {
        soundEngine.speakVoiceover(SCENES[0].voiceover);
      }
      setIsPlaying(true);
      return;
    }

    setIsPlaying((prev) => {
      const next = !prev;
      if (next) {
        const scene = getSceneAtTime(currentTime);
        prevSceneIdRef.current = scene.id;
        if (currentTime < 0.25) {
          soundEngine.playHookImpact();
        }
        if (voiceNarration) {
          soundEngine.speakVoiceover(scene.voiceover);
        }
      } else {
        soundEngine.stopVoiceover();
      }
      return next;
    });
  }, [currentTime, isComplete, voiceNarration]);

  const handleReplay = useCallback(() => {
    firedCuesRef.current.clear();
    setManualFlips({});
    setCurrentTime(0);
    prevSceneIdRef.current = 'hook';
    soundEngine.playHookImpact();
    if (voiceNarration) {
      soundEngine.speakVoiceover(SCENES[0].voiceover);
    }
    setIsPlaying(true);
  }, [voiceNarration]);

  const handleSeek = useCallback(
    (timeSec: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_DURATION, timeSec));
      firedCuesRef.current.clear();
      const targetScene = getSceneAtTime(clamped);
      prevSceneIdRef.current = targetScene.id;
      setCurrentTime(clamped);
      soundEngine.playCardClick();
      if (isPlaying && voiceNarration) {
        soundEngine.speakVoiceover(targetScene.voiceover);
      }
    },
    [isPlaying, voiceNarration]
  );

  const handlePrevScene = useCallback(() => {
    const idx = SCENES.findIndex((s) => s.id === activeScene.id);
    const prevIdx = Math.max(0, idx - 1);
    handleSeek(SCENES[prevIdx].startSec);
  }, [activeScene.id, handleSeek]);

  const handleNextScene = useCallback(() => {
    const idx = SCENES.findIndex((s) => s.id === activeScene.id);
    const nextIdx = Math.min(SCENES.length - 1, idx + 1);
    handleSeek(SCENES[nextIdx].startSec);
  }, [activeScene.id, handleSeek]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      if (!next && isPlaying) {
        soundEngine.startAmbient();
      } else {
        soundEngine.stopAmbient();
      }
      return next;
    });
  }, [isPlaying]);

  const handleToggleVoiceNarration = useCallback(() => {
    setVoiceNarration((prev) => {
      const next = !prev;
      if (!next) {
        soundEngine.stopVoiceover();
      } else if (isPlaying) {
        soundEngine.speakVoiceover(activeScene.voiceover);
      }
      return next;
    });
  }, [activeScene.voiceover, isPlaying]);

  const handleToggleCard = useCallback(
    (id: string) => {
      soundEngine.playCardWhoosh();
      soundEngine.playCardClick();
      setManualFlips((prev) => {
        const card = FLASHCARDS.find((c) => c.id === id);
        const sceneTime = Math.max(0, currentTime - 5);
        const autoFlipped = card ? sceneTime >= card.flipOffsetSec : false;
        const currentFlipState =
          typeof prev[id] === 'boolean' ? prev[id] : autoFlipped;
        return { ...prev, [id]: !currentFlipState };
      });
    },
    [currentTime]
  );

  const handleTriggerSync = useCallback(() => {
    soundEngine.playNetworkPulse();
    setManualPulseTick((prev) => prev + 1);
  }, []);

  // Keyboard shortcuts (Space: Play/Pause, Left/Right: Scene step, M: Mute, V: Voiceover)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        tag === 'BUTTON'
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrevScene();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNextScene();
      } else if (key === 'm') {
        e.preventDefault();
        handleToggleMute();
      } else if (key === 'v') {
        e.preventDefault();
        handleToggleVoiceNarration();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleNextScene,
    handlePrevScene,
    handleToggleMute,
    handleTogglePlay,
    handleToggleVoiceNarration,
  ]);

  const navItems: { id: PageId; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'three-step', label: '3-Step' },
    { id: 'archive', label: 'Archive' },
    { id: 'solana', label: 'Solana 1.0' },
    { id: 'partner', label: 'Partner' },
  ];

  const solanaSection = (
    <ClayCard id="solana-breakdown" className="scroll-mt-24 p-5 sm:p-8">
      <div className="mb-6 flex flex-col gap-2 border-b-[1.5px] border-[#2A2A2A] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FF6B63]">
            <CrownMark className="h-4 w-4 shrink-0" />
            <span>ARCHIVED INTERACTIVE BREAKDOWN · DOC-02</span>
          </div>
          <h2 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight text-white">
            Solana 1.0 Explained (55s Documentary)
          </h2>
        </div>
        <p className="text-xs font-medium text-[#A3A3A3]">
          9:16 Vertical Stage · 3D Flashcards · Sound Design
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <VerticalStage
            currentTime={currentTime}
            activeScene={activeScene}
            isPlaying={isPlaying}
            isMuted={isMuted}
            showCaptions={showCaptions}
            manualFlips={manualFlips}
            manualPulseTick={manualPulseTick}
            onTogglePlay={handleTogglePlay}
            onToggleMute={handleToggleMute}
            onSeek={handleSeek}
            onPrevScene={handlePrevScene}
            onNextScene={handleNextScene}
            onReplay={handleReplay}
            onToggleCard={handleToggleCard}
            onTriggerSync={handleTriggerSync}
            onAssetSelect={() => soundEngine.playCardClick()}
          />
        </div>

        <div className="lg:col-span-7">
          <CompanionDeck
            currentTime={currentTime}
            activeScene={activeScene}
            isMuted={isMuted}
            voiceNarration={voiceNarration}
            showCaptions={showCaptions}
            manualFlips={manualFlips}
            onSelectScene={handleSeek}
            onToggleCard={handleToggleCard}
            onResetCards={() => {
              soundEngine.playCardClick();
              setManualFlips({});
            }}
            onToggleMute={handleToggleMute}
            onToggleVoiceNarration={handleToggleVoiceNarration}
            onToggleCaptions={() => setShowCaptions((prev) => !prev)}
          />
        </div>
      </div>
    </ClayCard>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] pb-24 text-white md:pb-0">
      {/* Three-Zone Top Bar Header */}
      <header className="sticky top-0 z-30 border-b-[1.5px] border-[#2A2A2A] bg-[#050505]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-4 py-3 sm:gap-8 sm:px-6">
          {/* Zone 1: Crown Mark + TOXICOLOGY Wordmark */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('home');
            }}
            className="flex min-h-[44px] items-center gap-2 rounded-full pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] whitespace-nowrap shrink-0"
          >
            <CrownMark className="h-6 w-6 shrink-0" />
            <span className="font-display text-base font-bold tracking-tight text-white sm:text-lg">
              TOXICOLOGY
            </span>
          </a>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav
            aria-label="Primary pages"
            className="hidden items-center gap-6 text-sm font-medium text-[#A3A3A3] md:flex"
          >
            {navItems.map((item) => {
              const active = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`min-h-[44px] cursor-pointer border-b-2 py-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-[#E10000] font-semibold text-white'
                      : 'border-transparent hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Solid Red CTA (never clipped at 360px) */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
                navigateTo('solana');
                if (!isPlaying) {
                  handleTogglePlay();
                }
              }}
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-[#E10000] px-3.5 text-xs font-semibold text-white shadow-[0_0_20px_rgba(225,0,0,0.35)] transition-all duration-200 hover:bg-[#FF2A1F] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] sm:h-12 sm:px-5 sm:text-sm whitespace-nowrap shrink-0"
            >
              {isComplete ? (
                <>
                  <RotateCcw className="h-4 w-4 shrink-0" />
                  <span>Replay 55s</span>
                </>
              ) : isPlaying ? (
                <>
                  <Pause className="h-4 w-4 shrink-0" />
                  <span>Playing 55s</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 shrink-0" />
                  <span>Watch Breakdown</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Content */}
      <main className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
        {isTransitioning ? (
          <ArchiveSkeletonLoader label="Loading page..." />
        ) : activePage === 'not-found' ? (
          <ClayCard className="flex flex-col items-center p-8 text-center sm:p-12">
            <MascotAvatar size="lg" />
            <p className="mt-6 text-xs font-bold tracking-wider text-[#FF6B63]">
              404 · PAGE NOT FOUND
            </p>
            <h1 className="mt-2 font-display text-[28px] font-bold text-white sm:text-[40px]">
              Wrong turn in the archive
            </h1>
            <p className="mt-2 max-w-md text-base text-[#A3A3A3]">
              That page doesn&apos;t exist. Head back to the main Toxicology
              Archive to check the 3-Step Filter or browse saved briefs.
            </p>
            <Button
              variant="primary"
              className="mt-6"
              onClick={() => navigateTo('home')}
            >
              Back to Home
            </Button>
          </ClayCard>
        ) : activePage === 'three-step' ? (
          <>
            <Web3FilterSection />
          </>
        ) : activePage === 'archive' ? (
          <>
            <ArchiveVaultSection onJumpToTarget={handleJumpFromDoc} />
          </>
        ) : activePage === 'solana' ? (
          <>{solanaSection}</>
        ) : activePage === 'partner' ? (
          <>
            <MethodologyPartnerSection />
          </>
        ) : (
          /* HOME PAGE: Complete Toxicology Archive Overview + All Sections */
          <>
            <ProfileHero
              onJumpToFilter={() => navigateTo('three-step')}
              onJumpToArchive={() => navigateTo('archive')}
            />

            {/* Quick Page Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  id: 'three-step' as PageId,
                  num: '01',
                  title: '3-Step Web3 Filter',
                  desc: 'Verify incentives, stress failure modes, and real usage.',
                },
                {
                  id: 'archive' as PageId,
                  num: '02',
                  title: 'Document Archive',
                  desc: 'Browse checklists, saved briefs, and downloadable files.',
                },
                {
                  id: 'solana' as PageId,
                  num: '03',
                  title: 'Solana 1.0 (55s)',
                  desc: 'Watch the 9:16 vertical documentary and flip 3D cards.',
                },
                {
                  id: 'partner' as PageId,
                  num: '04',
                  title: 'Partner Hub',
                  desc: 'View Signal methodology and sponsor research formats.',
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className="clay-card clay-card-interactive flex min-h-[44px] cursor-pointer flex-col justify-between p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xl font-bold text-[#E10000]">
                        {item.num}
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#A3A3A3]" />
                    </div>
                    <h2 className="mt-3 font-display text-base font-bold text-white">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-[#A3A3A3]">
                      {item.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <CrownDivider />

            <Web3FilterSection />

            <CrownDivider />

            <ArchiveVaultSection onJumpToTarget={handleJumpFromDoc} />

            <CrownDivider />

            {solanaSection}

            <CrownDivider />

            <MethodologyPartnerSection />
          </>
        )}
      </main>

      {/* Mobile Bottom Nav: 4 Tabs, 56px + iPhone safe area, active in red with crown-dot indicator */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-30 border-t-[1.5px] border-[#2A2A2A] bg-[#050505]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <div className="grid h-14 grid-cols-4">
          {[
            { id: 'home' as PageId, label: 'Home', Icon: Home },
            { id: 'three-step' as PageId, label: '3-Step', Icon: Filter },
            { id: 'archive' as PageId, label: 'Archive', Icon: FileText },
            { id: 'partner' as PageId, label: 'Partner', Icon: Handshake },
          ].map(({ id, label, Icon }) => {
            const active = activePage === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => navigateTo(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] ${
                  active ? 'text-[#FF6B63]' : 'text-[#A3A3A3] hover:text-white'
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 flex items-center justify-center"
                  >
                    <CrownMark className="h-2.5 w-2.5" glow={false} strokeWidth={4.5} />
                  </span>
                )}
                <Icon className={`h-4 w-4 ${active ? 'mt-2 text-[#E10000]' : ''}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer with Peace-Sign Mascot */}
      <footer className="border-t-[1.5px] border-[#2A2A2A] bg-[#050505] py-8">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <MascotAvatar size="sm" />
            <div className="text-left">
              <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                <CrownMark className="h-4 w-4 shrink-0" />
                <span>{X_PROFILE.archiveName}</span>
              </div>
              <p className="text-xs text-[#A3A3A3]">
                <span className="font-mono text-[#FF6B63]">
                  {X_PROFILE.handle}
                </span>{' '}
                ·{' '}
                <a
                  href={X_PROFILE.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono hover:text-white"
                >
                  {X_PROFILE.telegramLabel}
                </a>{' '}
                · Signal, not noise.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigateTo('not-found')}
              className="min-h-[44px] cursor-pointer rounded-full border-[1.5px] border-[#2A2A2A] bg-[#161616] px-4 py-2 text-xs font-semibold text-[#A3A3A3] transition-colors hover:border-[#E10000]/60 hover:text-white"
            >
              404 Preview
            </button>
            <a
              href="/jayraidxyz-solana-1.0-source.zip"
              download="toxicology-archive-source.zip"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border-[1.5px] border-[#2A2A2A] bg-[#161616] px-4 py-2 text-xs font-semibold text-white transition-colors hover:border-[#E10000] hover:text-[#FF6B63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] whitespace-nowrap shrink-0"
            >
              Download Source (.zip)
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
