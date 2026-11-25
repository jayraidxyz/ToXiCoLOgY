import React, { useState } from 'react';
import { ArrowRight, ExternalLink, Send } from 'lucide-react';
import { X_PROFILE } from '../data/archive';
import { CrownMark, MascotAvatar } from './CrownMark';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface ProfileHeroProps {
  onJumpToFilter: () => void;
  onJumpToArchive: () => void;
}

export function ProfileHero({
  onJumpToFilter,
  onJumpToArchive,
}: ProfileHeroProps) {
  const [peekImgFailed, setPeekImgFailed] = useState(false);

  return (
    <Card className="overflow-hidden">
      {/* Banner: #050505 black + faint red grid + large crown watermark + mascot peeking in. Zero text overlapping artwork. */}
      <div
        className="red-grid relative h-32 w-full overflow-hidden border-b border-[var(--border)] bg-[#050505] sm:h-44"
        aria-label="Toxicology Archive branded banner"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 82% 55%, rgba(225, 0, 0, 0.16), transparent 62%)',
          }}
        />

        {/* Large Crown Watermark on the right */}
        <div className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 opacity-20 sm:right-24">
          <CrownMark className="h-24 w-24 sm:h-36 sm:w-36" strokeWidth={2.4} />
        </div>

        {/* Mascot peeking cleanly from bottom right */}
        <div className="pointer-events-none absolute -bottom-3 right-3 h-20 w-20 overflow-hidden rounded-full border-2 border-[var(--accent)] bg-[#E10000] p-0.5 shadow-[0_0_24px_var(--accent-glow)] sm:-bottom-4 sm:right-6 sm:h-28 sm:w-28">
          {peekImgFailed ? (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#E10000]">
              <CrownMark className="h-9 w-9" glow={false} />
            </div>
          ) : (
            <img
              src={X_PROFILE.avatarPath}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              onError={() => setPeekImgFailed(true)}
              className="h-auto max-w-full rounded-full object-cover aspect-square"
            />
          )}
        </div>
      </div>

      {/* Profile Content Below Banner Artwork */}
      <div className="px-4 pb-5 sm:px-6 sm:pb-6">
        <div className="relative -mt-8 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <MascotAvatar size="lg" />

            <div className="min-w-0 pb-1">
              <p className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)]">
                WEB3 RESEARCH ARCHIVE
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <CrownMark className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
                <h1 className="heading-page font-display font-bold tracking-tight text-[var(--text)]">
                  {X_PROFILE.archiveName}
                </h1>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--muted)]">
                <span className="font-mono font-medium text-[var(--accent-text)]">
                  {X_PROFILE.handle}
                </span>
                <span aria-hidden="true">·</span>
                <span>{X_PROFILE.location}</span>
                <span aria-hidden="true">·</span>
                <a
                  href={X_PROFILE.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center font-mono text-[var(--text)] underline decoration-[var(--border)] underline-offset-4 transition-colors hover:text-[var(--accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
                >
                  {X_PROFILE.telegramLabel}
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="subtle" size="compact">
              <a
                href={X_PROFILE.xUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Follow on X
                <ExternalLink className="h-3.5 w-3.5 text-[var(--muted)]" />
              </a>
            </Button>
            <Button asChild variant="subtle" size="compact">
              <a
                href={X_PROFILE.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Send className="h-3.5 w-3.5 text-[var(--accent-text)]" />
                Telegram
              </a>
            </Button>
          </div>
        </div>

        {/* Bio & Clean Actions */}
        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[var(--border)] pt-5 lg:grid-cols-12 lg:items-center">
          <div className="min-w-0 space-y-1.5 lg:col-span-7">
            <p className="font-display text-base font-bold leading-snug text-[var(--text)] sm:text-lg">
              {X_PROFILE.tagline}
            </p>
            <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
              Permanent home for every checklist, research brief, and
              interactive protocol breakdown shared on{' '}
              <span className="font-mono text-[var(--accent-text)]">
                {X_PROFILE.handle}
              </span>
              . Verify claims straight away before you ape, build, or repost.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 lg:col-span-5 lg:justify-end">
            <Button variant="secondary" onClick={onJumpToFilter}>
              Open 3-Step Filter
              <ArrowRight className="h-4 w-4 text-[var(--accent-text)]" />
            </Button>
            <Button variant="subtle" onClick={onJumpToArchive}>
              Browse Archive
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
