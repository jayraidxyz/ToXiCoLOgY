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
        className="red-grid relative h-36 w-full overflow-hidden border-b-[1.5px] border-[#2A2A2A] bg-[#050505] sm:h-48"
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
          <CrownMark className="h-28 w-28 sm:h-40 sm:w-40" strokeWidth={2.4} />
        </div>

        {/* Mascot peeking cleanly from bottom right */}
        <div className="pointer-events-none absolute -bottom-3 right-3 h-24 w-24 overflow-hidden rounded-full border-2 border-[#E10000] bg-[#E10000] p-0.5 shadow-[0_0_24px_rgba(225,0,0,0.45)] sm:-bottom-4 sm:right-6 sm:h-32 sm:w-32">
          {peekImgFailed ? (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#E10000]">
              <CrownMark className="h-10 w-10" glow={false} />
            </div>
          ) : (
            <img
              src={X_PROFILE.avatarPath}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              onError={() => setPeekImgFailed(true)}
              className="h-full w-full rounded-full object-cover"
            />
          )}
        </div>
      </div>

      {/* Profile Content Below Banner Artwork */}
      <div className="px-4 pb-6 sm:px-8 sm:pb-8">
        <div className="relative -mt-10 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-4">
            <MascotAvatar size="lg" />

            <div className="min-w-0 pb-1">
              <div className="flex items-center gap-2">
                <CrownMark className="h-6 w-6 shrink-0" />
                <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[40px]">
                  {X_PROFILE.archiveName}
                </h1>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#A3A3A3]">
                <span className="font-mono font-medium text-[#FF6B63]">
                  {X_PROFILE.handle}
                </span>
                <span aria-hidden="true">·</span>
                <span>{X_PROFILE.location}</span>
                <span aria-hidden="true">·</span>
                <a
                  href={X_PROFILE.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center font-mono text-[#F2F2F2] underline decoration-[#2A2A2A] underline-offset-4 transition-colors hover:text-[#FF6B63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63]"
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
                <ExternalLink className="h-3.5 w-3.5 text-[#A3A3A3]" />
              </a>
            </Button>
            <Button asChild variant="subtle" size="compact">
              <a
                href={X_PROFILE.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Send className="h-3.5 w-3.5 text-[#FF6B63]" />
                Telegram
              </a>
            </Button>
          </div>
        </div>

        {/* Bio & Clean Actions */}
        <div className="mt-6 grid grid-cols-1 gap-6 border-t-[1.5px] border-[#2A2A2A] pt-6 lg:grid-cols-12 lg:items-center">
          <div className="space-y-2 lg:col-span-7">
            <p className="font-display text-xl font-bold leading-snug text-white">
              {X_PROFILE.tagline}
            </p>
            <p className="max-w-2xl text-base leading-relaxed text-[#A3A3A3]">
              Permanent home for every checklist, research brief, and
              interactive protocol breakdown shared on{' '}
              <span className="font-mono text-[#FF6B63]">
                {X_PROFILE.handle}
              </span>
              . Verify claims straight away before you ape, build, or repost.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
            <Button variant="secondary" onClick={onJumpToFilter}>
              Open 3-Step Filter
              <ArrowRight className="h-4 w-4 text-[#FF6B63]" />
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
