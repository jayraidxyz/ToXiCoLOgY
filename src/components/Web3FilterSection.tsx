import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Globe,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  FEATURED_THREAD_TWEET,
  WEB3_FILTER_STEPS,
  X_PROFILE,
} from '../data/archive';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';

type StepStatus = 'unreviewed' | 'pass' | 'flag';

export function Web3FilterSection() {
  const [projectName, setProjectName] = useState('');
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({
    '01': 'unreviewed',
    '02': 'unreviewed',
    '03': 'unreviewed',
  });
  const [notes, setNotes] = useState<Record<string, string>>({
    '01': '',
    '02': '',
    '03': '',
  });
  const [copiedTweet, setCopiedTweet] = useState(false);
  const [groundingLoading, setGroundingLoading] = useState(false);
  const [groundingError, setGroundingError] = useState<string | null>(null);
  const [groundingResult, setGroundingResult] = useState<{
    target: string;
    summary: string;
    sources: { title: string; uri: string }[];
  } | null>(null);

  const handleRunGroundedCheck = async () => {
    const target = projectName.trim() || 'Solana 1.0';
    setGroundingLoading(true);
    setGroundingError(null);
    try {
      const response = await fetch('/api/research-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const data = (await response.json()) as {
        summary?: string;
        sources?: { title: string; uri: string }[];
        error?: string;
      };
      if (!response.ok || data.error) {
        if (
          response.status === 429 ||
          /429|resource_exhausted|rate\s*limit|quota/i.test(data.error || '')
        ) {
          throw new Error('Rate limit reached, try again in a minute');
        }
        throw new Error(data.error || 'Failed to run Search Grounding check.');
      }
      setGroundingResult({
        target,
        summary: data.summary || '',
        sources: Array.isArray(data.sources) ? data.sources : [],
      });
    } catch (err: unknown) {
      let msg =
        err instanceof Error ? err.message : 'Unable to complete grounded check.';
      if (/429|resource_exhausted|rate\s*limit|quota/i.test(msg)) {
        msg = 'Rate limit reached, try again in a minute';
      }
      setGroundingError(msg);
    } finally {
      setGroundingLoading(false);
    }
  };

  const summary = useMemo(() => {
    const vals = Object.values(statuses);
    const passes = vals.filter((v) => v === 'pass').length;
    const flags = vals.filter((v) => v === 'flag').length;
    if (flags > 0) {
      return {
        label: `${flags} Red Flag${flags > 1 ? 's' : ''} Detected`,
        tone: 'text-[var(--accent-text)]',
        detail: 'Pause before allocating capital or amplifying this narrative.',
      };
    }
    if (passes === 3) {
      return {
        label: '3/3 Checks Passed',
        tone: 'text-[var(--text)]',
        detail: 'Incentives, stress resilience, and real usage verified.',
      };
    }
    return {
      label: `${passes}/3 Reviewed`,
      tone: 'text-[var(--text)]',
      detail: 'Score each step below to generate a shareable due-diligence brief.',
    };
  }, [statuses]);

  const currentUrl =
    typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';

  const shareText = projectName.trim()
    ? `Ran ${projectName.trim()} through the @toxicologyavp 3-Step Web3 Filter (${summary.label}).\n\nCheck incentives, stress failure modes, and real usage before aping:`
    : FEATURED_THREAD_TWEET;

  const xIntentHref = `https://x.com/intent/tweet?text=${encodeURIComponent(
    shareText
  )}&url=${encodeURIComponent(currentUrl)}`;

  const handleCopyTweet = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${currentUrl}`);
      setCopiedTweet(true);
      setTimeout(() => setCopiedTweet(false), 2200);
    } catch {
      setCopiedTweet(false);
    }
  };

  const handleDownloadBrief = () => {
    const subject = projectName.trim() || 'Untitled Web3 Project';
    const mdLines = [
      `# THE 3-STEP WEB3 FILTER — ${subject}`,
      `Source: Toxicology Archive (${X_PROFILE.handle}) · ${X_PROFILE.telegramLabel}`,
      `Verdict: ${summary.label}`,
      '',
      ...WEB3_FILTER_STEPS.map((step) => {
        const st = statuses[step.number].toUpperCase();
        const note = notes[step.number]?.trim() || 'No notes recorded.';
        return [
          `## ${step.number}. ${step.question}`,
          `- Status: ${st}`,
          `- Guidance: ${step.guidance}`,
          `- Reviewer Note: ${note}`,
          '',
        ].join('\n');
      }),
    ].join('\n');

    const blob = new Blob([mdLines], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `web3-filter-${subject.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setProjectName('');
    setStatuses({ '01': 'unreviewed', '02': 'unreviewed', '03': 'unreviewed' });
    setNotes({ '01': '', '02': '', '03': '' });
    setGroundingResult(null);
    setGroundingError(null);
  };

  return (
    <Card id="three-step-filter" className="scroll-mt-28 p-4 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)]">
            FEATURED THREAD CHECKLIST ·{' '}
            <span className="font-mono text-[var(--accent-text)]">
              {X_PROFILE.handle}
            </span>
          </p>
          <h2 className="heading-section mt-1.5 font-display font-bold tracking-tight text-[var(--text)]">
            The 3-Step Web3 Filter
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            Most Web3 news tries to sound complicated so you don&apos;t notice
            nothing happened. Run any token or protocol through these three
            checks before you ape or share.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={handleCopyTweet}>
            {copiedTweet ? (
              <>
                <Check className="h-4 w-4 text-[var(--accent-text)]" />
                Copied Thread
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Tweet + Link
              </>
            )}
          </Button>

          <Button asChild variant="primary">
            <a href={xIntentHref} target="_blank" rel="noopener noreferrer">
              Share on X
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* Interactive Project Target + Verdict Strip */}
      <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 sm:gap-4 lg:grid-cols-12 lg:items-center">
        <div className="min-w-0 lg:col-span-5">
          <label
            htmlFor="filter-project-input"
            className="block text-xs font-semibold tracking-widest uppercase text-[var(--muted)]"
          >
            Project or Token ID
          </label>
          <Input
            id="filter-project-input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Protocol X, $TOKEN, 0x..."
            className="mt-2 font-mono"
          />
        </div>

        <div className="min-w-0 flex flex-col justify-center lg:col-span-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)]">
            Verification Status
          </span>
          <span
            className={`mt-1 font-display text-lg font-bold ${summary.tone}`}
          >
            {summary.label}
          </span>
          <span className="text-sm text-[var(--muted)]">{summary.detail}</span>
        </div>

        <div className="flex flex-wrap gap-2 lg:col-span-3 lg:justify-end">
          <Button
            variant="secondary"
            size="compact"
            onClick={handleRunGroundedCheck}
            disabled={groundingLoading}
          >
            <Sparkles className="h-4 w-4 text-[var(--accent-text)]" />
            {groundingLoading ? 'Checking...' : 'Web Verify'}
          </Button>
          <Button variant="subtle" size="compact" onClick={handleDownloadBrief}>
            <Download className="h-4 w-4 text-[var(--accent-text)]" />
            Save Brief (.md)
          </Button>
          <Button
            variant="subtle"
            size="compact"
            onClick={handleReset}
            aria-label="Reset filter checklist"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Live Google Search Grounding Findings */}
      {(groundingError || groundingResult) && (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
          {groundingError ? (
            <p className="text-xs font-semibold text-[var(--accent-text)]" role="alert">
              {groundingError}
            </p>
          ) : (
            groundingResult && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-text)]">
                    <Globe className="h-4 w-4" />
                    <span>Live Search Grounding: {groundingResult.target}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGroundingResult(null)}
                    className="cursor-pointer text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)]"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--text)] sm:text-sm">
                  {groundingResult.summary}
                </div>
                {groundingResult.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-2.5">
                    {groundingResult.sources.map((src) => (
                      <a
                        key={src.uri}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--text)] hover:border-[var(--accent)]"
                      >
                        <span className="max-w-[200px] truncate">{src.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-[var(--accent-text)]" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* 3-Step Checklist Grid: grid-cols-1 on mobile for long content, lg:grid-cols-3 on desktop */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        {WEB3_FILTER_STEPS.map((step) => {
          const currentStatus = statuses[step.number];
          const isActive = currentStatus !== 'unreviewed';

          return (
            <div
              key={step.number}
              className={`flex min-w-0 flex-col justify-between rounded-xl border p-4 transition-all duration-200 sm:p-5 ${
                currentStatus === 'flag'
                  ? 'border-[var(--accent)] bg-[var(--surface-2)] shadow-[0_0_20px_var(--accent-glow)]'
                  : isActive
                  ? 'border-[var(--text)]/40 bg-[var(--surface-2)]'
                  : 'border-[var(--border)] bg-[var(--surface-2)]'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 font-display text-xs font-bold tabular-nums text-[var(--accent-text)]">
                    Step {step.number}
                  </span>
                  <ShieldAlert
                    className="h-4 w-4 shrink-0 text-[var(--muted)]"
                    aria-hidden="true"
                  />
                </div>

                <h3 className="mt-3 font-display text-base font-bold leading-snug text-[var(--text)] sm:text-lg">
                  {step.question}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                  {step.guidance}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setStatuses((prev) => ({
                        ...prev,
                        [step.number]:
                          prev[step.number] === 'pass' ? 'unreviewed' : 'pass',
                      }))
                    }
                    aria-pressed={currentStatus === 'pass'}
                    className={`inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] ${
                      currentStatus === 'pass'
                        ? 'border-[var(--text)] bg-[var(--text)] text-[var(--bg)]'
                        : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text)] hover:border-[var(--text)]/60'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setStatuses((prev) => ({
                        ...prev,
                        [step.number]:
                          prev[step.number] === 'flag' ? 'unreviewed' : 'flag',
                      }))
                    }
                    aria-pressed={currentStatus === 'flag'}
                    className={`inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] ${
                      currentStatus === 'flag'
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                        : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text)] hover:border-[var(--accent)]'
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Flag
                  </button>
                </div>

                <div className="mt-4 space-y-1.5 border-t border-[var(--border)] pt-3 text-xs leading-relaxed">
                  <p className="text-[var(--muted)]">
                    <span className="font-semibold text-[var(--text)]">
                      Pass:{' '}
                    </span>
                    {step.passSignal}
                  </p>
                  <p className="text-[var(--muted)]">
                    <span className="font-semibold text-[var(--accent-text)]">
                      Flag:{' '}
                    </span>
                    {step.redFlag}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <Input
                  value={notes[step.number]}
                  onChange={(e) =>
                    setNotes((prev) => ({
                      ...prev,
                      [step.number]: e.target.value,
                    }))
                  }
                  placeholder="Add verification note..."
                  aria-label={`Verification note for step ${step.number}`}
                  className="bg-[var(--bg)]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
