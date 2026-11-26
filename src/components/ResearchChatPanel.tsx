import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Flame,
  Globe,
  LogIn,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { CrownMark } from './CrownMark';
import { Button } from './ui/button';
import {
  getUserChatHistory,
  saveChatMessage,
  signInGuestFirebase,
} from '../lib/firebase';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: GroundingSource[];
  error?: string;
}

interface ResearchChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sceneTitle: string;
  activePage: string;
  user: User | null;
  onOpenLogin?: () => void;
}

const STARTER_PROMPTS = [
  'Verify Solana 1.0 Firedancer & Agave client status',
  'Run the 3-Step Web3 Filter on Solana ($SOL)',
  'What stays unchanged for wallets after Mainnet Beta?',
  'Check recent DeFi fee-to-emission trends',
];

export function ResearchChatPanel({
  isOpen,
  onClose,
  sceneTitle,
  activePage,
  user,
  onOpenLogin,
}: ResearchChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null);
  const [authActionError, setAuthActionError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastLoadedUserIdRef = useRef<string | null>(null);

  // Load persistent Firestore history when user is signed in
  useEffect(() => {
    if (!isOpen) return;

    if (user?.uid) {
      if (lastLoadedUserIdRef.current === user.uid && messages.length > 0) {
        return;
      }
      lastLoadedUserIdRef.current = user.uid;
      setIsLoadingHistory(true);
      getUserChatHistory(user.uid)
        .then((hist) => {
          if (hist.length > 0) {
            setMessages(hist);
          }
        })
        .catch((err) => {
          console.warn('Could not load Firestore chat history:', err);
        })
        .finally(() => {
          setIsLoadingHistory(false);
        });
    } else {
      lastLoadedUserIdRef.current = null;
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen]);

  const handleQuickFirebaseSignIn = async () => {
    setAuthActionError(null);
    try {
      if (onOpenLogin) {
        onClose();
        onOpenLogin();
      } else {
        await signInGuestFirebase();
      }
    } catch (err: unknown) {
      setAuthActionError(
        err instanceof Error ? err.message : 'Firebase authentication failed.'
      );
    }
  };

  const sendPrompt = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isLoading) return;

    setLastFailedInput(null);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const historyPayload = messages
      .filter((m) => !m.error && m.text.trim().length > 0)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // Persist user turn to Firestore if authenticated
    if (user?.uid) {
      void saveChatMessage(user.uid, userMsg);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: historyPayload,
          message: trimmed,
          context: { sceneTitle, activePage },
        }),
      });

      const data = (await response.json()) as {
        text?: string;
        sources?: GroundingSource[];
        error?: string;
      };

      if (!response.ok || data.error) {
        if (
          response.status === 429 ||
          /429|resource_exhausted|rate\s*limit|quota/i.test(data.error || '')
        ) {
          throw new Error('Rate limit reached, try again in a minute');
        }
        throw new Error(
          data.error || `Request failed with status ${response.status}`
        );
      }

      const modelMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'model',
        text: data.text || 'No response returned.',
        sources: Array.isArray(data.sources) ? data.sources : [],
      };
      setMessages((prev) => [...prev, modelMsg]);

      // Persist model response to Firestore if authenticated
      if (user?.uid) {
        void saveChatMessage(user.uid, modelMsg);
      }
    } catch (err: unknown) {
      let errMsg =
        err instanceof Error ? err.message : 'Unable to reach Gemini API.';
      if (/429|resource_exhausted|rate\s*limit|quota/i.test(errMsg)) {
        errMsg = 'Rate limit reached, try again in a minute';
      }
      setLastFailedInput(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: '',
          error: errMsg,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendPrompt(inputValue);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Toxicology Archive AI Research Assistant"
          className="fixed inset-0 z-[60] flex items-end justify-end sm:items-center sm:justify-end sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70"
            aria-hidden="true"
          />

          <motion.aside
            initial={{ x: '100%', opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex h-[88dvh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[24px] border border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] shadow-2xl sm:h-[85dvh] sm:rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/60 bg-[#050505]">
                  <CrownMark className="h-5 w-5" glow={false} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--accent-text)]" />
                    <h2 className="truncate font-display text-sm font-bold text-[var(--text)]">
                      Toxicology Research AI
                    </h2>
                  </div>
                  {user ? (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                      <span className="truncate max-w-[200px] font-mono text-[11px] text-emerald-400">
                        {user.email || (user.isAnonymous ? 'Firebase Guest' : 'Firebase User')}
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">· Firestore Synced</span>
                    </div>
                  ) : (
                    <p className="truncate text-xs text-[var(--muted)]">
                      Multi-turn + Live Web Research
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {!user && (
                  <button
                    type="button"
                    onClick={() => void handleQuickFirebaseSignIn()}
                    className="hidden sm:inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--accent)]/50 bg-[var(--surface-2)] px-2.5 text-xs font-semibold text-[var(--accent-text)] transition-colors hover:bg-[var(--accent)] hover:text-white"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Firebase Login</span>
                  </button>
                )}
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMessages([]);
                      setLastFailedInput(null);
                    }}
                    aria-label="Clear chat history"
                    title="New conversation"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--text)]"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close AI Research drawer"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--accent)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Multi-Turn Message Thread */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto p-4"
            >
              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
                  <p className="mt-3 text-xs font-medium text-[var(--muted)]">
                    Loading your saved Gemini history from Firestore...
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="space-y-4">
                  {/* Firebase Cloud persistence banner for guests */}
                  {!user && (
                    <div className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-3.5 text-left">
                      <div className="flex items-start gap-2.5">
                        <Flame className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-text)]" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[var(--text)]">
                            Save your research history in Firebase
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
                            Sign in with Firebase to automatically store all Gemini AI due-diligence chats in Cloud Firestore.
                          </p>
                          {authActionError && (
                            <p className="mt-1 text-[11px] text-[var(--accent-text)]">
                              {authActionError}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleQuickFirebaseSignIn()}
                            className="mt-2.5 inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl bg-[var(--accent)] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]"
                          >
                            <Flame className="h-4 w-4" />
                            <span>Connect Firebase</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent-text)]">
                      SIGNAL, NOT NOISE · SEARCH GROUNDED
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--text)]">
                      Ask follow-up questions about Solana 1.0, Agave &amp;
                      Firedancer, or run any token through live web-grounded
                      due diligence.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
                      Starter Checks
                    </p>
                    {STARTER_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendPrompt(prompt)}
                        className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-left text-xs font-medium text-[var(--text)] transition-colors hover:border-[var(--accent)]"
                      >
                        <span>{prompt}</span>
                        <Send className="h-3.5 w-3.5 shrink-0 text-[var(--accent-text)]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    {msg.error ? (
                      <div className="w-full rounded-xl border border-[var(--accent)] bg-[var(--accent)]/10 p-3.5 text-xs text-[var(--text)]">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-text)]" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[var(--accent-text)]">
                              Gemini API Error
                            </p>
                            <p className="mt-1 break-words text-[var(--muted)]">
                              {msg.error}
                            </p>
                            {lastFailedInput && (
                              <Button
                                variant="subtle"
                                size="compact"
                                className="mt-2"
                                onClick={() => void sendPrompt(lastFailedInput)}
                              >
                                Retry Request
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[var(--accent)] text-white'
                            : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]'
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {msg.text}
                        </div>

                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 border-t border-[var(--border)] pt-2.5">
                            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                              <Globe className="h-3 w-3 text-[var(--accent-text)]" />
                              <span>Google Search Sources</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.sources.map((src) => (
                                <a
                                  key={src.uri}
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[11px] font-medium text-[var(--text)] transition-colors hover:border-[var(--accent)]"
                                >
                                  <span className="truncate max-w-[180px]">
                                    {src.title}
                                  </span>
                                  <ExternalLink className="h-3 w-3 shrink-0 text-[var(--accent-text)]" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex items-start">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-xs font-medium text-[var(--muted)]">
                    Searching web sources &amp; analyzing...
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Input Composer */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--surface-2)] p-3"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about Solana 1.0 or any protocol..."
                aria-label="Ask Toxicology Research AI"
                className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 text-base text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                aria-label="Send message"
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[var(--accent)] text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
