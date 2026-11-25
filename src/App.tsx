import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  Download,
  FileText,
  Filter,
  Handshake,
  Home,
  Layers,
  Moon,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import {
  FLASHCARDS,
  SCENES,
  TOTAL_DURATION,
  USER_ASSETS,
  type SceneId,
} from './data/documentary';
import { INITIAL_ARCHIVE_DOCS, X_PROFILE } from './data/archive';
import { soundEngine } from './audio/soundEngine';
import { CrownDivider, CrownMark, MascotAvatar } from './components/CrownMark';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { ArchiveSkeletonLoader } from './components/ui/skeleton';
import { VerticalStage } from './components/VerticalStage';
import { CompanionDeck } from './components/CompanionDeck';
import { type CameraPreset } from './components/ThreeSolanaStage';
import { Doc02PopoutSheet } from './components/Doc02PopoutSheet';
import { ResearchChatPanel } from './components/ResearchChatPanel';
import { ProfileHero } from './components/ProfileHero';
import { Web3FilterSection } from './components/Web3FilterSection';
import { ArchiveVaultSection } from './components/ArchiveVaultSection';
import { MethodologyPartnerSection } from './components/MethodologyPartnerSection';
import { LoginPage3D } from './components/LoginPage3D';
import { auth, onAuthStateChanged } from './lib/firebase';
import type { User } from 'firebase/auth';

type PageId =
  | 'home'
  | 'three-step'
  | 'archive'
  | 'solana'
  | 'partner'
  | 'login'
  | 'not-found';

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
  if (hash === '#login' || hash === '#auth') return 'login';
  if (hash.startsWith('#doc=') || hash === '#archive') return 'archive';
  if (hash === '#3-step' || hash === '#three-step-filter') return 'three-step';
  if (hash === '#solana' || hash === '#solana-breakdown') return 'solana';
  if (hash === '#partner' || hash === '#partner-hub') return 'partner';
  if (hash === '#404') return 'not-found';
  return 'home';
}

export default function App() {
  const [activePage, setActivePage] = useState<PageId>(resolveInitialPage);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem('toxicology_theme');
    return saved !== 'light';
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceNarration, setVoiceNarration] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [manualFlips, setManualFlips] = useState<Record<string, boolean>>({});
  const [manualPulseTick, setManualPulseTick] = useState(0);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('auto');
  const [isDoc02Open, setIsDoc02Open] = useState(true);
  const [isAiOpen, setIsAiOpen] = useState(false);

  const lastFrameRef = useRef<number | null>(null);
  const prevSceneIdRef = useRef<SceneId>('hook');
  const firedCuesRef = useRef<Set<string>>(new Set());

  const activeScene = useMemo(() => getSceneAtTime(currentTime), [currentTime]);
  const isComplete = currentTime >= TOTAL_DURATION - 0.05;

  // Sync light/dark .dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem('toxicology_theme', isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage error
    }
  }, [isDark]);

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

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
        login: '#login',
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
      if (targetId === 'three-step-filter') {
        setIsDoc02Open(false);
        navigateTo('three-step');
      } else if (targetId === 'solana-breakdown') {
        navigateTo('solana');
        setIsDoc02Open(true);
      } else if (targetId === 'partner-hub' || targetId === 'signal-methodology') {
        setIsDoc02Open(false);
        navigateTo('partner');
      } else {
        setIsDoc02Open(false);
        navigateTo('archive');
      }
    },
    [navigateTo]
  );

  // Listen to hash changes (e.g., #doc=..., #login)
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#login' || hash === '#auth') {
        setActivePage('login');
      } else if (hash.startsWith('#doc=') || hash === '#archive') {
        setActivePage('archive');
      } else if (hash === '#3-step') {
        setActivePage('three-step');
      } else if (hash === '#solana') {
        setActivePage('solana');
      } else if (hash === '#partner') {
        setActivePage('partner');
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

  const handleExportArchiveJson = useCallback(() => {
    let customDocs = [];
    try {
      const raw = window.localStorage.getItem('toxicology_archive_docs_v1');
      if (raw) customDocs = JSON.parse(raw);
    } catch {
      customDocs = [];
    }
    const payload = {
      archive: X_PROFILE.archiveName,
      handle: X_PROFILE.handle,
      exportedAt: new Date().toISOString(),
      documents: [...customDocs, ...INITIAL_ARCHIVE_DOCS],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'toxicology-archive-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const workflowTabs: {
    id: PageId;
    stepLabel: string;
    tabLabel: string;
    title: string;
    desc: string;
    badge?: string;
    Icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'home',
      stepLabel: 'Step 1',
      tabLabel: '1. Overview',
      title: 'PROFILE & FEED',
      desc: 'Full archive overview & bio',
      Icon: Layers,
    },
    {
      id: 'three-step',
      stepLabel: 'Step 2',
      tabLabel: '2. 3-Step Filter',
      title: '3-STEP FILTER',
      desc: 'Incentives, load & real usage',
      badge: '3',
      Icon: Filter,
    },
    {
      id: 'archive',
      stepLabel: 'Step 3',
      tabLabel: '3. Archive',
      title: 'DOCUMENT VAULT',
      desc: 'Saved checklists & briefs',
      badge: String(INITIAL_ARCHIVE_DOCS.length),
      Icon: FileText,
    },
    {
      id: 'solana',
      stepLabel: 'Step 4',
      tabLabel: '4. Solana 1.0',
      title: 'SOLANA 1.0',
      desc: '55s interactive breakdown',
      badge: '55s',
      Icon: Activity,
    },
    {
      id: 'partner',
      stepLabel: 'Step 5',
      tabLabel: '5. Partner',
      title: 'PARTNER HUB',
      desc: 'Signal method & sponsorships',
      Icon: ShieldCheck,
    },
  ];

  const solanaExperienceBody = (
    <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-5">
        <VerticalStage
          currentTime={currentTime}
          activeScene={activeScene}
          isPlaying={isPlaying}
          isMuted={isMuted}
          voiceNarration={voiceNarration}
          showCaptions={showCaptions}
          manualFlips={manualFlips}
          manualPulseTick={manualPulseTick}
          cameraPreset={cameraPreset}
          onCameraPresetChange={setCameraPreset}
          onTogglePlay={handleTogglePlay}
          onToggleMute={handleToggleMute}
          onToggleVoiceNarration={handleToggleVoiceNarration}
          onToggleCaptions={() => setShowCaptions((prev) => !prev)}
          onSeek={handleSeek}
          onPrevScene={handlePrevScene}
          onNextScene={handleNextScene}
          onReplay={handleReplay}
          onToggleCard={handleToggleCard}
          onTriggerSync={handleTriggerSync}
          onAssetSelect={() => soundEngine.playCardClick()}
        />
      </div>

      <div className="min-w-0 lg:col-span-7">
        <CompanionDeck
          currentTime={currentTime}
          activeScene={activeScene}
          manualFlips={manualFlips}
          onSelectScene={handleSeek}
          onCameraPresetChange={setCameraPreset}
          onToggleCard={handleToggleCard}
          onResetCards={() => {
            soundEngine.playCardClick();
            setManualFlips({});
          }}
        />
      </div>
    </div>
  );

  const solanaSection = (
    <Card id="solana-breakdown" className="scroll-mt-28 p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)]">
            ARCHIVED INTERACTIVE BREAKDOWN · DOC-02
          </p>
          <h2 className="heading-section mt-1.5 font-display font-bold tracking-tight text-[var(--text)]">
            Solana 1.0 Explained (55s 3D Documentary)
          </h2>
        </div>

        <Button
          variant="primary"
          size="compact"
          onClick={() => setIsDoc02Open(true)}
        >
          Pop Out 3D Sheet
        </Button>
      </div>

      {isDoc02Open ? (
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-[var(--accent)]/50 bg-[var(--bg)] p-6 text-center sm:flex-row sm:text-left">
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent-text)]">
              3D STAGE ACTIVE IN DOC-02 POP-OUT
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              The live Three.js 3D scene, unified controls, timeline, and 3D
              flashcards are open in the bottom drawer. Minimize the drawer
              anytime to dock them inline here.
            </p>
          </div>
          <Button
            variant="secondary"
            size="compact"
            onClick={() => setIsDoc02Open(false)}
          >
            Dock Inline Here
          </Button>
        </div>
      ) : (
        solanaExperienceBody
      )}
    </Card>
  );

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[var(--bg)] pb-[calc(126px+env(safe-area-inset-bottom))] text-[var(--text)] md:pb-20">
      {/* Sticky Top Header + Horizontally Scrollable Tab Bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]">
        {/* Top Row: Logo Left + Compact 36-40px Icon Buttons Right */}
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('home');
            }}
            className="flex min-h-[40px] min-w-0 shrink items-center gap-2 rounded-xl pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] whitespace-nowrap"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[#050505]">
              <CrownMark className="h-5 w-5" />
            </span>
            <span className="font-display text-sm font-bold tracking-tight text-[var(--text)] sm:text-base">
              TOXICOLOGY<span className="hidden sm:inline"> ARCHIVE</span>
            </span>
          </a>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Google Auth Status / 3D Login Button */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => navigateTo('login')}
                aria-label={`Logged in as ${currentUser.email}. Open 3D Beacon and Account.`}
                title={`Account: ${currentUser.email}`}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-2 transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] sm:h-10 sm:px-2.5"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="h-5 w-5 rounded-full border border-[var(--accent)] object-cover"
                  />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </span>
                )}
                <span className="hidden sm:inline max-w-[90px] truncate text-xs font-semibold text-[var(--text)]">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigateTo('login')}
                aria-label="Sign in with Google"
                title="Sign in with Google"
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--accent)]/50 bg-[var(--surface-2)] px-2.5 text-xs font-bold text-[var(--accent-text)] transition-colors hover:bg-[var(--accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] sm:h-10"
              >
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">Google Auth</span>
                <span className="sm:hidden">Login</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigateTo('archive')}
              aria-label="Open Document Archive"
              title="Document Archive"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] sm:h-10 sm:w-10"
            >
              <BookOpen className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsAiOpen(true)}
              aria-label="Open Toxicology Research AI"
              title="Research AI + Search Grounding"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent-text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] sm:h-10 sm:w-10"
            >
              <Sparkles className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsDoc02Open(true);
                if (!isPlaying) {
                  handleTogglePlay();
                }
              }}
              aria-label={
                isComplete
                  ? 'Replay 55s Solana Breakdown'
                  : isPlaying
                  ? 'Pause 55s Solana Breakdown'
                  : 'Watch 55s Solana Breakdown'
              }
              title="Open 3D Breakdown"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-[0_0_16px_var(--accent-glow)] transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] sm:h-10 sm:w-10"
            >
              {isComplete ? (
                <RotateCcw className="h-4 w-4" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={handleExportArchiveJson}
              aria-label="Export Archive JSON"
              title="Export Archive JSON"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] sm:h-10 sm:w-10"
            >
              <Download className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? 'Light Theme' : 'Dark Theme'}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent-text)] transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] sm:h-10 sm:w-10"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Workflow Tab Bar */}
        <nav
          aria-label="Workflow navigation tabs"
          className="no-scrollbar mx-auto flex max-w-[1200px] snap-x items-center gap-1 overflow-x-auto border-t border-[var(--border)] px-4 whitespace-nowrap sm:gap-3 sm:px-6"
        >
          {workflowTabs.map(({ id, tabLabel, badge, Icon }) => {
            const active = activePage === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => navigateTo(id)}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-[44px] shrink-0 snap-start cursor-pointer items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold tracking-wider uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] ${
                  active
                    ? 'border-[var(--accent)] text-[var(--text)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 ${
                    active ? 'text-[var(--accent-text)]' : ''
                  }`}
                />
                <span>{tabLabel}</span>
                {badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                      active
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--surface-2)] text-[var(--muted)]'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Responsive Content */}
      <main className="mx-auto max-w-[1200px] space-y-4 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-6">
        {isTransitioning ? (
          <ArchiveSkeletonLoader label="Loading section..." />
        ) : activePage === 'not-found' ? (
          <Card className="flex flex-col items-center p-6 text-center sm:p-10">
            <MascotAvatar size="lg" />
            <p className="mt-5 text-xs font-bold tracking-widest uppercase text-[var(--accent-text)]">
              404 · PAGE NOT FOUND
            </p>
            <h1 className="heading-page mt-2 font-display font-bold text-[var(--text)]">
              Wrong turn in the archive
            </h1>
            <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
              That page doesn&apos;t exist. Head back to the main Toxicology
              Archive to check the 3-Step Filter or browse saved briefs.
            </p>
            <Button
              variant="primary"
              className="mt-5"
              onClick={() => navigateTo('home')}
            >
              Back to Home
            </Button>
          </Card>
        ) : activePage === 'login' ? (
          <LoginPage3D
            user={currentUser}
            onEnterArchive={() => navigateTo('archive')}
          />
        ) : activePage === 'three-step' ? (
          <Web3FilterSection />
        ) : activePage === 'archive' ? (
          <ArchiveVaultSection
            onJumpToTarget={handleJumpFromDoc}
            user={currentUser}
            onOpenLogin={() => navigateTo('login')}
          />
        ) : activePage === 'solana' ? (
          solanaSection
        ) : activePage === 'partner' ? (
          <MethodologyPartnerSection />
        ) : (
          /* HOME PAGE: Guided Workflow Container + Profile + All Existing Sections */
          <>
            {/* Guided Workflow Step Grid (grid-cols-2 mobile, md:grid-cols-3, lg:grid-cols-5; odd 5th card sits naturally) */}
            <Card className="p-4 sm:p-6">
              <div className="mb-4">
                <p className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)]">
                  GUIDED RESEARCH WORKFLOW
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="heading-section font-display font-bold text-[var(--text)]">
                    Phase 1 of 5: Archive &amp; Due Diligence
                  </h2>
                  <span className="text-xs text-[var(--muted)]">
                    Signal, not noise ·{' '}
                    <span className="font-mono text-[var(--accent-text)]">
                      {X_PROFILE.handle}
                    </span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
                {workflowTabs.map(({ id, stepLabel, title, desc, Icon }) => {
                  const active = activePage === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => navigateTo(id)}
                      className={`flex min-h-[108px] min-w-0 cursor-pointer flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] sm:p-4 ${
                        active
                          ? 'border-[var(--accent)] bg-[var(--surface-2)] shadow-[0_0_20px_var(--accent-glow)]'
                          : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)]/60 hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                            active
                              ? 'bg-[var(--accent)] text-white'
                              : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]'
                          }`}
                        >
                          {stepLabel}
                        </span>
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active
                              ? 'text-[var(--accent-text)]'
                              : 'text-[var(--muted)]'
                          }`}
                        />
                      </div>

                      <div className="mt-3 min-w-0">
                        <p className="font-display text-xs font-bold tracking-wide text-[var(--text)] sm:text-sm">
                          {title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                          {desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <ProfileHero
              onJumpToFilter={() => navigateTo('three-step')}
              onJumpToArchive={() => navigateTo('archive')}
            />

            <CrownDivider />

            <Web3FilterSection />

            <CrownDivider />

            <ArchiveVaultSection
              onJumpToTarget={handleJumpFromDoc}
              user={currentUser}
              onOpenLogin={() => navigateTo('login')}
            />

            <CrownDivider />

            {solanaSection}

            <CrownDivider />

            <MethodologyPartnerSection />
          </>
        )}
      </main>

      {/* Mobile Bottom Nav: safe-area aware (solid surface, no backdrop-blur) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid h-14 grid-cols-4">
          {[
            { id: 'home' as PageId, label: 'Overview', Icon: Home },
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
                className={`relative flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] ${
                  active
                    ? 'text-[var(--accent-text)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 flex items-center justify-center"
                  >
                    <CrownMark
                      className="h-2.5 w-2.5"
                      glow={false}
                      strokeWidth={4.5}
                    />
                  </span>
                )}
                <Icon
                  className={`h-4 w-4 ${
                    active ? 'mt-2 text-[var(--accent)]' : ''
                  }`}
                />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer with Peace-Sign Mascot */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-6">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <MascotAvatar size="sm" />
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--text)]">
                <CrownMark className="h-4 w-4 shrink-0" />
                <span>{X_PROFILE.archiveName}</span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                <span className="font-mono text-[var(--accent-text)]">
                  {X_PROFILE.handle}
                </span>{' '}
                ·{' '}
                <a
                  href={X_PROFILE.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono hover:text-[var(--text)]"
                >
                  {X_PROFILE.telegramLabel}
                </a>{' '}
                · Signal, not noise.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="subtle"
              size="compact"
              onClick={() => navigateTo('login')}
            >
              {currentUser ? '3D Beacon & Account' : 'Google Login (3D)'}
            </Button>
            <Button
              variant="subtle"
              size="compact"
              onClick={() => navigateTo('not-found')}
            >
              404 Preview
            </Button>
            <Button
              variant="subtle"
              size="compact"
              onClick={handleExportArchiveJson}
            >
              <Download className="h-3.5 w-3.5 text-[var(--accent-text)]" />
              Export Archive (.json)
            </Button>
          </div>
        </div>
      </footer>

      {/* Automatic DOC-02 X-Link Style Bottom Pop-Out Sheet with Live 3D Experience */}
      <Doc02PopoutSheet
        isOpen={isDoc02Open}
        onOpen={() => setIsDoc02Open(true)}
        onClose={() => setIsDoc02Open(false)}
        onOpenAiResearch={() => setIsAiOpen(true)}
      >
        {solanaExperienceBody}
      </Doc02PopoutSheet>

      {/* Multi-Turn Gemini Chat + Google Search Grounding Drawer */}
      <ResearchChatPanel
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        sceneTitle={`${activeScene.number}. ${activeScene.title}`}
        activePage={activePage}
        user={currentUser}
        onOpenLogin={() => navigateTo('login')}
      />
    </div>
  );
}
